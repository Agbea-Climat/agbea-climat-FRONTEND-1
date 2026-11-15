/**
 * Adapters: real AGBÉA backend payloads (see Backend* types in apiContract.ts)
 * → front view-model types consumed by pages/components.
 * The backend serves French text only; English fields fall back to the static
 * catalog (togoCatalog.ts) or to the French text when no translation exists.
 */
import {
  CLIMATE_INDICATORS,
  NASA_DATASETS,
  TOGO_REGIONS,
  USER_PROFILES,
  findRegionById,
  stripRegionRecord,
} from '../data/togoCatalog.ts';
import type {
  AgricultureModeResponse,
  BackendAgriculture,
  BackendBeforeAfter,
  BackendChat,
  BackendCompare,
  BackendDashboard,
  BackendDataset,
  BackendExplain,
  BackendIndicator,
  BackendIndicatorId,
  BackendLayer,
  BackendMeta,
  BackendProfile,
  BackendRegion,
  BackendRegionSummary,
  BackendSession,
  BackendSnapshot,
  BackendSource,
  BackendTimeseries,
  BeforeAfterLayerSide,
  BeforeAfterLayersResponse,
  ChatChartEvent,
  ChatResponse,
  ChatSourceRef,
  ComparePeriodStats,
  DashboardResponse,
  DatasetInfo,
  ExplainResponse,
  IndicatorId,
  IndicatorInfo,
  IndicatorSummaryCard,
  LanguageCode,
  MapLayerResponse,
  MetaResponse,
  ProfileId,
  RegionCompareResponse,
  RegionId,
  RegionInfo,
  RegionSummaryResponse,
  SessionResponse,
  TimeseriesResponse,
  TrendDirection,
  UserProfile,
  ExperienceMode,
} from '../types/apiContract.ts';

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

/* ----------------------------- Indicator ids ----------------------------- */

const TO_BACKEND: Record<IndicatorId, BackendIndicatorId> = {
  rainfall: 'precipitation',
  greenness: 'ndvi',
  lst: 'lst_day',
  elevation: 'elevation',
};

const TO_FRONT: Record<BackendIndicatorId, IndicatorId> = {
  precipitation: 'rainfall',
  ndvi: 'greenness',
  lst_day: 'lst',
  elevation: 'elevation',
};

export function toBackendIndicator(id: IndicatorId): BackendIndicatorId {
  return TO_BACKEND[id] || (id as unknown as BackendIndicatorId);
}

export function toFrontIndicator(id: string): IndicatorId {
  return TO_FRONT[id as BackendIndicatorId] || (id as IndicatorId);
}

function catalogIndicator(id: IndicatorId): IndicatorInfo | undefined {
  return CLIMATE_INDICATORS.find((i) => i.id === id);
}

/** Backend dataset id → display name (from the live /datasets catalog). */
const DATASET_NAMES: Record<string, string> = {
  gpm_imerg: 'NASA GPM IMERG Final Run V07',
  modis_ndvi: 'MODIS Terra MOD13A1 v061',
  modis_lst: 'MODIS Terra MOD11A2 v061',
  srtm: 'NASADEM (SRTM retraité) v001',
};

function datasetName(id: string): string {
  return DATASET_NAMES[id] || NASA_DATASETS.find((d) => d.id === id)?.name || id;
}

/** "ds:gpm_imerg" / "computed:kara:ndvi:2024-08" → dataset id when derivable. */
function datasetIdFromSourceId(sourceId: string): string | null {
  if (sourceId.startsWith('ds:')) return sourceId.slice(3);
  if (sourceId.startsWith('computed:')) {
    const ind = sourceId.split(':')[2];
    const front = ind ? TO_FRONT[ind as BackendIndicatorId] : undefined;
    return front ? catalogIndicator(front)?.dataset_id || null : null;
  }
  return null;
}

/* -------------------------------- Helpers -------------------------------- */

function monthLabel(date: string, lang: LanguageCode): string {
  const [y, m] = date.split('-');
  if (!m) return y || date;
  const idx = Number(m) - 1;
  const names = lang === 'fr' ? MONTHS_FR : MONTHS_EN;
  return `${names[idx] ?? m} ${y}`;
}

