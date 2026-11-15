import {
  API_BASE_URL,
  ApiError,
  buildApiUrl,
  detectBackendMode,
  isEnvelopedBackend,
  requestJson,
  resetBackendProbe,
  toApiError,
} from './apiClient.ts';
import { standaloneApi } from './standaloneApi.ts';
import {
  adaptAgriculture,
  adaptBeforeAfter,
  adaptChat,
  adaptChatSources,
  adaptCompare,
  adaptDashboard,
  adaptDataset,
  adaptExplain,
  adaptIndicators,
  adaptLayer,
  adaptMeta,
  adaptProfiles,
  adaptRegion,
  adaptRegionSummary,
  adaptSession,
  adaptTimeseries,
  pickClosestDate,
  chartFromSeries,
  chartFromSnapshots,
  regionValuesFromDashboard,
  statusStepLabel,
  toBackendIndicator,
} from './backendAdapters.ts';
import type {
  BackendAgriculture,
  BackendBeforeAfter,
  BackendChat,
  BackendChatStreamEvent,
  BackendCompare,
  BackendDashboard,
  BackendDataset,
  BackendExplain,
  BackendIndicator,
  BackendLayer,
  BackendMeta,
  BackendProfile,
  BackendRegion,
  BackendRegionSummary,
  BackendSession,
  BackendSessionPreferences,
  BackendTimeseries,
  AgricultureModeResponse,
  BeforeAfterLayersResponse,
  ChatChartEvent,
  ChatResponse,
  ChatSourceRef,
  DashboardResponse,
  DatasetInfo,
  DatasetsResponse,
  ExperienceMode,
  ExplainResponse,
  HealthResponse,
  IndicatorId,
  IndicatorsResponse,
  LanguageCode,
  LocateResponse,
  MapLayerResponse,
  MetaResponse,
  ProfileId,
  ProfilesResponse,
  RegionCompareResponse,
  RegionId,
  RegionInfo,
  RegionsGeoJsonResponse,
  RegionsResponse,
  RegionSummaryResponse,
  SessionResponse,
  TimeseriesResponse,
} from '../types/apiContract.ts';

async function isStandalone(): Promise<boolean> {
  const mode = await detectBackendMode();
  return mode === 'standalone';
}

/*
 * Real backend (enveloped responses, contract in insomnia_agbea_climat.json) vs
 * local server.ts mock (front contract shape): `isEnvelopedBackend()` selects the
 * request format and the adapters in backendAdapters.ts.
 */

const ONBOARDING_KEY_PREFIX = 'agbea_onboarding_done_';

function readOnboardingFlag(sessionId: string): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY_PREFIX + sessionId) === '1';
  } catch {
    return false;
  }
}

function writeOnboardingFlag(sessionId: string, done: boolean): void {
  try {
    if (done) localStorage.setItem(ONBOARDING_KEY_PREFIX + sessionId, '1');
    else localStorage.removeItem(ONBOARDING_KEY_PREFIX + sessionId);
  } catch {
    // Storage unavailable: onboarding falls back to "profile chosen"
  }
}

async function getBackendSession(sessionId: string): Promise<SessionResponse> {
  const raw = await requestJson<BackendSession>(`/sessions/${encodeURIComponent(sessionId)}`);
  return adaptSession(raw, readOnboardingFlag(raw.session_id));
}

/** Cached M13 layer lists per mode (static catalog with available dates). */
const layersCache = new Map<ExperienceMode, Promise<BackendLayer[]>>();

/** M01 GET /health */
export async function getHealth(forceRefresh = false): Promise<HealthResponse> {
  if (forceRefresh) resetBackendProbe();
  const mode = await detectBackendMode();
  if (mode === 'standalone') {
    return standaloneApi.getHealth();
  }
  if (mode === 'offline') {
    resetBackendProbe();
    throw new ApiError('Service temporarily unavailable', 503, 'service_unavailable');
  }
  return requestJson<HealthResponse>('/health');
}

/** M02 GET /meta */
export async function getMeta(): Promise<MetaResponse> {
  if (await isStandalone()) return standaloneApi.getMeta();
  if (await isEnvelopedBackend()) return adaptMeta(await requestJson<BackendMeta>('/meta'));
  return requestJson<MetaResponse>('/meta');
}

