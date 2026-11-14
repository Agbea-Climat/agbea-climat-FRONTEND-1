import {
  API_BASE_URL,
  ApiError,
  buildApiUrl,
  detectBackendMode,
  requestJson,
  resetBackendProbe,
} from './apiClient.ts';
import { standaloneApi } from './standaloneApi.ts';
import type {
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
  return requestJson<MetaResponse>('/meta');
}

/** M27 GET /profiles */
export async function getProfiles(): Promise<ProfilesResponse> {
  if (await isStandalone()) return standaloneApi.getProfiles();
  return requestJson<ProfilesResponse>('/profiles');
}

/** M03 POST /sessions */
export async function createSession(): Promise<SessionResponse> {
  if (await isStandalone()) return standaloneApi.createSession();
  return requestJson<SessionResponse>('/sessions', { method: 'POST' });
}

/** M04 GET /sessions/{id} */
export async function getSession(sessionId: string): Promise<SessionResponse> {
  if (await isStandalone()) return standaloneApi.getSession(sessionId);
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
  return requestJson<RegionInfo>(`/regions/${encodeURIComponent(regionId)}`);
}

/** M09 GET /locate?lon&lat */
export async function locateRegion(lon: number, lat: number): Promise<LocateResponse> {
  if (await isStandalone()) return standaloneApi.locateRegion(lon, lat);
  return requestJson<LocateResponse>('/locate', { query: { lon, lat } });
}

/** M10 GET /indicators */
export async function getIndicators(): Promise<IndicatorsResponse> {
  if (await isStandalone()) return standaloneApi.getIndicators();
  return requestJson<IndicatorsResponse>('/indicators');
}

/** M11 GET /datasets */
export async function getDatasets(): Promise<DatasetsResponse> {
  if (await isStandalone()) return standaloneApi.getDatasets();
  return requestJson<DatasetsResponse>('/datasets');
}

/** M12 GET /datasets/{id} */
export async function getDataset(datasetId: string): Promise<DatasetInfo> {
  if (await isStandalone()) return standaloneApi.getDataset(datasetId);
  return requestJson<DatasetInfo>(`/datasets/${encodeURIComponent(datasetId)}`);
}

/** M13 GET /layers?mode= */
export async function getLayer(params: {
  indicator: IndicatorId;
  mode: ExperienceMode;
  date?: string;
}): Promise<MapLayerResponse> {
  if (await isStandalone()) return standaloneApi.getLayer(params);
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

  const exportUrl = getTimeseriesExportUrl(regionId, indicatorId, months);
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
  return requestJson<DashboardResponse>('/dashboard', {
    query: { profile: profile || undefined },
  });
}

/** M20 GET /regions/{id}/agriculture */
export async function getRegionAgriculture(
  regionId: RegionId
): Promise<AgricultureModeResponse> {
  if (await isStandalone()) return standaloneApi.getRegionAgriculture(regionId);
  return requestJson<AgricultureModeResponse>(
    `/regions/${encodeURIComponent(regionId)}/agriculture`
  );
}

/** M21 POST /voice/transcribe (Expected 501 while in development) */
export async function transcribeVoice(): Promise<{ message: string }> {
  if (await isStandalone()) return standaloneApi.transcribeVoice();
  return requestJson<{ message: string }>('/voice/transcribe', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

/** M24 POST /explain */
export async function explainIndicator(payload: {
  region_id: RegionId;
  indicator_id: IndicatorId;
  profile: ProfileId | null;
  language: LanguageCode;
}): Promise<ExplainResponse> {
  if (await isStandalone()) return standaloneApi.explainIndicator(payload);
  return requestJson<ExplainResponse>('/explain', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
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

  const response = await fetch(`${API_BASE_URL}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok || !response.body) {
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

      if (eventName === 'meta') callbacks.onMeta?.(parsed);
      else if (eventName === 'status') callbacks.onStatus?.(parsed.status || parsed);
      else if (eventName === 'token') callbacks.onToken?.(parsed.token || '');
      else if (eventName === 'data') callbacks.onData?.(parsed);
      else if (eventName === 'sources') callbacks.onSources?.(parsed.sources || []);
      else if (eventName === 'done') callbacks.onDone?.();
    }
  }
}