function trendText(trend: TrendDirection, lang: LanguageCode): string {
  if (trend === 'above_normal') return lang === 'fr' ? 'Au-dessus de la normale' : 'Above normal';
  if (trend === 'below_normal') return lang === 'fr' ? 'En dessous de la normale' : 'Below normal';
  return lang === 'fr' ? 'Proche de la normale' : 'Near normal';
}

function emptyRegionValues(): Record<RegionId, number | null> {
  return { maritime: null, plateaux: null, centrale: null, kara: null, savanes: null };
}

/* ------------------------------- Mappers --------------------------------- */

export function adaptMeta(raw: BackendMeta): MetaResponse {
  const status = (id: string) => {
    const s = raw.features.find((f) => f.id === id)?.status;
    if (s === 'planned' || s === 'in_development') return s;
    return s ? 'available' : 'planned';
  };
  const [y, m, d] = (raw.data_last_updated || '').split('-');
  return {
    data_updated_at: d ? `${d}/${m}/${y}` : raw.data_last_updated,
    features: {
      voice: status('voice'),
      ewe: status('ewe'),
    },
  };
}

export function adaptProfiles(raw: BackendProfile[]): UserProfile[] {
  return raw.map((p) => {
    const cat = USER_PROFILES.find((c) => c.id === p.id);
    return {
      id: p.id,
      title_fr: p.title,
      title_en: cat?.title_en || p.title,
      description_fr: p.benefit,
      description_en: cat?.description_en || p.benefit,
      default_mode: p.default_mode,
      // Keep front routes; backend landing_screen is a screen key ("agriculture", "dashboard"…)
      landing_screen: cat?.landing_screen || '/',
      featured_indicators: p.featured_indicators.map(toFrontIndicator),
      ai_tone_fr: p.ai_tone,
      ai_tone_en: cat?.ai_tone_en || p.ai_tone,
    };
  });
}

export function adaptRegion(raw: BackendRegion): RegionInfo {
  const cat = findRegionById(raw.id);
  const base: RegionInfo = cat
    ? stripRegionRecord(cat)
    : {
        id: raw.id,
        name: raw.name,
        capital: raw.capital,
        centroid: raw.centroid,
        climate_zone_en: '',
        climate_zone_fr: '',
        crops_en: [],
        crops_fr: [],
      };
  return {
    ...base,
    name: raw.name,
    capital: raw.capital,
    centroid: raw.centroid,
    bbox: raw.bbox,
    area_km2: raw.area_km2,
  };
}

export function adaptSession(
  raw: BackendSession,
  onboardingCompleted: boolean
): SessionResponse {
  const p = raw.preferences;
  const regionId: RegionId = p.region_id || 'kara';
  return {
    session_id: raw.session_id,
    preferences: {
      profile: p.profile,
      region_id: regionId,
      language: p.lang || 'fr',
      mode: p.mode || 'public',
    },
    // Backend has no onboarding flag: a chosen profile (or a local flag) means done.
    onboarding_completed: onboardingCompleted || p.profile !== null,
    conversations: (raw.threads || []).map((t) => ({
      thread_id: t.thread_id,
      title: t.title,
      region_id: regionId,
      updated_at: t.updated_at,
      last_message: '',
    })),
  };
}

export function adaptIndicators(raw: BackendIndicator[]): IndicatorInfo[] {
  return raw.map((i) => {
    const id = toFrontIndicator(i.id);
    const cat = catalogIndicator(id);
    return {
      id,
      name_fr: i.label,
      name_en: cat?.name_en || i.label,
      unit: i.units || cat?.unit || '',
      dataset_id: i.dataset_id,
      has_timeseries: i.has_timeseries,
      tooltip_public_fr: i.description_public,
      tooltip_public_en: cat?.tooltip_public_en || i.description_public,
      tooltip_scientific_fr: i.description_scientific,
      tooltip_scientific_en: cat?.tooltip_scientific_en || i.description_scientific,
    };
  });
}

export function adaptDataset(raw: BackendDataset): DatasetInfo {
  const cat = NASA_DATASETS.find((d) => d.id === raw.id);
  const limitationsFr = raw.limitations.join(' · ');
  return {
    id: raw.id,
    name: raw.name,
    variable: raw.variable,
    resolution: [raw.spatial_resolution, raw.temporal_resolution].filter(Boolean).join(' · '),
    units: raw.units || '—',
    period: `${raw.period_start} – ${raw.period_end || 'présent'}`,
    limitations_fr: limitationsFr,
    limitations_en: cat?.limitations_en || limitationsFr,
    url: raw.source_url,
  };
}