/** M27 GET /profiles */
export async function getProfiles(): Promise<ProfilesResponse> {
  if (await isStandalone()) return standaloneApi.getProfiles();
  if (await isEnvelopedBackend()) {
    return { profiles: adaptProfiles(await requestJson<BackendProfile[]>('/profiles')) };
  }
  return requestJson<ProfilesResponse>('/profiles');
}

/** M03 POST /sessions */
export async function createSession(): Promise<SessionResponse> {
  if (await isStandalone()) return standaloneApi.createSession();
  if (await isEnvelopedBackend()) {
    const raw = await requestJson<BackendSession>('/sessions', { method: 'POST' });
    return adaptSession(raw, false);
  }
  return requestJson<SessionResponse>('/sessions', { method: 'POST' });
}

/** M04 GET /sessions/{id} */
export async function getSession(sessionId: string): Promise<SessionResponse> {
  if (await isStandalone()) return standaloneApi.getSession(sessionId);
  if (await isEnvelopedBackend()) return getBackendSession(sessionId);
  return requestJson<SessionResponse>(`/sessions/${encodeURIComponent(sessionId)}`);
}

/** M05 PATCH /sessions/{id}/preferences */
export async function patchSessionPreferences(
  sessionId: string,
  prefs: Partial<{
    profile: ProfileId;
    region_id: RegionId;
    language: LanguageCode;
    mode: ExperienceMode;
    onboarding_completed: boolean;
  }>
): Promise<SessionResponse> {
  if (await isStandalone()) {
    return standaloneApi.patchSessionPreferences(sessionId, prefs);
  }
  if (await isEnvelopedBackend()) {
    // Backend body: {profile?, region_id?, lang?, mode?} (partial). Response = preferences only.
    if (typeof prefs.onboarding_completed === 'boolean') {
      writeOnboardingFlag(sessionId, prefs.onboarding_completed);
    }
    const body: Partial<BackendSessionPreferences> = {};
    if (prefs.profile !== undefined) body.profile = prefs.profile;
    if (prefs.region_id !== undefined) body.region_id = prefs.region_id;
    if (prefs.language !== undefined) body.lang = prefs.language;
    if (prefs.mode !== undefined) body.mode = prefs.mode;
    if (Object.keys(body).length > 0) {
      await requestJson<BackendSessionPreferences>(
        `/sessions/${encodeURIComponent(sessionId)}/preferences`,
        { method: 'PATCH', body: JSON.stringify(body) }
      );
    }
    return getBackendSession(sessionId);
  }
  return requestJson<SessionResponse>(
    `/sessions/${encodeURIComponent(sessionId)}/preferences`,
    {
      method: 'PATCH',
      body: JSON.stringify(prefs),
    }
  );
}

/** M06 GET /regions */
export async function getRegions(): Promise<RegionsResponse> {
  if (await isStandalone()) return standaloneApi.getRegions();
  if (await isEnvelopedBackend()) {
    return { regions: (await requestJson<BackendRegion[]>('/regions')).map(adaptRegion) };
  }
  return requestJson<RegionsResponse>('/regions');
}

/** M07 GET /regions/geojson */
export async function getRegionsGeoJson(): Promise<RegionsGeoJsonResponse> {
  if (await isStandalone()) return standaloneApi.getRegionsGeoJson();
  return requestJson<RegionsGeoJsonResponse>('/regions/geojson');
}

/** M08 GET /regions/{id} */
export async function getRegion(regionId: RegionId): Promise<RegionInfo> {
  if (await isStandalone()) return standaloneApi.getRegion(regionId);
  if (await isEnvelopedBackend()) {
    return adaptRegion(
      await requestJson<BackendRegion>(`/regions/${encodeURIComponent(regionId)}`)
    );
  }
  return requestJson<RegionInfo>(`/regions/${encodeURIComponent(regionId)}`);
}

/** M09 GET /locate?lon&lat */
export async function locateRegion(lon: number, lat: number): Promise<LocateResponse> {
  if (await isStandalone()) return standaloneApi.locateRegion(lon, lat);
  if (await isEnvelopedBackend()) {
    // Backend returns the region object (404 outside_togo when out of bounds)
    const r = await requestJson<BackendRegion>('/locate', { query: { lon, lat } });
    return { region_id: r.id, name: r.name, capital: r.capital };
  }
  return requestJson<LocateResponse>('/locate', { query: { lon, lat } });
}

