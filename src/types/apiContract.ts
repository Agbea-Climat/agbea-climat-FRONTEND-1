/**
 * AGBÉA CLIMAT — API Contract v0.4 Types (Base: /api/v1)
 * Maps directly to Missions M01–M27 for clean frontend ↔ backend integration.
 */

export type LanguageCode = 'fr' | 'en';
export type ExperienceMode = 'public' | 'scientific';
export type ProfileId = 'farmer' | 'community' | 'researcher' | 'decision_maker';
export type RegionId = 'maritime' | 'plateaux' | 'centrale' | 'kara' | 'savanes';
export type IndicatorId = 'rainfall' | 'greenness' | 'lst' | 'elevation';
export type TrendDirection = 'above_normal' | 'normal' | 'below_normal';
export type SentenceNature = 'observed' | 'interpreted' | 'predicted';

/** M01 GET /health */
export interface HealthResponse {
  status: 'ok' | string;
}

/** M02 GET /meta */
export interface MetaResponse {
  data_updated_at: string; // e.g. "31/10/2026"
  features: {
    voice: 'in_development' | 'available' | 'planned';
    ewe: 'planned' | 'available' | 'in_development';
  };
}

/** M27 GET /profiles */
export interface UserProfile {
  id: ProfileId;
  title_en: string;
  title_fr: string;
  description_en: string;
  description_fr: string;
  default_mode: ExperienceMode;
  landing_screen: string;
  featured_indicators: IndicatorId[];
  ai_tone_en: string;
  ai_tone_fr: string;
}

export interface ProfilesResponse {
  profiles: UserProfile[];
}

/** M03 POST /sessions, M04 GET /sessions/{id}, M05 PATCH /sessions/{id}/preferences */
export interface ConversationSummary {
  thread_id: string;
  title: string;
  region_id: RegionId;
  updated_at: string;
  last_message: string;
}

export interface SessionPreferences {
  profile: ProfileId | null;
  region_id: RegionId;
  language: LanguageCode;
  mode: ExperienceMode;
}

export interface SessionResponse {
  session_id: string;
  preferences: SessionPreferences;
  onboarding_completed: boolean;
  conversations: ConversationSummary[];
}

/** M06 GET /regions & M08 GET /regions/{id} */
export interface RegionInfo {
  id: RegionId;
  name: string;
  capital: string;
  centroid: [number, number]; // [lon, lat]
  climate_zone_en: string;
  climate_zone_fr: string;
  crops_en: string[];
  crops_fr: string[];
  bbox?: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat] (real backend)
  area_km2?: number; // real backend
}

export interface RegionsResponse {
  regions: RegionInfo[];
}

/** M07 GET /regions/geojson */
export interface RegionGeoJsonFeature {
  type: 'Feature';
  properties: {
    id: RegionId;
    name: string;
    capital: string;
  };
  geometry:
    | {
        type: 'Polygon';
        coordinates: [number, number][][]; // [lon, lat]
      }
    | {
        type: 'MultiPolygon'; // real backend boundaries
        coordinates: [number, number][][][];
      };
}

export interface RegionsGeoJsonResponse {
  type: 'FeatureCollection';
  features: RegionGeoJsonFeature[];
}

/** M09 GET /locate?lon&lat */
export interface LocateResponse {
  region_id: RegionId;
  name: string;
  capital: string;
}

/** M10 GET /indicators */
export interface IndicatorInfo {
  id: IndicatorId;
  name_en: string;
  name_fr: string;
  unit: string;
  dataset_id: string;
  has_timeseries: boolean;
  tooltip_public_en: string;
  tooltip_public_fr: string;
  tooltip_scientific_en: string;
  tooltip_scientific_fr: string;
}

export interface IndicatorsResponse {
  indicators: IndicatorInfo[];
}