/**
 * M13: backend returns every layer for a mode; pick the indicator's layer and
 * the available date closest to the requested one.
 */
export function adaptLayer(
  layers: BackendLayer[],
  indicator: IndicatorId,
  mode: ExperienceMode,
  requestedDate: string | undefined,
  regionValues: Record<RegionId, number | null>
): MapLayerResponse {
  const cat = catalogIndicator(indicator);
  const layer = layers.find((l) => l.indicator === toBackendIndicator(indicator));

  if (!layer) {
    // Elevation has no tile layer on the backend: region choropleth only (static SRTM catalog).
    const values = emptyRegionValues();
    for (const r of TOGO_REGIONS) values[r.id] = r.elevationM;
    return {
      indicator_id: indicator,
      mode,
      date: requestedDate || '',
      tile_url_template: '',
      max_native_zoom: 9,
      legend_title_en: cat?.name_en || indicator,
      legend_title_fr: cat?.name_fr || indicator,
      legend_min_label_en: 'Low',
      legend_max_label_en: 'High',
      legend_min_label_fr: 'Bas',
      legend_max_label_fr: 'Haut',
      stops: [],
      region_values: values,
    };
  }

  const date = pickClosestDate(layer.available_dates, requestedDate) || layer.default_date;
  const stops = layer.legend.map((s) => {
    const label = s.label ?? String(s.value);
    return { color: s.color, label_en: label, label_fr: label };
  });
  const first = stops[0]?.label_fr || '';
  const last = stops[stops.length - 1]?.label_fr || '';
  return {
    indicator_id: indicator,
    mode,
    date,
    tile_url_template: layer.url_template.replace('{date}', date),
    max_native_zoom: layer.max_zoom,
    legend_title_fr: layer.title,
    legend_title_en: cat?.name_en || layer.title,
    legend_min_label_fr: first,
    legend_min_label_en: first,
    legend_max_label_fr: last,
    legend_max_label_en: last,
    stops,
    region_values: regionValues,
  };
}

function pickClosestDate(dates: string[], target?: string): string | null {
  if (!dates.length) return null;
  if (!target) return dates[dates.length - 1];
  const t = Date.parse(target);
  if (Number.isNaN(t)) return dates[dates.length - 1];
  let best = dates[0];
  let bestDiff = Infinity;
  for (const d of dates) {
    const diff = Math.abs(Date.parse(d) - t);
    if (diff < bestDiff) {
      best = d;
      bestDiff = diff;
    }
  }
  return best;
}

/** Region values of one indicator from a dashboard payload (for map choropleths). */
export function regionValuesFromDashboard(
  raw: BackendDashboard,
  indicator: IndicatorId
): Record<RegionId, number | null> {
  const values = emptyRegionValues();
  const backendId = toBackendIndicator(indicator);
  for (const r of raw.regions) {
    values[r.region.id] = r.indicators.find((s) => s.indicator === backendId)?.value ?? null;
  }
  return values;
}

function adaptSnapshot(s: BackendSnapshot): IndicatorSummaryCard {
  const id = toFrontIndicator(s.indicator);
  const cat = catalogIndicator(id);
  return {
    indicator_id: id,
    dataset_id: s.dataset_id,
    label_fr: s.label,
    label_en: cat?.name_en || s.label,
    period_label_fr: monthLabel(s.date, 'fr'),
    period_label_en: monthLabel(s.date, 'en'),
    value: s.value,
    unit: s.units,
    anomaly_pct: s.anomaly_pct,
    trend: s.trend,
    trend_text_fr: trendText(s.trend, 'fr'),
    trend_text_en: trendText(s.trend, 'en'),
    plain_sentence_fr: s.plain_summary,
    plain_sentence_en: s.plain_summary,
    has_timeseries: id !== 'elevation',
  };
}

export function adaptRegionSummary(raw: BackendRegionSummary): RegionSummaryResponse {
  return {
    region: adaptRegion(raw.region),
    reference_period: raw.date,
    indicators: raw.indicators.map(adaptSnapshot),
  };
}