/** M10 GET /indicators */
export async function getIndicators(): Promise<IndicatorsResponse> {
  if (await isStandalone()) return standaloneApi.getIndicators();
  if (await isEnvelopedBackend()) {
    return { indicators: adaptIndicators(await requestJson<BackendIndicator[]>('/indicators')) };
  }
  return requestJson<IndicatorsResponse>('/indicators');
}

/** M11 GET /datasets */
export async function getDatasets(): Promise<DatasetsResponse> {
  if (await isStandalone()) return standaloneApi.getDatasets();
  if (await isEnvelopedBackend()) {
    return { datasets: (await requestJson<BackendDataset[]>('/datasets')).map(adaptDataset) };
  }
  return requestJson<DatasetsResponse>('/datasets');
}

/** M12 GET /datasets/{id} */
export async function getDataset(datasetId: string): Promise<DatasetInfo> {
  if (await isStandalone()) return standaloneApi.getDataset(datasetId);
  if (await isEnvelopedBackend()) {
    return adaptDataset(
      await requestJson<BackendDataset>(`/datasets/${encodeURIComponent(datasetId)}`)
    );
  }
  return requestJson<DatasetInfo>(`/datasets/${encodeURIComponent(datasetId)}`);
}

/** M13 GET /layers?mode= */
export async function getLayer(params: {
  indicator: IndicatorId;
  mode: ExperienceMode;
  date?: string;
}): Promise<MapLayerResponse> {
  if (await isStandalone()) return standaloneApi.getLayer(params);
  if (await isEnvelopedBackend()) {
    // Backend: GET /layers?mode= returns all layers; tiles use {date} from available_dates.
    let layersPromise = layersCache.get(params.mode);
    if (!layersPromise) {
      layersPromise = requestJson<BackendLayer[]>('/layers', { query: { mode: params.mode } });
      layersCache.set(params.mode, layersPromise);
      layersPromise.catch(() => layersCache.delete(params.mode));
    }
    const layers = await layersPromise;
    // Region choropleth values come from M19 /dashboard?date=YYYY-MM (best effort).
    let regionValues = {} as MapLayerResponse['region_values'];
    if (params.indicator !== 'elevation') {
      try {
        const dash = await requestJson<BackendDashboard>('/dashboard', {
          query: { date: params.date ? params.date.slice(0, 7) : undefined },
        });
        regionValues = regionValuesFromDashboard(dash, params.indicator);
      } catch {
        // Month not available: tiles still render without region values
      }
    }
    return adaptLayer(layers, params.indicator, params.mode, params.date, regionValues);
  }
  return requestJson<MapLayerResponse>('/layers', {
    query: {
      indicator: params.indicator,
      mode: params.mode,
      date: params.date,
    },
  });
}

/** M14 GET /regions/{id}/summary */
export async function getRegionSummary(
  regionId: RegionId,
  profile?: ProfileId | null
): Promise<RegionSummaryResponse> {
  if (await isStandalone()) return standaloneApi.getRegionSummary(regionId, profile);
  if (await isEnvelopedBackend()) {
    // Backend query: ?date=YYYY-MM (optional, defaults to latest month); no profile param.
    return adaptRegionSummary(
      await requestJson<BackendRegionSummary>(`/regions/${encodeURIComponent(regionId)}/summary`)
    );
  }
  return requestJson<RegionSummaryResponse>(
    `/regions/${encodeURIComponent(regionId)}/summary`,
    { query: { profile: profile || undefined } }
  );
}

/** M15 GET /regions/{id}/timeseries */
export async function getRegionTimeseries(
  regionId: RegionId,
  indicatorId: IndicatorId,
  months = 12
): Promise<TimeseriesResponse> {
  if (await isStandalone()) {
    return standaloneApi.getRegionTimeseries(regionId, indicatorId, months);
  }
  if (await isEnvelopedBackend()) {
    // Backend query: indicator, start, end (YYYY-MM), granularity. Without start/end
    // it returns the recent monthly series up to the latest month; keep the last `months`.
    const raw = await requestJson<BackendTimeseries>(
      `/regions/${encodeURIComponent(regionId)}/timeseries`,
      { query: { indicator: toBackendIndicator(indicatorId) } }
    );
    return adaptTimeseries(raw, months);
  }
  return requestJson<TimeseriesResponse>(
    `/regions/${encodeURIComponent(regionId)}/timeseries`,
    { query: { indicator: indicatorId, months } }
  );
}