/** M11 GET /datasets & M12 GET /datasets/{id} */
export interface DatasetInfo {
  id: string;
  name: string;
  variable: string;
  resolution: string;
  units: string;
  period: string;
  limitations_en: string;
  limitations_fr: string;
  url: string;
}

export interface DatasetsResponse {
  datasets: DatasetInfo[];
}

/** M13 GET /layers?mode= */
export interface LayerLegendStop {
  color: string;
  label_en: string;
  label_fr: string;
}

export interface MapLayerResponse {
  indicator_id: IndicatorId;
  mode: ExperienceMode;
  date: string;
  tile_url_template: string;
  max_native_zoom: number;
  legend_title_en: string;
  legend_title_fr: string;
  legend_min_label_en: string;
  legend_max_label_en: string;
  legend_min_label_fr: string;
  legend_max_label_fr: string;
  stops: LayerLegendStop[];
  region_values: Record<RegionId, number | null>;
}

/** M14 GET /regions/{id}/summary */
export interface IndicatorSummaryCard {
  indicator_id: IndicatorId;
  dataset_id: string;
  label_en: string;
  label_fr: string;
  period_label_en: string;
  period_label_fr: string;
  value: number | null;
  unit: string;
  anomaly_pct: number | null;
  trend: TrendDirection;
  trend_text_en: string;
  trend_text_fr: string;
  plain_sentence_en: string;
  plain_sentence_fr: string;
  has_timeseries: boolean;
}

export interface RegionSummaryResponse {
  region: RegionInfo;
  reference_period: string;
  indicators: IndicatorSummaryCard[];
}

/** M15 GET /regions/{id}/timeseries */
export interface TimeseriesPoint {
  date: string; // YYYY-MM
  label_en: string;
  label_fr: string;
  value: number | null;
  normal: number | null;
}

export interface TimeseriesResponse {
  region_id: RegionId;
  indicator_id: IndicatorId;
  dataset_id: string;
  source_name: string;
  unit: string;
  series: TimeseriesPoint[];
}

/** M16 GET /regions/{id}/compare */
export interface ComparePeriodStats {
  label: string;
  start_year: number;
  end_year: number;
  value: number | null;
  unit: string;
}

export interface RegionCompareResponse {
  region_id: RegionId;
  indicator_id: IndicatorId;
  dataset_id: string;
  unit: string;
  period_a: ComparePeriodStats;
  period_b: ComparePeriodStats;
  delta_abs: number | null;
  delta_pct: number | null;
}

/** M18 GET /layers/{id}/before-after */
export interface BeforeAfterLayerSide {
  date: string;
  label_en: string;
  label_fr: string;
  tile_url_template: string;
  max_native_zoom: number;
  region_values: Record<RegionId, number | null>;
}

export interface BeforeAfterLayersResponse {
  indicator_id: IndicatorId;
  region_id: RegionId;
  left: BeforeAfterLayerSide;
  right: BeforeAfterLayerSide;
}

/** M19 GET /dashboard */
export interface DashboardHighlight {
  id: string;
  region_id: RegionId;
  indicator_id: IndicatorId;
  text_en: string;
  text_fr: string;
  source: string;
  dataset_id: string;
}

export interface DashboardRegionCard {
  region: RegionInfo;
  deviation_pct: number | null;
  trend: TrendDirection;
  metrics: {
    indicator_id: IndicatorId;
    label_en: string;
    label_fr: string;
    value: number | null;
    unit: string;
    trend: TrendDirection;
  }[];
}

export interface DashboardResponse {
  profile: ProfileId;
  reference_period: string;
  highlights: DashboardHighlight[];
  regions: DashboardRegionCard[];
}

/** M20 GET /regions/{id}/agriculture */
export interface AgricultureTip {
  id: string;
  text_en: string;
  text_fr: string;
}