export function adaptTimeseries(raw: BackendTimeseries, months?: number): TimeseriesResponse {
  const points = months ? raw.points.slice(-months) : raw.points;
  return {
    region_id: raw.region_id,
    indicator_id: toFrontIndicator(raw.indicator),
    dataset_id: raw.dataset_id,
    source_name: datasetName(raw.dataset_id),
    unit: raw.units,
    series: points.map((p) => ({
      date: p.date,
      label_fr: monthLabel(p.date, 'fr'),
      label_en: monthLabel(p.date, 'en'),
      value: p.value,
      normal: p.baseline,
    })),
  };
}

function adaptPeriod(p: BackendComparePeriod, unit: string): ComparePeriodStats {
  return {
    label: p.label,
    start_year: Number(p.start),
    end_year: Number(p.end),
    value: p.mean,
    unit,
  };
}

type BackendComparePeriod = BackendCompare['period_a'];

export function adaptCompare(raw: BackendCompare): RegionCompareResponse {
  return {
    region_id: raw.region_id,
    indicator_id: toFrontIndicator(raw.indicator),
    dataset_id: raw.dataset_id,
    unit: raw.units,
    period_a: adaptPeriod(raw.period_a, raw.units),
    period_b: adaptPeriod(raw.period_b, raw.units),
    delta_abs: raw.delta_abs,
    delta_pct: raw.delta_pct,
  };
}

/** Native GIBS zoom per backend layer (from live /layers max_zoom). */
const LAYER_MAX_ZOOM: Record<string, number> = { ndvi: 9, precipitation: 6, lst_day: 7 };

export function adaptBeforeAfter(
  raw: BackendBeforeAfter,
  indicator: IndicatorId,
  regionId: RegionId
): BeforeAfterLayersResponse {
  const side = (
    s: BackendBeforeAfter['before'],
    mean: number | null | undefined
  ): BeforeAfterLayerSide => {
    const values = emptyRegionValues();
    values[regionId] = mean ?? null;
    return {
      date: s.date,
      label_fr: s.date,
      label_en: s.date,
      tile_url_template: s.url_template,
      max_native_zoom: LAYER_MAX_ZOOM[raw.layer_id] ?? 9,
      region_values: values,
    };
  };
  return {
    indicator_id: indicator,
    region_id: regionId,
    left: side(raw.before, raw.comparison?.period_a.mean),
    right: side(raw.after, raw.comparison?.period_b.mean),
  };
}

export function adaptDashboard(raw: BackendDashboard, profile: ProfileId | null): DashboardResponse {
  return {
    profile: profile || 'community',
    reference_period: raw.date,
    highlights: raw.highlights.map((h, i) => {
      const region =
        TOGO_REGIONS.find((r) => h.text.startsWith(r.name)) ||
        TOGO_REGIONS.find((r) => h.text.includes(r.name));
      const datasetId = h.source_ids.map(datasetIdFromSourceId).find(Boolean) || '';
      const ind = CLIMATE_INDICATORS.find((c) => c.dataset_id === datasetId);
      return {
        id: `hl-${i}`,
        region_id: region?.id || 'kara',
        indicator_id: ind?.id || 'rainfall',
        text_fr: h.text,
        text_en: h.text,
        source: datasetName(datasetId),
        dataset_id: datasetId,
      };
    }),
    regions: raw.regions.map((r) => {
      const cards = r.indicators.map(adaptSnapshot);
      const lead = r.indicators[0];
      return {
        region: adaptRegion(r.region),
        deviation_pct: lead?.anomaly_pct ?? null,
        trend: lead?.trend || 'normal',
        metrics: cards.map((c) => ({
          indicator_id: c.indicator_id,
          label_fr: c.label_fr,
          label_en: c.label_en,
          value: c.value,
          unit: c.unit,
          trend: c.trend,
        })),
      };
    }),
  };
}