/** M16 GET /regions/{id}/compare */
export async function getRegionCompare(params: {
  regionId: RegionId;
  indicator: IndicatorId;
  startA: number;
  endA: number;
  startB: number;
  endB: number;
}): Promise<RegionCompareResponse> {
  if (await isStandalone()) return standaloneApi.getRegionCompare(params);
  if (await isEnvelopedBackend()) {
    return adaptCompare(
      await requestJson<BackendCompare>(
        `/regions/${encodeURIComponent(params.regionId)}/compare`,
        {
          query: {
            indicator: toBackendIndicator(params.indicator),
            a_start: params.startA,
            a_end: params.endA,
            b_start: params.startB,
            b_end: params.endB,
          },
        }
      )
    );
  }
  return requestJson<RegionCompareResponse>(
    `/regions/${encodeURIComponent(params.regionId)}/compare`,
    {
      query: {
        indicator: params.indicator,
        start_a: params.startA,
        end_a: params.endA,
        start_b: params.startB,
        end_b: params.endB,
      },
    }
  );
}

/** M17 GET /regions/{id}/timeseries/export */
export function getTimeseriesExportUrl(
  regionId: RegionId,
  indicatorId: IndicatorId,
  months = 24
): string {
  return buildApiUrl(`/regions/${encodeURIComponent(regionId)}/timeseries/export`, {
    indicator: indicatorId,
    months,
  });
}