export interface AgricultureModeResponse {
  region: RegionInfo;
  month_label_en: string;
  month_label_fr: string;
  season_status: 'rainy' | 'dry';
  season_label_en: string;
  season_label_fr: string;
  rainfall_trend: TrendDirection;
  rainfall_label_en: string;
  rainfall_label_fr: string;
  vegetation_trend: TrendDirection;
  vegetation_label_en: string;
  vegetation_label_fr: string;
  tips: AgricultureTip[];
  disclaimer_en: string;
  disclaimer_fr: string;
  source: string;
  dataset_id: string;
}

/** M24 POST /explain */
export interface ExplainSentence {
  text: string;
  nature: SentenceNature;
  source_id: string;
  source_name: string;
}

export interface ExplainResponse {
  region_id: RegionId;
  indicator_id: IndicatorId;
  profile: ProfileId;
  sentences: ExplainSentence[];
}

/** M25 POST /chat/stream & M26 POST /chat */
export interface ChatSourceRef {
  dataset_id: string;
  name: string;
}

export interface ChatChartEvent {
  title: string;
  unit: string;
  points: { label: string; value: number | null; normal: number | null }[];
}

export interface ChatResponse {
  thread_id: string;
  answer: string;
  sources: ChatSourceRef[];
  chart?: ChatChartEvent | null;
}

/* ------------------------------------------------------------------------- *
 * Real backend raw payloads (https://agbea.api.pepit.cloud/api/v1).
 * Every JSON response is wrapped as {status, message, response}; these types
 * describe `response`. They are mapped to the view-model types above by the
 * adapters in services/climateApi.ts (source of truth: insomnia_agbea_climat.json).
 * ------------------------------------------------------------------------- */

export type BackendIndicatorId = 'precipitation' | 'ndvi' | 'lst_day' | 'elevation';
export type BackendNature = 'observed' | 'interpreted' | 'predicted';

export interface BackendEnvelope<T> {
  status: 'success' | 'error' | string;
  message: string;
  response: T;
}

/** Error envelope payload: {code, details} */
export interface BackendErrorPayload {
  code: string;
  details: unknown;
}

/** M02 */
export interface BackendMeta {
  version: string;
  regions_count: number;
  data_last_updated: string; // YYYY-MM-DD
  features: { id: string; title: string; status: string }[];
}

/** M27 (array) */
export interface BackendProfile {
  id: ProfileId;
  title: string;
  audience: string;
  benefit: string;
  icon: string;
  default_mode: ExperienceMode;
  landing_screen: string;
  featured_indicators: BackendIndicatorId[];
  ai_tone: string;
}

/** M03 / M04 */
export interface BackendSessionPreferences {
  profile: ProfileId | null;
  region_id: RegionId | null;
  lang: LanguageCode | null;
  mode: ExperienceMode | null;
}

export interface BackendSession {
  session_id: string;
  preferences: BackendSessionPreferences;
  threads: { thread_id: string; title: string; updated_at: string }[];
  created_at: string;
  last_seen_at: string;
}

/** M06 (array), M08, M09 */
export interface BackendRegion {
  id: RegionId;
  name: string;
  capital: string;
  centroid: [number, number];
  bbox: [number, number, number, number];
  area_km2: number;
}

/** M10 (array) */
export interface BackendIndicator {
  id: BackendIndicatorId;
  label: string;
  units: string;
  dataset_id: string;
  description_public: string;
  description_scientific: string;
  has_timeseries: boolean;
  layer_id: string | null;
  status: string;
}

/** M11 (array), M12 */
export interface BackendDataset {
  id: string;
  name: string;
  provider: string;
  variable: string;
  indicator: BackendIndicatorId;
  units: string;
  spatial_resolution: string;
  temporal_resolution: string;
  coverage: string;
  period_start: string;
  period_end: string | null;
  limitations: string[];
  source_url: string;
  citation: string;
}

