import { ApiError } from './apiClient.ts';
import {
  CLIMATE_INDICATORS,
  NASA_DATASETS,
  TOGO_GEOJSON_FEATURES,
  TOGO_REGIONS,
  USER_PROFILES,
  findRegionById,
  pointInRegionPolygon,
  stripRegionRecord,
  type TogoRegionRecord,
} from '../data/togoCatalog.ts';
import type {
  AgricultureModeResponse,
  BeforeAfterLayersResponse,
  ChatChartEvent,
  ChatResponse,
  ChatSourceRef,
  ConversationSummary,
  DashboardHighlight,
  DashboardRegionCard,
  DashboardResponse,
  DatasetInfo,
  DatasetsResponse,
  ExperienceMode,
  ExplainResponse,
  ExplainSentence,
  HealthResponse,
  IndicatorId,
  IndicatorSummaryCard,
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
  SessionPreferences,
  SessionResponse,
  TimeseriesPoint,
  TimeseriesResponse,
  TrendDirection,
} from '../types/apiContract.ts';

interface NasaYearSeries {
  precipMm: (number | null)[];
  gwetRoot: (number | null)[];
  surfaceTempC: (number | null)[];
}

const MONTH_NAMES_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

const STORAGE_KEY = 'agbea_standalone_sessions_v1';
const CACHE_TTL_MS = 15 * 60 * 1000;
const nasaCache = new Map<string, { expiresAt: number; data: Record<number, NasaYearSeries> }>();

function loadSessionsMap(): Record<string, SessionResponse> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSessionsMap(map: Record<string, SessionResponse>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore quota errors
  }
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function cleanVal(v: number | undefined): number | null {
  if (v === undefined || v === null || Number.isNaN(v) || v <= -900) return null;
  return v;
}

async function fetchNasaPowerDirect(
  regionId: RegionId,
  startYear: number,
  endYear: number
): Promise<Record<number, NasaYearSeries>> {
  const region = findRegionById(regionId) ?? TOGO_REGIONS[1];
  const sYear = Math.max(2001, Math.min(2025, startYear));
  const eYear = Math.max(sYear, Math.min(2025, endYear));
  const key = `${region.id}:${sYear}:${eYear}`;
  const cached = nasaCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const [lon, lat] = region.centroid;
  const url = `https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=PRECTOTCORR,TS,GWETROOT&community=AG&longitude=${lon}&latitude=${lat}&start=${sYear}&end=${eYear}&format=JSON`;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12000);
  let json: any;
  try {
    const resp = await fetch(url, { signal: controller.signal });
    if (!resp.ok) throw new ApiError(`NASA POWER HTTP ${resp.status}`, resp.status);
    json = await resp.json();
  } finally {
    window.clearTimeout(timeout);
  }

  const p = json?.properties?.parameter || {};
  const result: Record<number, NasaYearSeries> = {};

  for (let y = sYear; y <= eYear; y++) {
    const precipMm: (number | null)[] = [];
    const gwetRoot: (number | null)[] = [];
    const surfaceTempC: (number | null)[] = [];

    for (let m = 1; m <= 12; m++) {
      const ym = `${y}${String(m).padStart(2, '0')}`;
      const pd = cleanVal(p.PRECTOTCORR?.[ym]);
      const gw = cleanVal(p.GWETROOT?.[ym]);
      const ts = cleanVal(p.TS?.[ym]);

      precipMm.push(pd !== null ? Number((pd * daysInMonth(y, m)).toFixed(1)) : null);
      gwetRoot.push(gw !== null ? Number(gw.toFixed(2)) : null);
      surfaceTempC.push(ts !== null ? Number(ts.toFixed(1)) : null);
    }

    result[y] = { precipMm, gwetRoot, surfaceTempC };
  }

  nasaCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, data: result });
  return result;
}

function classifyTrend(anomalyPct: number | null): TrendDirection {
  if (anomalyPct === null) return 'normal';
  if (anomalyPct > 10) return 'above_normal';
  if (anomalyPct < -10) return 'below_normal';
  return 'normal';
}

function computeRegionMetrics(
  region: TogoRegionRecord,
  nasaData: Record<number, NasaYearSeries>,
  monthIdx: number
) {
  const latestYear = 2025;
  const baselineYears = [2020, 2021, 2022, 2023, 2024];

  const getMeanForMonth = (key: keyof NasaYearSeries, mIdx: number) => {
    const vals = baselineYears
      .map((y) => nasaData[y]?.[key]?.[mIdx] ?? null)
      .filter((v): v is number => v !== null);
    if (vals.length === 0) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };

  const rainVal = nasaData[latestYear]?.precipMm?.[monthIdx] ?? null;
  const rainNorm = getMeanForMonth('precipMm', monthIdx);
  const rainAnom =
    rainVal !== null && rainNorm !== null && rainNorm > 0
      ? Number((((rainVal - rainNorm) / rainNorm) * 100).toFixed(1))
      : null;

  const greenVal = nasaData[latestYear]?.gwetRoot?.[monthIdx] ?? null;
  const greenNorm = getMeanForMonth('gwetRoot', monthIdx);
  const greenAnom =
    greenVal !== null && greenNorm !== null && greenNorm > 0
      ? Number((((greenVal - greenNorm) / greenNorm) * 100).toFixed(1))
      : null;

  const lstVal = nasaData[latestYear]?.surfaceTempC?.[monthIdx] ?? null;
  const lstNorm = getMeanForMonth('surfaceTempC', monthIdx);
  const lstAnom =
    lstVal !== null && lstNorm !== null && lstNorm > 0
      ? Number((((lstVal - lstNorm) / lstNorm) * 100).toFixed(1))
      : null;

  return {
    rainVal,
    rainNorm: rainNorm !== null ? Number(rainNorm.toFixed(1)) : null,
    rainAnom,
    rainTrend: classifyTrend(rainAnom),
    greenVal,
    greenNorm: greenNorm !== null ? Number(greenNorm.toFixed(2)) : null,
    greenAnom,
    greenTrend: classifyTrend(greenAnom),
    lstVal,
    lstNorm: lstNorm !== null ? Number(lstNorm.toFixed(1)) : null,
    lstAnom,
    lstTrend: classifyTrend(lstAnom),
    elevationM: region.elevationM,
  };
}

