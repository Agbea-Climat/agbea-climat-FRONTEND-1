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
  geometry: {
    type: 'Polygon';
    coordinates: [number, number][][]; // [lon, lat]
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