/** M13 (array) */
export interface BackendLayer {
  id: string;
  indicator: BackendIndicatorId;
  dataset_id: string;
  title: string;
  type: string;
  url_template: string; // contains {date}, {z}, {y}, {x}
  available_dates: string[];
  default_date: string;
  opacity: number;
  legend: { value: number; color: string; label: string | null }[];
  modes: ExperienceMode[];
  max_zoom: number;
}

/** Indicator snapshot (M14 indicators[], M19 regions[].indicators[], chat data) */
export interface BackendSnapshot {
  indicator: BackendIndicatorId;
  label: string;
  value: number | null;
  units: string;
  date: string;
  baseline: number | null;
  anomaly_pct: number | null;
  trend: TrendDirection;
  plain_summary: string;
  dataset_id: string;
  valid_frac: number | null;
  low_coverage: boolean;
}

/** M14 */
export interface BackendRegionSummary {
  region: BackendRegion;
  date: string;
  indicators: BackendSnapshot[];
}

/** M15 */
export interface BackendTimeseries {
  region_id: RegionId;
  indicator: BackendIndicatorId;
  units: string;
  granularity: 'month' | 'year';
  baseline_period: [string, string];
  points: {
    date: string;
    value: number | null;
    baseline: number | null;
    anomaly_pct: number | null;
    valid_frac: number | null;
    low_coverage: boolean;
  }[];
  dataset_id: string;
  nature: BackendNature;
}

/** M16 */
export interface BackendComparePeriod {
  label: string;
  start: string;
  end: string;
  mean: number | null;
  min: number | null;
  max: number | null;
}

export interface BackendCompare {
  region_id: RegionId;
  indicator: BackendIndicatorId;
  units: string;
  period_a: BackendComparePeriod;
  period_b: BackendComparePeriod;
  delta_abs: number | null;
  delta_pct: number | null;
  dataset_id: string;
}

/** M18 */
export interface BackendBeforeAfter {
  layer_id: string;
  before: { date: string; url_template: string };
  after: { date: string; url_template: string };
  comparison: BackendCompare | null;
}

/** Sourced statement (M19 highlights, M20, M24, M26) */
export interface BackendStatement {
  text: string;
  nature: BackendNature;
  source_ids: string[];
}

/** M19 */
export interface BackendDashboard {
  date: string;
  regions: BackendRegionSummary[];
  highlights: BackendStatement[];
}

/** M20 */
export interface BackendAgriculture {
  region_id: RegionId;
  date: string;
  season: 'rainy' | 'dry';
  rainfall_status: TrendDirection;
  vegetation_status: TrendDirection;
  statements: BackendStatement[];
  disclaimer: string;
}

/** M24 / M25 / M26 source reference */
export interface BackendSource {
  id: string; // "computed:…", "ds:…", "doc:…"
  kind: 'computed' | 'dataset' | 'document' | string;
  title: string;
  url: string | null;
  dataset_id: string | null;
  snippet: string | null;
  page: number | null;
}

/** M24 */
export interface BackendExplain {
  title: string;
  statements: BackendStatement[];
  sources: BackendSource[];
  disclaimer: string;
}

/** M26 */
export interface BackendChat {
  thread_id: string;
  answer: string;
  statements: BackendStatement[];
  sources: BackendSource[];
  data: { snapshots?: BackendSnapshot[]; series?: BackendTimeseries | null } | null;
}

/**
 * M25 SSE events: `data: {"type": …}` lines, no `event:` field, no envelope.
 * Order: meta → status (≥1) → token (≥1) → data? → sources → done.
 */
export type BackendChatStreamEvent =
  | { type: 'meta'; thread_id: string }
  | { type: 'status'; step: string }
  | { type: 'token'; content: string }
  | { type: 'data'; series: BackendTimeseries | null; snapshot: BackendSnapshot | null }
  | { type: 'sources'; sources: BackendSource[] }
  | { type: 'done'; statements?: BackendStatement[] }
  | { type: 'error'; message?: string; code?: string };