export async function downloadTimeseriesCsv(
  regionId: RegionId,
  indicatorId: IndicatorId,
  months = 24
): Promise<void> {
  const filename = `agbea-${regionId}-${indicatorId}.csv`;
  if (await isStandalone()) {
    const csv = await standaloneApi.buildTimeseriesCsv(regionId, indicatorId, months);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return;
  }

  let exportUrl = getTimeseriesExportUrl(regionId, indicatorId, months);
  if (await isEnvelopedBackend()) {
    // Backend query: indicator, start, end (YYYY-MM), format=csv|json (raw file, no envelope).
    // Resolve the window from the series so `end` matches the latest available month.
    const ts = await getRegionTimeseries(regionId, indicatorId, months);
    const first = ts.series[0]?.date;
    const last = ts.series[ts.series.length - 1]?.date;
    exportUrl = buildApiUrl(`/regions/${encodeURIComponent(regionId)}/timeseries/export`, {
      indicator: toBackendIndicator(indicatorId),
      start: first,
      end: last,
      format: 'csv',
    });
  }
  const a = document.createElement('a');
  a.href = exportUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** M18 GET /layers/{id}/before-after */
export async function getBeforeAfterLayers(params: {
  indicator: IndicatorId;
  regionId: RegionId;
  dateA: string;
  dateB: string;
}): Promise<BeforeAfterLayersResponse> {
  if (await isStandalone()) return standaloneApi.getBeforeAfterLayers(params);
  if (await isEnvelopedBackend()) {
    // The backend only accepts dates that exist for the layer (GET /layers → available_dates; e.g. IMERG
    // tiles cover the last 90 days, LST stops in 2022). Snap both dates to the closest available image.
    const layerId = toBackendIndicator(params.indicator);
    let before = params.dateA;
    let after = params.dateB;
    try {
      let layersPromise = layersCache.get('public');
      if (!layersPromise) {
        layersPromise = requestJson<BackendLayer[]>('/layers', { query: { mode: 'public' } });
        layersCache.set('public', layersPromise);
        layersPromise.catch(() => layersCache.delete('public'));
      }
      const dates = (await layersPromise).find((l) => l.id === layerId)?.available_dates || [];
      if (dates.length) {
        before = pickClosestDate(dates, params.dateA) || before;
        after = pickClosestDate(dates, params.dateB) || after;
        if (before >= after) {
          // Both dates outside the layer range: compare its first and last images instead
          before = dates[0];
          after = dates[dates.length - 1];
        }
      }
    } catch {
      // Layer list unavailable: send the requested dates as they are
    }
    const raw = await requestJson<BackendBeforeAfter>(
      `/layers/${encodeURIComponent(layerId)}/before-after`,
      { query: { before, after, region_id: params.regionId } }
    );
    return adaptBeforeAfter(raw, params.indicator, params.regionId);
  }
  return requestJson<BeforeAfterLayersResponse>(
    `/layers/${encodeURIComponent(params.indicator)}/before-after`,
    {
      query: {
        region_id: params.regionId,
        date_a: params.dateA,
        date_b: params.dateB,
      },
    }
  );
}

/** M19 GET /dashboard */
export async function getDashboard(profile?: ProfileId | null): Promise<DashboardResponse> {
  if (await isStandalone()) return standaloneApi.getDashboard(profile);
  if (await isEnvelopedBackend()) {
    // Backend query: ?date=YYYY-MM (optional); no profile param.
    return adaptDashboard(await requestJson<BackendDashboard>('/dashboard'), profile || null);
  }
  return requestJson<DashboardResponse>('/dashboard', {
    query: { profile: profile || undefined },
  });
}

/** M20 GET /regions/{id}/agriculture */
export async function getRegionAgriculture(
  regionId: RegionId
): Promise<AgricultureModeResponse> {
  if (await isStandalone()) return standaloneApi.getRegionAgriculture(regionId);
  if (await isEnvelopedBackend()) {
    return adaptAgriculture(
      await requestJson<BackendAgriculture>(`/regions/${encodeURIComponent(regionId)}/agriculture`)
    );
  }
  return requestJson<AgricultureModeResponse>(
    `/regions/${encodeURIComponent(regionId)}/agriculture`
  );
}

/** M21 POST /voice/transcribe (Expected 501 while in development for non-farmer M21 test) */
export async function transcribeVoice(): Promise<{ message: string }> {
  if (await isStandalone()) return standaloneApi.transcribeVoice();
  return requestJson<{ message: string }>('/voice/transcribe', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

/** Farmer Voice Assistant: Transcribe recorded speech (FR / EN) */
export async function transcribeVoiceAudio(payload: {
  audioBase64: string;
  mimeType: string;
  language: LanguageCode;
}): Promise<{ text: string }> {
  if (await isStandalone()) {
    throw new ApiError('Server transcription unavailable in standalone mode.', 501);
  }
  return requestJson<{ text: string }>('/voice/transcribe', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Farmer Voice Assistant: Synthesize spoken WAV reply via Gemini TTS when backend is active */
export async function synthesizeSpeech(payload: {
  text: string;
  language: LanguageCode;
}): Promise<{ audioBase64: string; mimeType: string } | null> {
  if (await isStandalone()) return null;
  // Real backend has no /voice/speak endpoint: browser speech synthesis is used instead.
  if (await isEnvelopedBackend()) return null;
  try {
    return await requestJson<{ audioBase64: string; mimeType: string }>('/voice/speak', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch {
    return null;
  }
}

/** M24 POST /explain */
export async function explainIndicator(payload: {
  region_id: RegionId;
  indicator_id: IndicatorId;
  profile: ProfileId | null;
  language: LanguageCode;
  mode?: ExperienceMode;
}): Promise<ExplainResponse> {
  if (await isStandalone()) return standaloneApi.explainIndicator(payload);
  if (await isEnvelopedBackend()) {
    // Backend body: {region_id, indicator, date?, mode, lang, profile}
    const raw = await requestJson<BackendExplain>('/explain', {
      method: 'POST',
      body: JSON.stringify({
        region_id: payload.region_id,
        indicator: toBackendIndicator(payload.indicator_id),
        mode: payload.mode || 'public',
        lang: payload.language,
        profile: payload.profile || undefined,
      }),
    });
    return adaptExplain(raw, payload.region_id, payload.indicator_id, payload.profile);
  }
  return requestJson<ExplainResponse>('/explain', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

type ChatPayload = {
  session_id?: string | null;
  thread_id?: string | null;
  message: string;
  region_id: RegionId;
  profile: ProfileId | null;
  language: LanguageCode;
  mode: ExperienceMode;
};

/** Session is attached via the X-Session-Id header (M26), not the body. */
function chatHeaders(sessionId?: string | null): Record<string, string> {
  return sessionId ? { 'X-Session-Id': sessionId } : {};
}

/** Backend body: {message, thread_id?} (+ context fields: region_id, profile, lang, mode). */
function backendChatBody(payload: ChatPayload) {
  return {
    message: payload.message,
    thread_id: payload.thread_id || undefined,
    region_id: payload.region_id,
    profile: payload.profile || undefined,
    lang: payload.language,
    mode: payload.mode,
  };
}

/** M26 POST /chat (fallback non-streaming) */
export async function sendChatFallback(payload: {
  session_id?: string | null;
  thread_id?: string | null;
  message: string;
  region_id: RegionId;
  profile: ProfileId | null;
  language: LanguageCode;
  mode: ExperienceMode;
}): Promise<ChatResponse> {
  if (await isStandalone()) return standaloneApi.buildChatReply(payload);
  if (await isEnvelopedBackend()) {
    const raw = await requestJson<BackendChat>('/chat', {
      method: 'POST',
      headers: chatHeaders(payload.session_id),
      body: JSON.stringify(backendChatBody(payload)),
    });
    return adaptChat(raw);
  }
  return requestJson<ChatResponse>('/chat', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** M25 POST /chat/stream (SSE streaming: meta -> status -> token -> data? -> sources -> done) */
export async function streamChat(
  payload: {
    session_id?: string | null;
    thread_id?: string | null;
    message: string;
    region_id: RegionId;
    profile: ProfileId | null;
    language: LanguageCode;
    mode: ExperienceMode;
  },
  callbacks: {
    onMeta?: (meta: { thread_id: string }) => void;
    onStatus?: (status: string) => void;
    onToken?: (token: string) => void;
    onData?: (chart: ChatChartEvent) => void;
    onSources?: (sources: ChatSourceRef[]) => void;
    onDone?: () => void;
  },
  signal?: AbortSignal
): Promise<void> {
  if (await isStandalone()) {
    callbacks.onStatus?.(
      payload.language === 'fr' ? 'Récupération des données NASA…' : 'Fetching NASA data…'
    );
    const reply = await standaloneApi.buildChatReply(payload);
    callbacks.onMeta?.({ thread_id: reply.thread_id });
    callbacks.onStatus?.(payload.language === 'fr' ? 'Rédaction…' : 'Writing…');
    const words = reply.answer.split(' ');
    for (let i = 0; i < words.length; i++) {
      if (signal?.aborted) break;
      callbacks.onToken?.((i === 0 ? '' : ' ') + words[i]);
      await new Promise((r) => setTimeout(r, 12));
    }
    if (reply.chart) callbacks.onData?.(reply.chart);
    callbacks.onSources?.(reply.sources);
    callbacks.onDone?.();
    return;
  }

  const enveloped = await isEnvelopedBackend();
  const response = await fetch(`${API_BASE_URL}/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(enveloped ? chatHeaders(payload.session_id) : {}),
    },
    body: JSON.stringify(enveloped ? backendChatBody(payload) : payload),
    signal,
  });

  if (!response.ok || !response.body) {
    if ((response.headers.get('content-type') || '').includes('application/json')) {
      throw toApiError(await response.json().catch(() => ({})), response.status);
    }
    throw new Error(`Stream failed (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() || '';

    for (const rawBlock of chunks) {
      let eventName = 'message';
      let dataLine = '';
      for (const line of rawBlock.split('\n')) {
        if (line.startsWith('event:')) {
          eventName = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          dataLine += line.slice(5).trim();
        }
      }
      if (!dataLine) continue;
      const parsed = JSON.parse(dataLine);

      // Real backend: no `event:` field, the event name is in `type`
      // (meta → status → token → data? → sources → done).
      if (enveloped || (eventName === 'message' && typeof parsed?.type === 'string')) {
        const ev = parsed as BackendChatStreamEvent;
        if (ev.type === 'meta') callbacks.onMeta?.({ thread_id: ev.thread_id });
        else if (ev.type === 'status') callbacks.onStatus?.(statusStepLabel(ev.step, payload.language));
        else if (ev.type === 'token') callbacks.onToken?.(ev.content || '');
        else if (ev.type === 'data') {
          const chart = chartFromSeries(ev.series) || chartFromSnapshots(ev.snapshot ? [ev.snapshot] : null);
          if (chart) callbacks.onData?.(chart);
        } else if (ev.type === 'sources') callbacks.onSources?.(adaptChatSources(ev.sources || []));
        else if (ev.type === 'done') callbacks.onDone?.();
        else if (ev.type === 'error') throw new ApiError(ev.message || 'Stream error', 500, ev.code);
        continue;
      }

      if (eventName === 'meta') callbacks.onMeta?.(parsed);
      else if (eventName === 'status') callbacks.onStatus?.(parsed.status || parsed);
      else if (eventName === 'token') callbacks.onToken?.(parsed.token || '');
      else if (eventName === 'data') callbacks.onData?.(parsed);
      else if (eventName === 'sources') callbacks.onSources?.(parsed.sources || []);
      else if (eventName === 'done') callbacks.onDone?.();
    }
  }
}