export function adaptAgriculture(raw: BackendAgriculture): AgricultureModeResponse {
  const cat = findRegionById(raw.region_id);
  const region: RegionInfo = cat
    ? stripRegionRecord(cat)
    : {
        id: raw.region_id,
        name: raw.region_id,
        capital: '',
        centroid: [0, 0],
        climate_zone_en: '',
        climate_zone_fr: '',
        crops_en: [],
        crops_fr: [],
      };
  const observedFor = (ds: string) =>
    raw.statements.find((s) => s.nature === 'observed' && s.source_ids.includes(`ds:${ds}`))?.text;
  const tips = raw.statements
    .filter((s) => s.nature !== 'observed')
    .map((s, i) => ({ id: `tip-${i}`, text_fr: s.text, text_en: s.text }));
  return {
    region,
    month_label_fr: monthLabel(raw.date, 'fr'),
    month_label_en: monthLabel(raw.date, 'en'),
    season_status: raw.season,
    season_label_fr: raw.season === 'rainy' ? 'Saison des pluies' : 'Saison sèche',
    season_label_en: raw.season === 'rainy' ? 'Rainy season' : 'Dry season',
    rainfall_trend: raw.rainfall_status,
    rainfall_label_fr: observedFor('gpm_imerg') || trendText(raw.rainfall_status, 'fr'),
    rainfall_label_en: trendText(raw.rainfall_status, 'en'),
    vegetation_trend: raw.vegetation_status,
    vegetation_label_fr: observedFor('modis_ndvi') || trendText(raw.vegetation_status, 'fr'),
    vegetation_label_en: trendText(raw.vegetation_status, 'en'),
    tips,
    disclaimer_fr: raw.disclaimer,
    disclaimer_en: raw.disclaimer,
    source: datasetName('gpm_imerg'),
    dataset_id: 'gpm_imerg',
  };
}

function sourceDatasetId(sources: BackendSource[], sourceIds: string[]): string | null {
  for (const id of sourceIds) {
    const src = sources.find((s) => s.id === id);
    if (src?.dataset_id) return src.dataset_id;
    const derived = datasetIdFromSourceId(id);
    if (derived) return derived;
  }
  return null;
}

export function adaptExplain(
  raw: BackendExplain,
  regionId: RegionId,
  indicator: IndicatorId,
  profile: ProfileId | null
): ExplainResponse {
  return {
    region_id: regionId,
    indicator_id: indicator,
    profile: profile || 'community',
    sentences: raw.statements.map((st) => {
      const src = raw.sources.find((s) => st.source_ids.includes(s.id));
      return {
        text: st.text,
        nature: st.nature,
        source_id: sourceDatasetId(raw.sources, st.source_ids) || src?.id || '',
        source_name: src?.title || '',
      };
    }),
  };
}

/** Dataset-backed sources only (clickable → dataset dialog), deduplicated. */
export function adaptChatSources(sources: BackendSource[]): ChatSourceRef[] {
  const out: ChatSourceRef[] = [];
  for (const s of sources) {
    if (!s.dataset_id || out.some((o) => o.dataset_id === s.dataset_id)) continue;
    const named = sources.find((x) => x.kind === 'dataset' && x.dataset_id === s.dataset_id);
    out.push({ dataset_id: s.dataset_id, name: (named || s).title });
  }
  return out;
}

export function chartFromSeries(series: BackendTimeseries | null | undefined): ChatChartEvent | null {
  if (!series || !series.points?.length) return null;
  const id = toFrontIndicator(series.indicator);
  return {
    title: catalogIndicator(id)?.name_fr || series.indicator,
    unit: series.units,
    points: series.points.map((p) => ({ label: p.date, value: p.value, normal: p.baseline })),
  };
}

export function chartFromSnapshots(snaps: BackendSnapshot[] | null | undefined): ChatChartEvent | null {
  if (!snaps || !snaps.length) return null;
  const units = snaps[0].units;
  const same = snaps.filter((s) => s.units === units);
  return {
    title: same.length === 1 ? same[0].label : 'Indicateurs',
    unit: units,
    points: same.map((s) => ({ label: `${s.label} (${s.date})`, value: s.value, normal: s.baseline })),
  };
}

export function adaptChat(raw: BackendChat): ChatResponse {
  return {
    thread_id: raw.thread_id,
    answer: raw.answer,
    sources: adaptChatSources(raw.sources || []),
    chart: chartFromSeries(raw.data?.series) || chartFromSnapshots(raw.data?.snapshots),
  };
}

/** M25 status steps → user-facing labels. */
export function statusStepLabel(step: string, lang: LanguageCode): string {
  const fr: Record<string, string> = {
    routing: 'Analyse de la question…',
    fetching_data: 'Récupération des données…',
    retrieving: 'Recherche des sources…',
    generating: 'Rédaction…',
  };
  const en: Record<string, string> = {
    routing: 'Understanding the question…',
    fetching_data: 'Fetching data…',
    retrieving: 'Searching sources…',
    generating: 'Writing…',
  };
  return (lang === 'fr' ? fr : en)[step] || step;
}
