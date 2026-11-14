import { API_BASE_URL, buildApiUrl, requestJson } from './apiClient.ts';
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

/** M01 GET /health */
export function getHealth(): Promise<HealthResponse> {
  return requestJson<HealthResponse>('/health');
}

/** M02 GET /meta */
export function getMeta(): Promise<MetaResponse> {
  return requestJson<MetaResponse>('/meta');
}

/** M27 GET /profiles */
export function getProfiles(): Promise<ProfilesResponse> {
  return requestJson<ProfilesResponse>('/profiles');
}

/** M03 POST /sessions */
export function createSession(): Promise<SessionResponse> {
  return requestJson<SessionResponse>('/sessions', { method: 'POST' });
}

/** M04 GET /sessions/{id} */
export function getSession(sessionId: string): Promise<SessionResponse> {
  return requestJson<SessionResponse>(`/sessions/${encodeURIComponent(sessionId)}`);
}

/** M05 PATCH /sessions/{id}/preferences */
export function patchSessionPreferences(
  sessionId: string,
  prefs: Partial<{
    profile: ProfileId;
    region_id: RegionId;
    language: LanguageCode;
    mode: ExperienceMode;
    onboarding_completed: boolean;
  }>
): Promise<SessionResponse> {
  return requestJson<SessionResponse>(
    `/sessions/${encodeURIComponent(sessionId)}/preferences`,
    {
      method: 'PATCH',
      body: JSON.stringify(prefs),
    }
  );
}

/** M06 GET /regions */
export function getRegions(): Promise<RegionsResponse> {
  return requestJson<RegionsResponse>('/regions');
}

/** M07 GET /regions/geojson */
export function getRegionsGeoJson(): Promise<RegionsGeoJsonResponse> {
  return requestJson<RegionsGeoJsonResponse>('/regions/geojson');
}

/** M08 GET /regions/{id} */
export function getRegion(regionId: RegionId): Promise<RegionInfo> {
  return requestJson<RegionInfo>(`/regions/${encodeURIComponent(regionId)}`);
}

/** M09 GET /locate?lon&lat */
export function locateRegion(lon: number, lat: number): Promise<LocateResponse> {
  return requestJson<LocateResponse>('/locate', { query: { lon, lat } });
}

/** M10 GET /indicators */
export function getIndicators(): Promise<IndicatorsResponse> {
  return requestJson<IndicatorsResponse>('/indicators');
}

/** M11 GET /datasets */
export function getDatasets(): Promise<DatasetsResponse> {
  return requestJson<DatasetsResponse>('/datasets');
}

/** M12 GET /datasets/{id} */
export function getDataset(datasetId: string): Promise<DatasetInfo> {
  return requestJson<DatasetInfo>(`/datasets/${encodeURIComponent(datasetId)}`);
}

/** M13 GET /layers?mode= */
export function getLayer(params: {
  indicator: IndicatorId;
  mode: ExperienceMode;
  date?: string;
}): Promise<MapLayerResponse> {
  return requestJson<MapLayerResponse>('/layers', {
    query: {
      indicator: params.indicator,
      mode: params.mode,
      date: params.date,
    },
  });
}

/** M14 GET /regions/{id}/summary */
export function getRegionSummary(
  regionId: RegionId,
  profile?: ProfileId | null
): Promise<RegionSummaryResponse> {
  return requestJson<RegionSummaryResponse>(
    `/regions/${encodeURIComponent(regionId)}/summary`,
    { query: { profile: profile || undefined } }
  );
}

/** M15 GET /regions/{id}/timeseries */
export function getRegionTimeseries(
  regionId: RegionId,
  indicatorId: IndicatorId,
  months = 12
): Promise<TimeseriesResponse> {
  return requestJson<TimeseriesResponse>(
    `/regions/${encodeURIComponent(regionId)}/timeseries`,
    { query: { indicator: indicatorId, months } }
  );
}

/** M16 GET /regions/{id}/compare */
export function getRegionCompare(params: {
  regionId: RegionId;
  indicator: IndicatorId;
  startA: number;
  endA: number;
  startB: number;
  endB: number;
}): Promise<RegionCompareResponse> {
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

/** M18 GET /layers/{id}/before-after */
export function getBeforeAfterLayers(params: {
  indicator: IndicatorId;
  regionId: RegionId;
  dateA: string;
  dateB: string;
}): Promise<BeforeAfterLayersResponse> {
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
export function getDashboard(profile?: ProfileId | null): Promise<DashboardResponse> {
  return requestJson<DashboardResponse>('/dashboard', {
    query: { profile: profile || undefined },
  });
}

/** M20 GET /regions/{id}/agriculture */
export function getRegionAgriculture(
  regionId: RegionId
): Promise<AgricultureModeResponse> {
  return requestJson<AgricultureModeResponse>(
    `/regions/${encodeURIComponent(regionId)}/agriculture`
  );
}

/** M21 POST /voice/transcribe (Expected 501 while in development) */
export function transcribeVoice(): Promise<{ message: string }> {
  return requestJson<{ message: string }>('/voice/transcribe', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

/** M24 POST /explain */
export function explainIndicator(payload: {
  region_id: RegionId;
  indicator_id: IndicatorId;
  profile: ProfileId | null;
  language: LanguageCode;
}): Promise<ExplainResponse> {
  return requestJson<ExplainResponse>('/explain', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** M26 POST /chat (fallback non-streaming) */
export function sendChatFallback(payload: {
  session_id?: string | null;
  thread_id?: string | null;
  message: string;
  region_id: RegionId;
  profile: ProfileId | null;
  language: LanguageCode;
  mode: ExperienceMode;
}): Promise<ChatResponse> {
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