export const standaloneApi = {
  async getHealth(): Promise<HealthResponse> {
    return { status: 'ok' };
  },

  async getMeta(): Promise<MetaResponse> {
    return {
      data_updated_at: '31/10/2026',
      features: { voice: 'in_development', ewe: 'planned' },
    };
  },

  async getProfiles(): Promise<ProfilesResponse> {
    return { profiles: USER_PROFILES };
  },

  async createSession(): Promise<SessionResponse> {
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `sess-${Date.now()}`;
    const session: SessionResponse = {
      session_id: id,
      preferences: {
        profile: null,
        region_id: 'kara',
        language: 'fr',
        mode: 'public',
      },
      onboarding_completed: false,
      conversations: [],
    };
    const map = loadSessionsMap();
    map[id] = session;
    saveSessionsMap(map);
    return session;
  },

  async getSession(sessionId: string): Promise<SessionResponse> {
    const map = loadSessionsMap();
    const s = map[sessionId];
    if (!s) {
      throw new ApiError('Session not found', 404, 'session_not_found');
    }
    return s;
  },

  async patchSessionPreferences(
    sessionId: string,
    prefs: Partial<SessionPreferences & { onboarding_completed: boolean }>
  ): Promise<SessionResponse> {
    const map = loadSessionsMap();
    const s: SessionResponse = map[sessionId] || {
      session_id: sessionId,
      preferences: { profile: null, region_id: 'kara', language: 'fr', mode: 'public' },
      onboarding_completed: false,
      conversations: [],
    };
    if (prefs.profile !== undefined) s.preferences.profile = prefs.profile;
    if (prefs.region_id !== undefined) s.preferences.region_id = prefs.region_id;
    if (prefs.language !== undefined) s.preferences.language = prefs.language;
    if (prefs.mode !== undefined) s.preferences.mode = prefs.mode;
    if (typeof prefs.onboarding_completed === 'boolean') {
      s.onboarding_completed = prefs.onboarding_completed;
    }
    map[sessionId] = s;
    saveSessionsMap(map);
    return s;
  },

  async getRegions(): Promise<RegionsResponse> {
    return { regions: TOGO_REGIONS.map(stripRegionRecord) };
  },

  async getRegionsGeoJson(): Promise<RegionsGeoJsonResponse> {
    return { type: 'FeatureCollection', features: TOGO_GEOJSON_FEATURES };
  },

  async getRegion(regionId: RegionId): Promise<RegionInfo> {
    const r = findRegionById(regionId);
    if (!r) throw new ApiError('Region not found', 404, 'region_not_found');
    return stripRegionRecord(r);
  },

  async locateRegion(lon: number, lat: number): Promise<LocateResponse> {
    const matched = TOGO_REGIONS.find((r) => pointInRegionPolygon(lon, lat, r.polygon));
    if (!matched) {
      throw new ApiError('Area not covered', 404, 'area_not_covered');
    }
    return { region_id: matched.id, name: matched.name, capital: matched.capital };
  },

  async getIndicators(): Promise<IndicatorsResponse> {
    return { indicators: CLIMATE_INDICATORS };
  },

  async getDatasets(): Promise<DatasetsResponse> {
    return { datasets: NASA_DATASETS };
  },

  async getDataset(datasetId: string): Promise<DatasetInfo> {
    const ds = NASA_DATASETS.find((d) => d.id === datasetId);
    if (!ds) throw new ApiError('Dataset not found', 404, 'dataset_not_found');
    return ds;
  },

  async getLayer(params: {
    indicator: IndicatorId;
    mode: ExperienceMode;
    date?: string;
  }): Promise<MapLayerResponse> {
    const dateStr = params.date || '2025-09-15';
    const [yStr, mStr] = dateStr.split('-');
    const year = Math.max(2020, Math.min(2025, Number(yStr) || 2025));
    const monthIdx = Math.max(0, Math.min(11, (Number(mStr) || 9) - 1));

    const regionValues: Record<RegionId, number | null> = {
      maritime: null,
      plateaux: null,
      centrale: null,
      kara: null,
      savanes: null,
    };

    await Promise.all(
      TOGO_REGIONS.map(async (r) => {
        if (params.indicator === 'elevation') {
          regionValues[r.id] = r.elevationM;
          return;
        }
        const nasa = await fetchNasaPowerDirect(r.id, year, year);
        const yr = nasa[year];
        if (!yr) return;
        regionValues[r.id] =
          params.indicator === 'rainfall'
            ? yr.precipMm[monthIdx]
            : params.indicator === 'greenness'
            ? yr.gwetRoot[monthIdx]
            : yr.surfaceTempC[monthIdx];
      })
    );

    const gibsDate = `${year}-${String(monthIdx + 1).padStart(2, '0')}-15`;
    const configs = {
      rainfall: {
        tile: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/IMERG_Precipitation_Rate/default/${gibsDate}/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png`,
        zoom: 6,
        titleEn: params.mode === 'scientific' ? 'GPM IMERG Precipitation (mm/month)' : 'Rainfall intensity',
        titleFr: params.mode === 'scientific' ? 'Précipitations GPM IMERG (mm/mois)' : 'Quantité de pluie',
        minEn: 'Dry',
        maxEn: 'Heavy rain',
        minFr: 'Sec',
        maxFr: 'Pluies abondantes',
        stops: [
          { color: '#BAE6FD', label_en: '< 50 mm', label_fr: '< 50 mm' },
          { color: '#38BDF8', label_en: '50–120 mm', label_fr: '50–120 mm' },
          { color: '#0E7490', label_en: '120–220 mm', label_fr: '120–220 mm' },
          { color: '#0C4A6E', label_en: '> 220 mm', label_fr: '> 220 mm' },
        ],
      },
      greenness: {
        tile: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_NDVI_8Day/default/${gibsDate}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`,
        zoom: 9,
        titleEn: params.mode === 'scientific' ? 'MODIS NDVI / Soil Moisture (0–1)' : 'Vegetation greenness',
        titleFr: params.mode === 'scientific' ? 'MODIS NDVI / Humidité sol (0–1)' : 'Verdure de la végétation',
        minEn: 'Bare soil',
        maxEn: 'Very green',
        minFr: 'Sol nu',
        maxFr: 'Très vert',
        stops: [
          { color: '#E2E8D5', label_en: 'Bare soil (<0.4)', label_fr: 'Sol nu (<0,4)' },
          { color: '#86BA90', label_en: 'Moderate (0.4–0.6)', label_fr: 'Modéré (0,4–0,6)' },
          { color: '#2E7D4B', label_en: 'Green (0.6–0.75)', label_fr: 'Vert (0,6–0,75)' },
          { color: '#14532D', label_en: 'Very green (>0.75)', label_fr: 'Très vert (>0,75)' },
        ],
      },
      lst: {
        tile: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_Land_Surface_Temp_Day/default/${gibsDate}/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png`,
        zoom: 7,
        titleEn: params.mode === 'scientific' ? 'MODIS Land Surface Temp (°C)' : 'Surface warmth',
        titleFr: params.mode === 'scientific' ? 'Température de surface MODIS (°C)' : 'Chaleur du sol',
        minEn: 'Cooler',
        maxEn: 'Hot surface',
        minFr: 'Plus frais',
        maxFr: 'Sol très chaud',
        stops: [
          { color: '#FDBA74', label_en: '< 27 °C', label_fr: '< 27 °C' },
          { color: '#EA580C', label_en: '27–30 °C', label_fr: '27–30 °C' },
          { color: '#C2410C', label_en: '30–33 °C', label_fr: '30–33 °C' },
          { color: '#7C2D12', label_en: '> 33 °C', label_fr: '> 33 °C' },
        ],
      },
      elevation: {
        tile: '',
        zoom: 8,
        titleEn: 'SRTM Terrain Elevation (m)',
        titleFr: 'Altitude du relief SRTM (m)',
        minEn: 'Coastal plain',
        maxEn: 'Highlands',
        minFr: 'Plaine côtière',
        maxFr: 'Hauts plateaux',
        stops: [
          { color: '#E2E8F0', label_en: '< 100 m', label_fr: '< 100 m' },
          { color: '#94A3B8', label_en: '100–250 m', label_fr: '100–250 m' },
          { color: '#475569', label_en: '250–350 m', label_fr: '250–350 m' },
          { color: '#0F2942', label_en: '> 350 m', label_fr: '> 350 m' },
        ],
      },
    };

    const cfg = configs[params.indicator] ?? configs.greenness;
    return {
      indicator_id: params.indicator,
      mode: params.mode,
      date: gibsDate,
      tile_url_template: cfg.tile,
      max_native_zoom: cfg.zoom,
      legend_title_en: cfg.titleEn,
      legend_title_fr: cfg.titleFr,
      legend_min_label_en: cfg.minEn,
      legend_max_label_en: cfg.maxEn,
      legend_min_label_fr: cfg.minFr,
      legend_max_label_fr: cfg.maxFr,
      stops: cfg.stops,
      region_values: regionValues,
    };
  },

  async getRegionSummary(
    regionId: RegionId,
    profileId?: ProfileId | null
  ): Promise<RegionSummaryResponse> {
    const region = findRegionById(regionId);
    if (!region) throw new ApiError('Region not found', 404, 'region_not_found');

    const nasa = await fetchNasaPowerDirect(region.id, 2020, 2025);
    const m = computeRegionMetrics(region, nasa, 8);

    const trendText = (t: TrendDirection, anom: number | null, en: boolean) => {
      const abs = anom !== null ? `${Math.abs(anom).toFixed(0)}%` : '';
      if (t === 'above_normal') return en ? `▲ ${abs} above normal` : `▲ ${abs} au-dessus de la normale`;
      if (t === 'below_normal') return en ? `▼ ${abs} below normal` : `▼ ${abs} sous la normale`;
      return en
        ? `● normal (${anom !== null ? (anom >= 0 ? '+' : '') + anom.toFixed(0) + '%' : '0%'})`
        : `● normal (${anom !== null ? (anom >= 0 ? '+' : '') + anom.toFixed(0) + '%' : '0%'})`;
    };

    const allCards: IndicatorSummaryCard[] = [
      {
        indicator_id: 'rainfall',
        dataset_id: 'gpm_imerg',
        label_en: 'Rainfall this month',
        label_fr: 'Pluie ce mois-ci',
        period_label_en: 'September 2025',
        period_label_fr: 'Septembre 2025',
        value: m.rainVal,
        unit: 'mm',
        anomaly_pct: m.rainAnom,
        trend: m.rainTrend,
        trend_text_en: trendText(m.rainTrend, m.rainAnom, true),
        trend_text_fr: trendText(m.rainTrend, m.rainAnom, false),
        plain_sentence_en:
          m.rainTrend === 'below_normal'
            ? 'Rain was lower than the 2020–2024 average for this month.'
            : m.rainTrend === 'above_normal'
            ? 'Rain was higher than the 2020–2024 average for this month.'
            : 'Rain stayed close to the usual level for this month.',
        plain_sentence_fr:
          m.rainTrend === 'below_normal'
            ? 'La pluie a été plus faible que la moyenne 2020–2024 pour ce mois.'
            : m.rainTrend === 'above_normal'
            ? 'La pluie a été plus abondante que la moyenne 2020–2024.'
            : 'La pluie est restée proche du niveau habituel pour ce mois.',
        has_timeseries: true,
      },
      {
        indicator_id: 'greenness',
        dataset_id: 'modis_ndvi',
        label_en: 'Vegetation & soil moisture',
        label_fr: 'Végétation et humidité',
        period_label_en: 'September 2025',
        period_label_fr: 'Septembre 2025',
        value: m.greenVal,
        unit: 'index',
        anomaly_pct: m.greenAnom,
        trend: m.greenTrend,
        trend_text_en: trendText(m.greenTrend, m.greenAnom, true),
        trend_text_fr: trendText(m.greenTrend, m.greenAnom, false),
        plain_sentence_en:
          m.greenTrend === 'below_normal'
            ? 'Vegetation has less moisture than usual for this period.'
            : m.greenTrend === 'above_normal'
            ? 'Land shows greener and wetter conditions than usual.'
            : 'Vegetation moisture is within its normal seasonal range.',
        plain_sentence_fr:
          m.greenTrend === 'below_normal'
            ? 'La végétation dispose de moins d’humidité que d’habitude à cette période.'
            : m.greenTrend === 'above_normal'
            ? 'Le couvert végétal bénéficie d’une humidité supérieure à la normale.'
            : 'L’état d’humidité de la végétation est conforme à la normale saisonnière.',
        has_timeseries: true,
      },
      {
        indicator_id: 'lst',
        dataset_id: 'modis_lst',
        label_en: 'Land surface temperature',
        label_fr: 'Température de surface',
        period_label_en: 'September 2025',
        period_label_fr: 'Septembre 2025',
        value: m.lstVal,
        unit: '°C',
        anomaly_pct: m.lstAnom,
        trend: m.lstTrend,
        trend_text_en: trendText(m.lstTrend, m.lstAnom, true),
        trend_text_fr: trendText(m.lstTrend, m.lstAnom, false),
        plain_sentence_en:
          m.lstTrend === 'above_normal'
            ? 'Ground surface temperature is warmer than the 2020–2024 baseline.'
            : m.lstTrend === 'below_normal'
            ? 'Ground surface temperature is slightly cooler than the baseline.'
            : 'Ground surface temperature is near its typical seasonal average.',
        plain_sentence_fr:
          m.lstTrend === 'above_normal'
            ? 'La surface du sol est plus chaude que la moyenne 2020–2024.'
            : m.lstTrend === 'below_normal'
            ? 'La surface du sol est légèrement plus fraîche que la normale.'
            : 'La température du sol reste proche de la moyenne saisonnière.',
        has_timeseries: true,
      },
      {
        indicator_id: 'elevation',
        dataset_id: 'srtm_elevation',
        label_en: 'Mean elevation',
        label_fr: 'Altitude moyenne',
        period_label_en: 'Static reference',
        period_label_fr: 'Référence statique',
        value: region.elevationM,
        unit: 'm',
        anomaly_pct: null,
        trend: 'normal',
        trend_text_en: '● normal (static terrain)',
        trend_text_fr: '● normal (relief fixe)',
        plain_sentence_en: 'Terrain height above sea level remains constant.',
        plain_sentence_fr: 'L’altitude du terrain au-dessus du niveau de la mer est fixe.',
        has_timeseries: false,
      },
    ];

    const profile = USER_PROFILES.find((p) => p.id === profileId) ?? USER_PROFILES[1];
    const ordered = [
      ...profile.featured_indicators
        .map((id) => allCards.find((c) => c.indicator_id === id))
        .filter((c): c is IndicatorSummaryCard => Boolean(c)),
      ...allCards.filter((c) => !profile.featured_indicators.includes(c.indicator_id)),
    ];

    return {
      region: stripRegionRecord(region),
      reference_period: '2025-09',
      indicators: ordered,
    };
  },

  async getRegionTimeseries(
    regionId: RegionId,
    indicatorId: IndicatorId,
    months = 12
  ): Promise<TimeseriesResponse> {
    const region = findRegionById(regionId);
    if (!region) throw new ApiError('Region not found', 404, 'region_not_found');

    const count = Math.max(12, Math.min(24, months));
    const ind = CLIMATE_INDICATORS.find((i) => i.id === indicatorId) ?? CLIMATE_INDICATORS[0];
    const ds = NASA_DATASETS.find((d) => d.id === ind.dataset_id) ?? NASA_DATASETS[0];

    const nasa = await fetchNasaPowerDirect(region.id, 2020, 2025);
    const years = count > 12 ? [2024, 2025] : [2025];
    const series: TimeseriesPoint[] = [];

    for (const y of years) {
      for (let m = 0; m < 12; m++) {
        const val =
          indicatorId === 'rainfall'
            ? nasa[y]?.precipMm?.[m] ?? null
            : indicatorId === 'greenness'
            ? nasa[y]?.gwetRoot?.[m] ?? null
            : nasa[y]?.surfaceTempC?.[m] ?? null;

        const baseVals = [2020, 2021, 2022, 2023, 2024]
          .map((by) =>
            indicatorId === 'rainfall'
              ? nasa[by]?.precipMm?.[m] ?? null
              : indicatorId === 'greenness'
              ? nasa[by]?.gwetRoot?.[m] ?? null
              : nasa[by]?.surfaceTempC?.[m] ?? null
          )
          .filter((v): v is number => v !== null);

        const normal =
          baseVals.length > 0
            ? Number(
                (baseVals.reduce((a, b) => a + b, 0) / baseVals.length).toFixed(
                  indicatorId === 'greenness' ? 2 : 1
                )
              )
            : null;

        series.push({
          date: `${y}-${String(m + 1).padStart(2, '0')}`,
          label_en: `${MONTH_NAMES_EN[m]} ${y}`,
          label_fr: `${MONTH_NAMES_FR[m]} ${y}`,
          value: val,
          normal,
        });
      }
    }

    return {
      region_id: region.id,
      indicator_id: indicatorId,
      dataset_id: ds.id,
      source_name: ds.name,
      unit: ind.unit,
      series: series.slice(-count),
    };
  },

  async buildTimeseriesCsv(
    regionId: RegionId,
    indicatorId: IndicatorId,
    months = 24
  ): Promise<string> {
    const ts = await standaloneApi.getRegionTimeseries(regionId, indicatorId, months);
    const region = findRegionById(regionId) ?? TOGO_REGIONS[0];
    const ds = NASA_DATASETS.find((d) => d.id === ts.dataset_id) ?? NASA_DATASETS[0];
    const rows = ts.series.map(
      (pt) => `${pt.date},${pt.value ?? ''},${pt.normal ?? ''}`
    );
    return [
      `# source: ${ds.name} (${ds.resolution})`,
      `# units: ${ts.unit}`,
      `# region: ${region.name} (${region.capital}, Togo)`,
      'date,value,normal_2020_2024',
      ...rows,
    ].join('\n');
  },

  async getRegionCompare(params: {
    regionId: RegionId;
    indicator: IndicatorId;
    startA: number;
    endA: number;
    startB: number;
    endB: number;
  }): Promise<RegionCompareResponse> {
    const region = findRegionById(params.regionId);
    if (!region) throw new ApiError('Region not found', 404, 'region_not_found');

    const minYear = Math.min(params.startA, params.startB);
    const maxYear = Math.max(params.endA, params.endB);
    const nasa = await fetchNasaPowerDirect(region.id, minYear, maxYear);

    const computeRangeAvg = (sY: number, eY: number): number | null => {
      const yearValues: number[] = [];
      for (let y = sY; y <= eY; y++) {
        const row = nasa[y];
        if (!row) continue;
        if (params.indicator === 'rainfall') {
          const valid = row.precipMm.filter((v): v is number => v !== null);
          if (valid.length === 12) yearValues.push(valid.reduce((a, b) => a + b, 0));
        } else {
          const arr = params.indicator === 'greenness' ? row.gwetRoot : row.surfaceTempC;
          const valid = arr.filter((v): v is number => v !== null);
          if (valid.length > 0) yearValues.push(valid.reduce((a, b) => a + b, 0) / valid.length);
        }
      }
      if (yearValues.length === 0) return null;
      return Number(
        (yearValues.reduce((a, b) => a + b, 0) / yearValues.length).toFixed(
          params.indicator === 'greenness' ? 2 : 1
        )
      );
    };

    const valA = computeRangeAvg(params.startA, params.endA);
    const valB = computeRangeAvg(params.startB, params.endB);
    const deltaAbs =
      valA !== null && valB !== null
        ? Number((valB - valA).toFixed(params.indicator === 'greenness' ? 2 : 1))
        : null;
    const deltaPct =
      deltaAbs !== null && valA !== null && valA !== 0
        ? Number((((valB! - valA) / valA) * 100).toFixed(1))
        : null;

    const unit =
      params.indicator === 'rainfall' ? 'mm/yr' : params.indicator === 'greenness' ? 'index' : '°C';
    const ind = CLIMATE_INDICATORS.find((i) => i.id === params.indicator) ?? CLIMATE_INDICATORS[0];

    return {
      region_id: region.id,
      indicator_id: params.indicator,
      dataset_id: ind.dataset_id,
      unit,
      period_a: {
        label: params.startA === params.endA ? `${params.startA}` : `${params.startA}–${params.endA}`,
        start_year: params.startA,
        end_year: params.endA,
        value: valA,
        unit,
      },
      period_b: {
        label: params.startB === params.endB ? `${params.startB}` : `${params.startB}–${params.endB}`,
        start_year: params.startB,
        end_year: params.endB,
        value: valB,
        unit,
      },
      delta_abs: deltaAbs,
      delta_pct: deltaPct,
    };
  },

  async getBeforeAfterLayers(params: {
    indicator: IndicatorId;
    regionId: RegionId;
    dateA: string;
    dateB: string;
  }): Promise<BeforeAfterLayersResponse> {
    const parseYM = (d: string) => {
      const [ys, ms] = d.split('-');
      return {
        year: Math.max(2005, Math.min(2025, Number(ys) || 2020)),
        monthIdx: Math.max(0, Math.min(11, (Number(ms) || 9) - 1)),
      };
    };
    const a = parseYM(params.dateA);
    const b = parseYM(params.dateB);

    const loadSide = async (y: number, mIdx: number) => {
      const map: Record<RegionId, number | null> = {
        maritime: null,
        plateaux: null,
        centrale: null,
        kara: null,
        savanes: null,
      };
      await Promise.all(
        TOGO_REGIONS.map(async (r) => {
          const nasa = await fetchNasaPowerDirect(r.id, y, y);
          const row = nasa[y];
          if (!row) return;
          map[r.id] =
            params.indicator === 'rainfall'
              ? row.precipMm[mIdx]
              : params.indicator === 'greenness'
              ? row.gwetRoot[mIdx]
              : row.surfaceTempC[mIdx];
        })
      );
      return map;
    };

    const [valuesA, valuesB] = await Promise.all([
      loadSide(a.year, a.monthIdx),
      loadSide(b.year, b.monthIdx),
    ]);

    const tileFor = (y: number, mIdx: number) => {
      const gibsDate = `${y}-${String(mIdx + 1).padStart(2, '0')}-15`;
      if (params.indicator === 'rainfall') {
        return {
          url: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/IMERG_Precipitation_Rate/default/${gibsDate}/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png`,
          zoom: 6,
        };
      }
      if (params.indicator === 'lst') {
        return {
          url: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_Land_Surface_Temp_Day/default/${gibsDate}/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png`,
          zoom: 7,
        };
      }
      return {
        url: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_NDVI_8Day/default/${gibsDate}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`,
        zoom: 9,
      };
    };

    const tA = tileFor(a.year, a.monthIdx);
    const tB = tileFor(b.year, b.monthIdx);

    return {
      indicator_id: params.indicator,
      region_id: params.regionId,
      left: {
        date: params.dateA,
        label_en: `${MONTH_NAMES_EN[a.monthIdx]} ${a.year}`,
        label_fr: `${MONTH_NAMES_FR[a.monthIdx]} ${a.year}`,
        tile_url_template: tA.url,
        max_native_zoom: tA.zoom,
        region_values: valuesA,
      },
      right: {
        date: params.dateB,
        label_en: `${MONTH_NAMES_EN[b.monthIdx]} ${b.year}`,
        label_fr: `${MONTH_NAMES_FR[b.monthIdx]} ${b.year}`,
        tile_url_template: tB.url,
        max_native_zoom: tB.zoom,
        region_values: valuesB,
      },
    };
  },

  async getDashboard(profileId?: ProfileId | null): Promise<DashboardResponse> {
    const profile = USER_PROFILES.find((p) => p.id === profileId) ?? USER_PROFILES[1];
    const featured = profile.featured_indicators.slice(0, 2);
    const summaries = await Promise.all(
      TOGO_REGIONS.map((r) => standaloneApi.getRegionSummary(r.id, profile.id))
    );

    const cards: DashboardRegionCard[] = summaries.map((s) => {
      const primary = s.indicators[0];
      const picked = s.indicators.filter((ind) => featured.includes(ind.indicator_id));
      return {
        region: s.region,
        deviation_pct: primary?.anomaly_pct ?? null,
        trend: primary?.trend ?? 'normal',
        metrics: picked.map((ind) => ({
          indicator_id: ind.indicator_id,
          label_en: ind.label_en,
          label_fr: ind.label_fr,
          value: ind.value,
          unit: ind.unit,
          trend: ind.trend,
        })),
      };
    });

    const highlights: DashboardHighlight[] = cards.slice(0, 3).map((c, idx) => {
      const m = c.metrics[0];
      const trendEn =
        m.trend === 'below_normal' ? 'Below-normal' : m.trend === 'above_normal' ? 'Above-normal' : 'Normal';
      const trendFr =
        m.trend === 'below_normal'
          ? 'Inférieur à la normale :'
          : m.trend === 'above_normal'
          ? 'Supérieur à la normale :'
          : 'Niveau normal :';
      const indObj = CLIMATE_INDICATORS.find((i) => i.id === m.indicator_id) ?? CLIMATE_INDICATORS[0];
      const ds = NASA_DATASETS.find((d) => d.id === indObj.dataset_id) ?? NASA_DATASETS[0];

      return {
        id: `hl-${idx}`,
        region_id: c.region.id,
        indicator_id: m.indicator_id,
        text_en: `${trendEn} ${indObj.name_en.toLowerCase()} in ${c.region.name} in September (${m.value ?? 'N/D'} ${m.unit}).`,
        text_fr: `${trendFr} ${indObj.name_fr.toLowerCase()} en ${c.region.name} en septembre (${m.value ?? 'N/D'} ${m.unit}).`,
        source: ds.name,
        dataset_id: ds.id,
      };
    });

    return {
      profile: profile.id,
      reference_period: 'September 2025',
      highlights,
      regions: cards,
    };
  },

  async getRegionAgriculture(regionId: RegionId): Promise<AgricultureModeResponse> {
    const region = findRegionById(regionId);
    if (!region) throw new ApiError('Region not found', 404, 'region_not_found');

    const monthIdx = 8; // September
    const nasa = await fetchNasaPowerDirect(region.id, 2020, 2025);
    const m = computeRegionMetrics(region, nasa, monthIdx);
    const isRainy = region.rainyMonths.includes(monthIdx + 1);

    return {
      region: stripRegionRecord(region),
      month_label_en: MONTH_NAMES_EN[monthIdx],
      month_label_fr: MONTH_NAMES_FR[monthIdx],
      season_status: isRainy ? 'rainy' : 'dry',
      season_label_en: isRainy ? 'Rainy season' : 'Dry season',
      season_label_fr: isRainy ? 'Saison des pluies' : 'Saison sèche',
      rainfall_trend: m.rainTrend,
      rainfall_label_en:
        m.rainTrend === 'below_normal'
          ? 'Rainfall: below normal'
          : m.rainTrend === 'above_normal'
          ? 'Rainfall: above normal'
          : 'Rainfall: normal',
      rainfall_label_fr:
        m.rainTrend === 'below_normal'
          ? 'Pluie : sous la normale'
          : m.rainTrend === 'above_normal'
          ? 'Pluie : au-dessus de la normale'
          : 'Pluie : normale',
      vegetation_trend: m.greenTrend,
      vegetation_label_en:
        m.greenTrend === 'below_normal'
          ? 'Vegetation: below normal'
          : m.greenTrend === 'above_normal'
          ? 'Vegetation: above normal'
          : 'Vegetation: normal',
      vegetation_label_fr:
        m.greenTrend === 'below_normal'
          ? 'Végétation : sous la normale'
          : m.greenTrend === 'above_normal'
          ? 'Végétation : au-dessus de la normale'
          : 'Végétation : normale',
      tips: [
        {
          id: 'tip-1',
          text_en:
            m.rainTrend === 'below_normal'
              ? `Keep soil covered with crop residue in ${region.name} to hold moisture longer.`
              : `Monitor field drainage in ${region.name} during heavy rainfall episodes.`,
          text_fr:
            m.rainTrend === 'below_normal'
              ? `Protégez le sol avec un paillage végétal dans la région ${region.name} pour garder l’humidité.`
              : `Surveillez l’écoulement de l’eau dans les parcelles de la région ${region.name}.`,
        },
        {
          id: 'tip-2',
          text_en: `Local crops suited to ${region.name}: ${region.crops_en.slice(0, 3).join(', ')}.`,
          text_fr: `Cultures adaptées à la zone (${region.name}) : ${region.crops_fr.slice(0, 3).join(', ')}.`,
        },
      ],
      disclaimer_en: 'Does not replace official forecasts',
      disclaimer_fr: 'Ne remplace pas les prévisions officielles',
      source: 'NASA GPM IMERG / POWER',
      dataset_id: 'gpm_imerg',
    };
  },

  async transcribeVoice(): Promise<never> {
    throw new ApiError('Voice is coming soon', 501, 'not_implemented');
  },

  async explainIndicator(payload: {
    region_id: RegionId;
    indicator_id: IndicatorId;
    profile: ProfileId | null;
    language: LanguageCode;
  }): Promise<ExplainResponse> {
    const summary = await standaloneApi.getRegionSummary(payload.region_id, payload.profile);
    const card =
      summary.indicators.find((c) => c.indicator_id === payload.indicator_id) ??
      summary.indicators[0];
    const ds = NASA_DATASETS.find((d) => d.id === card.dataset_id) ?? NASA_DATASETS[0];
    const isResearcher = payload.profile === 'researcher';

    const sentences: ExplainSentence[] = isResearcher
      ? [
          {
            text:
              payload.language === 'fr'
                ? `Valeur observée pour ${summary.region.name} (${card.period_label_fr}) : ${card.value ?? 'N/D'} ${card.unit} (écart ${card.anomaly_pct ?? 0}% vs moyenne 2020–2024).`
                : `Observed value for ${summary.region.name} (${card.period_label_en}): ${card.value ?? 'N/A'} ${card.unit} (${card.anomaly_pct ?? 0}% vs 2020–2024 baseline).`,
            nature: 'observed',
            source_id: ds.id,
            source_name: ds.name,
          },
          {
            text:
              payload.language === 'fr'
                ? `Mesure issue de la grille ${ds.resolution}. ${ds.limitations_fr}`
                : `Derived at ${ds.resolution} spatial resolution. ${ds.limitations_en}`,
            nature: 'interpreted',
            source_id: ds.id,
            source_name: ds.name,
          },
        ]
      : [
          {
            text:
              payload.language === 'fr'
                ? `En ${summary.region.name}, la mesure observée est de ${card.value ?? 'N/D'} ${card.unit} (${card.trend_text_fr}).`
                : `In ${summary.region.name}, the observed measurement is ${card.value ?? 'N/A'} ${card.unit} (${card.trend_text_en}).`,
            nature: 'observed',
            source_id: ds.id,
            source_name: ds.name,
          },
          {
            text: payload.language === 'fr' ? card.plain_sentence_fr : card.plain_sentence_en,
            nature: 'interpreted',
            source_id: ds.id,
            source_name: ds.name,
          },
        ];

    return {
      region_id: payload.region_id,
      indicator_id: payload.indicator_id,
      profile: payload.profile || 'community',
      sentences,
    };
  },

  async buildChatReply(payload: {
    session_id?: string | null;
    thread_id?: string | null;
    message: string;
    region_id: RegionId;
    profile: ProfileId | null;
    language: LanguageCode;
  }): Promise<ChatResponse> {
    const region = findRegionById(payload.region_id) ?? TOGO_REGIONS[0];
    const isOffTopic = /\b(football|soccer|recipe|recette|politics|politique|bitcoin|crypto|movie|film)\b/i.test(
      payload.message
    );
    const activeThreadId =
      payload.thread_id ||
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `thread-${Date.now()}`);

    const sources: ChatSourceRef[] = [
      { dataset_id: 'gpm_imerg', name: 'NASA GPM IMERG' },
      { dataset_id: 'modis_ndvi', name: 'NASA MODIS NDVI / POWER' },
    ];

    if (isOffTopic) {
      return {
        thread_id: activeThreadId,
        answer:
          payload.language === 'fr'
            ? `Je réponds uniquement aux questions environnementales et climatiques concernant le Togo à partir des observations satellitaires de la NASA.`
            : `I only answer environmental and climate questions for Togo grounded in NASA satellite observations.`,
        sources,
        chart: null,
      };
    }

    const summary = await standaloneApi.getRegionSummary(region.id, payload.profile);
    const ts = await standaloneApi.getRegionTimeseries(region.id, 'rainfall', 12);
    const rain = summary.indicators.find((i) => i.indicator_id === 'rainfall');
    const green = summary.indicators.find((i) => i.indicator_id === 'greenness');
    const lst = summary.indicators.find((i) => i.indicator_id === 'lst');

    const wantsChart =
      /rain|pluie|vegetation|végétation|temp|chart|graph|savanes|kara|lome|plateaux|centrale/i.test(
        payload.message
      );

    const chart: ChatChartEvent | null = wantsChart
      ? {
          title:
            payload.language === 'fr'
              ? `Précipitations 2025 — ${region.name}`
              : `2025 Rainfall — ${region.name}`,
          unit: 'mm',
          points: ts.series.map((pt) => ({
            label: payload.language === 'fr' ? pt.label_fr : pt.label_en,
            value: pt.value,
            normal: pt.normal,
          })),
        }
      : null;

    const answer =
      payload.language === 'fr'
        ? `Pour la région ${region.name} (chef-lieu ${region.capital}), les observations NASA de septembre 2025 indiquent : précipitations de ${rain?.value ?? 'N/D'} mm (${rain?.trend_text_fr}), indice d’humidité végétale de ${green?.value ?? 'N/D'} (${green?.trend_text_fr}) et température de surface du sol de ${lst?.value ?? 'N/D'} °C. ${region.climate_zone_fr}.`
        : `For the ${region.name} region (capital ${region.capital}), September 2025 NASA observations show: rainfall at ${rain?.value ?? 'N/A'} mm (${rain?.trend_text_en}), vegetation moisture index at ${green?.value ?? 'N/A'} (${green?.trend_text_en}), and land surface temperature at ${lst?.value ?? 'N/A'} °C. ${region.climate_zone_en}.`;

    if (payload.session_id) {
      const map = loadSessionsMap();
      const s = map[payload.session_id];
      if (s) {
        const now = new Date().toISOString();
        const existing = s.conversations.find((c) => c.thread_id === activeThreadId);
        if (existing) {
          existing.updated_at = now;
          existing.last_message = payload.message;
          existing.region_id = region.id;
        } else {
          const entry: ConversationSummary = {
            thread_id: activeThreadId,
            title: payload.message.slice(0, 48),
            region_id: region.id,
            updated_at: now,
            last_message: payload.message,
          };
          s.conversations.unshift(entry);
        }
        saveSessionsMap(map);
      }
    }

    return { thread_id: activeThreadId, answer, sources, chart };
  },
};
