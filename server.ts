import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import type {
  AgricultureModeResponse,
  ConversationSummary,
  DashboardHighlight,
  DashboardRegionCard,
  DatasetInfo,
  ExperienceMode,
  ExplainSentence,
  IndicatorId,
  IndicatorInfo,
  IndicatorSummaryCard,
  LanguageCode,
  ProfileId,
  RegionGeoJsonFeature,
  RegionId,
  RegionInfo,
  SessionPreferences,
  SessionResponse,
  TimeseriesPoint,
  TrendDirection,
  UserProfile,
} from './src/types/apiContract.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3000;
const CACHE_TTL_MS = 15 * 60 * 1000;

/* -------------------------------------------------------------------------- */
/* Togo Reference Geography (5 Official Regions, GeoJSON [lon, lat])          */
/* -------------------------------------------------------------------------- */

const REGIONS: (RegionInfo & {
  elevationM: number;
  rainyMonths: number[];
  polygon: [number, number][]; // [lon, lat]
})[] = [
  {
    id: 'savanes',
    name: 'Savanes',
    capital: 'Dapaong',
    centroid: [0.2075, 10.8622],
    elevationM: 326,
    rainyMonths: [6, 7, 8, 9],
    climate_zone_en: 'Sudano-Sahelian zone (short unimodal rainfall, June–September)',
    climate_zone_fr: 'Zone soudano-sahélienne (saison des pluies unique, juin–septembre)',
    crops_en: ['Millet', 'Sorghum', 'Cowpea', 'Groundnut', 'Rice'],
    crops_fr: ['Mil', 'Sorgho', 'Niébé', 'Arachide', 'Riz'],
    polygon: [
      [-0.14, 11.14],
      [0.92, 11.14],
      [0.98, 10.25],
      [0.36, 9.95],
      [-0.14, 10.35],
      [-0.14, 11.14],
    ],
  },
  {
    id: 'kara',
    name: 'Kara',
    capital: 'Kara',
    centroid: [1.1861, 9.5511],
    elevationM: 312,
    rainyMonths: [5, 6, 7, 8, 9, 10],
    climate_zone_en: 'Sudanian wooded savanna (May–October rainy season)',
    climate_zone_fr: 'Savane arborée soudanienne (saison des pluies mai–octobre)',
    crops_en: ['Sorghum', 'Millet', 'Yam', 'Cotton', 'Soybean'],
    crops_fr: ['Sorgho', 'Mil', 'Igname', 'Coton', 'Soja'],
    polygon: [
      [0.36, 9.95],
      [0.98, 10.25],
      [1.45, 10.05],
      [1.5, 9.25],
      [0.48, 9.18],
      [0.36, 9.95],
    ],
  },
  {
    id: 'centrale',
    name: 'Centrale',
    capital: 'Sokodé',
    centroid: [1.1333, 8.9833],
    elevationM: 340,
    rainyMonths: [5, 6, 7, 8, 9, 10],
    climate_zone_en: 'Sudano-Guinean transition zone',
    climate_zone_fr: 'Zone de transition soudano-guinéenne',
    crops_en: ['Yam', 'Sorghum', 'Soybean', 'Maize'],
    crops_fr: ['Igname', 'Sorgho', 'Soja', 'Maïs'],
    polygon: [
      [0.48, 9.18],
      [1.5, 9.25],
      [1.62, 8.22],
      [0.56, 8.18],
      [0.48, 9.18],
    ],
  },
  {
    id: 'plateaux',
    name: 'Plateaux',
    capital: 'Atakpamé',
    centroid: [1.1333, 7.5333],
    elevationM: 376,
    rainyMonths: [4, 5, 6, 7, 8, 9, 10],
    climate_zone_en: 'Humid forested highlands (high rainfall & elevation)',
    climate_zone_fr: 'Hauts plateaux forestiers humides',
    crops_en: ['Cocoa', 'Coffee', 'Cotton', 'Maize', 'Yam'],
    crops_fr: ['Cacao', 'Café', 'Coton', 'Maïs', 'Igname'],
    polygon: [
      [0.56, 8.18],
      [1.62, 8.22],
      [1.66, 6.72],
      [0.58, 6.66],
      [0.55, 7.48],
      [0.56, 8.18],
    ],
  },
  {
    id: 'maritime',
    name: 'Maritime',
    capital: 'Lomé',
    centroid: [1.2255, 6.1319],
    elevationM: 12,
    rainyMonths: [4, 5, 6, 7, 9, 10],
    climate_zone_en: 'Subequatorial coastal zone (bimodal rainfall)',
    climate_zone_fr: 'Zone côtière subéquatoriale (régime bimodal)',
    crops_en: ['Maize', 'Cassava', 'Market gardening', 'Coconut'],
    crops_fr: ['Maïs', 'Manioc', 'Cultures maraîchères', 'Cocotier'],
    polygon: [
      [0.58, 6.66],
      [1.66, 6.72],
      [1.8, 6.15],
      [1.18, 6.08],
      [0.58, 6.66],
    ],
  },
];

const PROFILES: UserProfile[] = [
  {
    id: 'farmer',
    title_en: 'Farmers',
    title_fr: 'Agriculteurs',
    description_en: 'Understand rainfall and vegetation to plan crops better.',
    description_fr: 'Comprendre la pluie et la végétation pour mieux planifier les cultures.',
    default_mode: 'public',
    landing_screen: '/grand-public',
    featured_indicators: ['rainfall', 'greenness'],
    ai_tone_en: 'Short sentences, practical tips',
    ai_tone_fr: 'Phrases courtes, conseils pratiques',
  },
  {
    id: 'community',
    title_en: 'Communities',
    title_fr: 'Communautés',
    description_en: 'Follow local rain and temperature changes in plain language.',
    description_fr: 'Suivre l’évolution locale des pluies et des températures sans jargon.',
    default_mode: 'public',
    landing_screen: '/',
    featured_indicators: ['rainfall', 'lst'],
    ai_tone_en: 'Plain language',
    ai_tone_fr: 'Langage simple',
  },
  {
    id: 'researcher',
    title_en: 'Researchers and students',
    title_fr: 'Chercheurs et étudiants',
    description_en: 'Inspect multi-year series, resolution metadata, and export CSV.',
    description_fr: 'Analyser les séries multi-annuelles, la résolution spatiale et exporter en CSV.',
    default_mode: 'scientific',
    landing_screen: '/scientifique',
    featured_indicators: ['rainfall', 'greenness', 'lst', 'elevation'],
    ai_tone_en: 'Units, resolution, limits',
    ai_tone_fr: 'Unités, résolution, limites',
  },
  {
    id: 'decision_maker',
    title_en: 'Local decision-makers',
    title_fr: 'Décideurs locaux',
    description_en: 'Compare Togo regions to guide territorial planning.',
    description_fr: 'Comparer les régions du Togo pour appuyer la planification territoriale.',
    default_mode: 'public',
    landing_screen: '/',
    featured_indicators: ['rainfall', 'greenness', 'lst'],
    ai_tone_en: 'Summary, cross-region comparisons',
    ai_tone_fr: 'Synthèses et comparaisons interrégionales',
  },
];

const INDICATORS: IndicatorInfo[] = [
  {
    id: 'rainfall',
    name_en: 'Rainfall',
    name_fr: 'Précipitations',
    unit: 'mm',
    dataset_id: 'gpm_imerg',
    has_timeseries: true,
    tooltip_public_en: 'Shows how much rain fell over the region compared to normal.',
    tooltip_public_fr: 'Indique la quantité de pluie tombée sur la région par rapport à la normale.',
    tooltip_scientific_en: 'NASA GPM IMERG / POWER PRECTOTCORR, monthly total, 0.1° / 0.5° grid.',
    tooltip_scientific_fr: 'NASA GPM IMERG / POWER PRECTOTCORR, cumul mensuel, grille 0,1° / 0,5°.',
  },
  {
    id: 'greenness',
    name_en: 'Greenness',
    name_fr: 'Végétation',
    unit: 'index',
    dataset_id: 'modis_ndvi',
    has_timeseries: true,
    tooltip_public_en: 'The higher the value, the greener the land.',
    tooltip_public_fr: 'Plus la valeur est élevée, plus la végétation est verte et fournie.',
    tooltip_scientific_en: 'MODIS NDVI, 16-day composite, 250 m (paired with POWER GWETROOT moisture).',
    tooltip_scientific_fr: 'MODIS NDVI, composite 16 jours, 250 m (couplé à l’humidité racinaire GWETROOT).',
  },
  {
    id: 'lst',
    name_en: 'Land surface temp.',
    name_fr: 'Température de surface',
    unit: '°C',
    dataset_id: 'modis_lst',
    has_timeseries: true,
    tooltip_public_en: 'Shows how warm the ground surface is compared to usual.',
    tooltip_public_fr: 'Indique si la surface du sol est plus chaude ou plus fraîche que d’habitude.',
    tooltip_scientific_en: 'MODIS Terra LST & NASA POWER Earth Skin Temp (TS), °C.',
    tooltip_scientific_fr: 'MODIS Terra LST & NASA POWER Earth Skin Temp (TS), °C.',
  },
  {
    id: 'elevation',
    name_en: 'Elevation',
    name_fr: 'Altitude',
    unit: 'm',
    dataset_id: 'srtm_elevation',
    has_timeseries: false,
    tooltip_public_en: 'Height of the land above sea level — stays constant over time.',
    tooltip_public_fr: 'Altitude moyenne du relief au-dessus de la mer — constante dans le temps.',
    tooltip_scientific_en: 'NASA SRTM Digital Elevation Model, 30 m static terrain reference.',
    tooltip_scientific_fr: 'Modèle numérique de terrain NASA SRTM, résolution 30 m (donnée statique).',
  },
];

const DATASETS: DatasetInfo[] = [
  {
    id: 'gpm_imerg',
    name: 'NASA GPM IMERG / POWER Precipitation',
    variable: 'PRECTOTCORR (Corrected Precipitation)',
    resolution: '0.1° (IMERG) / 0.5° × 0.625° (POWER)',
    units: 'mm/month (mm/yr)',
    period: '2000–present (monthly & daily)',
    limitations_en: 'Limitation: satellite estimate; local rain gauges in hilly terrain may differ.',
    limitations_fr: 'Limite : estimation satellitaire ; les relevés au sol en zone montagneuse peuvent différer.',
    url: 'https://gpm.nasa.gov/data/imerg',
  },
  {
    id: 'modis_ndvi',
    name: 'NASA MODIS Terra Vegetation Index (NDVI)',
    variable: 'NDVI (0–1) & POWER GWETROOT Moisture',
    resolution: '250 m (16-day MODIS) · 0.5° (GWETROOT)',
    units: 'Dimensionless index (0–1)',
    period: '2000–present',
    limitations_en: 'Limitation: dense tropical cloud cover during peak monsoon can obscure optical NDVI.',
    limitations_fr: 'Limite : la couverture nuageuse dense en saison des pluies peut limiter les mesures optiques NDVI.',
    url: 'https://modis.gsfc.nasa.gov/data/dataprod/mod13.php',
  },
  {
    id: 'modis_lst',
    name: 'NASA MODIS Terra Land Surface Temperature & POWER TS',
    variable: 'Daytime Land Surface Temperature (LST / TS)',
    resolution: '1 km (MODIS) · 0.5° (POWER TS)',
    units: '°C (degrees Celsius)',
    period: '2000–present',
    limitations_en: 'Limitation: measures radiative ground skin temperature, which differs from shaded 2 m air temperature.',
    limitations_fr: 'Limite : mesure la température radiative du sol nu/couvert, distincte de la température de l’air à 2 m.',
    url: 'https://modis.gsfc.nasa.gov/data/dataprod/mod11.php',
  },
  {
    id: 'srtm_elevation',
    name: 'NASA Shuttle Radar Topography Mission (SRTM)',
    variable: 'Terrain Elevation',
    resolution: '30 m (1 arc-second)',
    units: 'm (meters above sea level)',
    period: 'Static topographic reference (2000)',
    limitations_en: 'Limitation: static terrain dataset without temporal trend.',
    limitations_fr: 'Limite : donnée topographique statique sans série temporelle.',
    url: 'https://www.earthdata.nasa.gov/sensors/srtm',
  },
];

/* -------------------------------------------------------------------------- */
/* In-Memory Session Store & NASA POWER Cache                                 */
/* -------------------------------------------------------------------------- */

interface StoredSession {
  session_id: string;
  preferences: SessionPreferences;
  onboarding_completed: boolean;
  conversations: ConversationSummary[];
  threads: Record<string, { role: 'user' | 'assistant'; content: string }[]>;
}

const sessionStore = new Map<string, StoredSession>();

interface NasaYearSeries {
  precipMm: (number | null)[]; // 12 months
  gwetRoot: (number | null)[]; // 12 months
  surfaceTempC: (number | null)[]; // 12 months
}

const nasaYearCache = new Map<string, { expiresAt: number; data: Record<number, NasaYearSeries> }>();

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function cleanVal(v: number | undefined): number | null {
  if (v === undefined || v === null || Number.isNaN(v) || v <= -900) return null;
  return v;
}

async function fetchNasaPowerRange(
  regionId: RegionId,
  startYear: number,
  endYear: number
): Promise<Record<number, NasaYearSeries>> {
  const region = REGIONS.find((r) => r.id === regionId) ?? REGIONS[1];
  const sYear = Math.max(2001, Math.min(2025, startYear));
  const eYear = Math.max(sYear, Math.min(2025, endYear));
  const cacheKey = `${region.id}:${sYear}:${eYear}`;
  const cached = nasaYearCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const [lon, lat] = region.centroid;
  const url = `https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=PRECTOTCORR,TS,GWETROOT&community=AG&longitude=${lon}&latitude=${lat}&start=${sYear}&end=${eYear}&format=JSON`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  let json: any;
  try {
    const resp = await fetch(url, { signal: controller.signal });
    if (!resp.ok) throw new Error(`NASA POWER HTTP ${resp.status}`);
    json = await resp.json();
  } finally {
    clearTimeout(timeout);
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

  nasaYearCache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    data: result,
  });

  return result;
}

function classifyTrend(anomalyPct: number | null): TrendDirection {
  if (anomalyPct === null) return 'normal';
  if (anomalyPct > 10) return 'above_normal';
  if (anomalyPct < -10) return 'below_normal';
  return 'normal';
}

function pointInPolygon(lon: number, lat: number, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersect =
      yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured on the server.');
  return new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });
}

const MONTH_NAMES_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

function computeRegionMetrics(
  region: (typeof REGIONS)[number],
  nasaData: Record<number, NasaYearSeries>,
  monthIdx: number // 0-11 (e.g. 8 for September)
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

async function buildRegionSummary(regionId: RegionId, profileId?: ProfileId | null) {
  const region = REGIONS.find((r) => r.id === regionId);
  if (!region) return null;

  const nasa = await fetchNasaPowerRange(region.id, 2020, 2025);
  const refMonthIdx = 8; // September (key agricultural month in Togo)
  const m = computeRegionMetrics(region, nasa, refMonthIdx);

  const trendText = (t: TrendDirection, anom: number | null, en: boolean) => {
    const abs = anom !== null ? `${Math.abs(anom).toFixed(0)}%` : '';
    if (t === 'above_normal') return en ? `▲ ${abs} above normal` : `▲ ${abs} au-dessus de la normale`;
    if (t === 'below_normal') return en ? `▼ ${abs} below normal` : `▼ ${abs} sous la normale`;
    return en ? `● normal (${anom !== null ? (anom >= 0 ? '+' : '') + anom.toFixed(0) + '%' : '0%'})` : `● normal (${anom !== null ? (anom >= 0 ? '+' : '') + anom.toFixed(0) + '%' : '0%'})`;
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

  const profile = PROFILES.find((p) => p.id === profileId) ?? PROFILES[1];
  const ordered = [
    ...profile.featured_indicators
      .map((id) => allCards.find((c) => c.indicator_id === id))
      .filter((c): c is IndicatorSummaryCard => Boolean(c)),
    ...allCards.filter((c) => !profile.featured_indicators.includes(c.indicator_id)),
  ];

  return {
    region: {
      id: region.id,
      name: region.name,
      capital: region.capital,
      centroid: region.centroid,
      climate_zone_en: region.climate_zone_en,
      climate_zone_fr: region.climate_zone_fr,
      crops_en: region.crops_en,
      crops_fr: region.crops_fr,
    },
    reference_period: '2025-09',
    indicators: ordered,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  const v1 = express.Router();

  /* M01 GET /health */
  v1.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  /* M02 GET /meta */
  v1.get('/meta', (_req: Request, res: Response) => {
    res.json({
      data_updated_at: '31/10/2026',
      features: {
        voice: 'in_development',
        ewe: 'planned',
      },
    });
  });

  /* M27 GET /profiles */
  v1.get('/profiles', (_req: Request, res: Response) => {
    res.json({ profiles: PROFILES });
  });

  /* M03 POST /sessions */
  v1.post('/sessions', (_req: Request, res: Response) => {
    const id = crypto.randomUUID();
    const session: StoredSession = {
      session_id: id,
      preferences: {
        profile: null,
        region_id: 'kara',
        language: 'fr',
        mode: 'public',
      },
      onboarding_completed: false,
      conversations: [],
      threads: {},
    };
    sessionStore.set(id, session);
    res.status(201).json({
      session_id: session.session_id,
      preferences: session.preferences,
      onboarding_completed: session.onboarding_completed,
      conversations: session.conversations,
    } satisfies SessionResponse);
  });

  /* M04 GET /sessions/:id */
  v1.get('/sessions/:id', (req: Request, res: Response) => {
    const id = String(req.params.id);
    const session = sessionStore.get(id);
    if (!session) {
      res.status(404).json({ code: 'session_not_found', message: 'Session not found' });
      return;
    }
    const sortedConvs = [...session.conversations].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
    res.json({
      session_id: session.session_id,
      preferences: session.preferences,
      onboarding_completed: session.onboarding_completed,
      conversations: sortedConvs,
    } satisfies SessionResponse);
  });

  /* M05 PATCH /sessions/:id/preferences */
  v1.patch('/sessions/:id/preferences', (req: Request, res: Response) => {
    const id = String(req.params.id);
    let session = sessionStore.get(id);
    if (!session) {
      res.status(404).json({ code: 'session_not_found', message: 'Session not found' });
      return;
    }

    const { profile, region_id, language, mode, onboarding_completed } = req.body || {};

    if (profile !== undefined && profile !== null) {
      if (!PROFILES.some((p) => p.id === profile)) {
        res.status(422).json({ code: 'invalid_profile', message: `Invalid profile: ${profile}` });
        return;
      }
      session.preferences.profile = profile;
    }

    if (region_id !== undefined) {
      if (!REGIONS.some((r) => r.id === region_id)) {
        res.status(404).json({ code: 'region_not_found', message: `Unknown region: ${region_id}` });
        return;
      }
      session.preferences.region_id = region_id;
    }

    if (language !== undefined) {
      if (language !== 'fr' && language !== 'en') {
        res.status(422).json({ code: 'invalid_language', message: `Unsupported language: ${language}` });
        return;
      }
      session.preferences.language = language;
    }

    if (mode !== undefined) {
      if (mode !== 'public' && mode !== 'scientific') {
        res.status(422).json({ code: 'invalid_mode', message: `Invalid mode: ${mode}` });
        return;
      }
      session.preferences.mode = mode;
    }

    if (typeof onboarding_completed === 'boolean') {
      session.onboarding_completed = onboarding_completed;
    }

    res.json({
      session_id: session.session_id,
      preferences: session.preferences,
      onboarding_completed: session.onboarding_completed,
      conversations: [...session.conversations].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      ),
    } satisfies SessionResponse);
  });

  /* M06 GET /regions */
  v1.get('/regions', (_req: Request, res: Response) => {
    res.json({
      regions: REGIONS.map((r) => ({
        id: r.id,
        name: r.name,
        capital: r.capital,
        centroid: r.centroid,
        climate_zone_en: r.climate_zone_en,
        climate_zone_fr: r.climate_zone_fr,
        crops_en: r.crops_en,
        crops_fr: r.crops_fr,
      })),
    });
  });

  /* M07 GET /regions/geojson */
  v1.get('/regions/geojson', (_req: Request, res: Response) => {
    const features: RegionGeoJsonFeature[] = REGIONS.map((r) => ({
      type: 'Feature',
      properties: { id: r.id, name: r.name, capital: r.capital },
      geometry: { type: 'Polygon', coordinates: [r.polygon] },
    }));
    res.json({ type: 'FeatureCollection', features });
  });

  /* M09 GET /locate?lon&lat */
  v1.get('/locate', (req: Request, res: Response) => {
    const lon = Number(req.query.lon);
    const lat = Number(req.query.lat);
    if (Number.isNaN(lon) || Number.isNaN(lat)) {
      res.status(422).json({ message: 'Valid lon and lat query parameters are required.' });
      return;
    }

    const matched = REGIONS.find((r) => pointInPolygon(lon, lat, r.polygon));
    if (!matched) {
      res.status(404).json({ code: 'area_not_covered', message: 'Area not covered' });
      return;
    }

    res.json({ region_id: matched.id, name: matched.name, capital: matched.capital });
  });

  /* M08 GET /regions/:id */
  v1.get('/regions/:id', (req: Request, res: Response) => {
    const r = REGIONS.find((reg) => reg.id === req.params.id);
    if (!r) {
      res.status(404).json({ code: 'region_not_found', message: 'Region not found' });
      return;
    }
    res.json({
      id: r.id,
      name: r.name,
      capital: r.capital,
      centroid: r.centroid,
      climate_zone_en: r.climate_zone_en,
      climate_zone_fr: r.climate_zone_fr,
      crops_en: r.crops_en,
      crops_fr: r.crops_fr,
    });
  });

  /* M10 GET /indicators */
  v1.get('/indicators', (_req: Request, res: Response) => {
    res.json({ indicators: INDICATORS });
  });

  /* M11 GET /datasets */
  v1.get('/datasets', (_req: Request, res: Response) => {
    res.json({ datasets: DATASETS });
  });

  /* M12 GET /datasets/:id */
  v1.get('/datasets/:id', (req: Request, res: Response) => {
    const ds = DATASETS.find((d) => d.id === req.params.id);
    if (!ds) {
      res.status(404).json({ code: 'dataset_not_found', message: 'Dataset not found' });
      return;
    }
    res.json(ds);
  });

  /* M13 GET /layers?indicator=&mode=&date= */
  v1.get('/layers', async (req: Request, res: Response) => {
    try {
      const indicator = (String(req.query.indicator || 'greenness') as IndicatorId);
      const mode = (String(req.query.mode || 'public') as ExperienceMode);
      const dateStr = String(req.query.date || '2025-09-15');
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
        REGIONS.map(async (r) => {
          if (indicator === 'elevation') {
            regionValues[r.id] = r.elevationM;
            return;
          }
          const nasa = await fetchNasaPowerRange(r.id, year, year);
          const yr = nasa[year];
          if (!yr) return;
          regionValues[r.id] =
            indicator === 'rainfall'
              ? yr.precipMm[monthIdx]
              : indicator === 'greenness'
              ? yr.gwetRoot[monthIdx]
              : yr.surfaceTempC[monthIdx];
        })
      );

      const gibsDate = `${year}-${String(monthIdx + 1).padStart(2, '0')}-15`;

      const layerConfigs: Record<
        IndicatorId,
        {
          tile: string;
          zoom: number;
          titleEn: string;
          titleFr: string;
          minEn: string;
          maxEn: string;
          minFr: string;
          maxFr: string;
          stops: { color: string; label_en: string; label_fr: string }[];
        }
      > = {
        rainfall: {
          tile: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/IMERG_Precipitation_Rate/default/${gibsDate}/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png`,
          zoom: 6,
          titleEn: mode === 'scientific' ? 'GPM IMERG Precipitation (mm/month)' : 'Rainfall intensity',
          titleFr: mode === 'scientific' ? 'Précipitations GPM IMERG (mm/mois)' : 'Quantité de pluie',
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
          titleEn: mode === 'scientific' ? 'MODIS NDVI / Soil Moisture (0–1)' : 'Vegetation greenness',
          titleFr: mode === 'scientific' ? 'MODIS NDVI / Humidité sol (0–1)' : 'Verdure de la végétation',
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
          titleEn: mode === 'scientific' ? 'MODIS Land Surface Temp (°C)' : 'Surface warmth',
          titleFr: mode === 'scientific' ? 'Température de surface MODIS (°C)' : 'Chaleur du sol',
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

      const cfg = layerConfigs[indicator] ?? layerConfigs.greenness;
      res.json({
        indicator_id: indicator,
        mode,
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
      });
    } catch (err: any) {
      res.status(502).json({ message: err?.message || 'Error loading map layer.' });
    }
  });

  /* M14 GET /regions/:id/summary */
  v1.get('/regions/:id/summary', async (req: Request, res: Response) => {
    try {
      const regionId = req.params.id as RegionId;
      const profile = req.query.profile as ProfileId | undefined;
      const summary = await buildRegionSummary(regionId, profile);
      if (!summary) {
        res.status(404).json({ message: 'Region not found' });
        return;
      }
      res.json(summary);
    } catch (err: any) {
      res.status(502).json({ message: err?.message || 'Unable to load region summary.' });
    }
  });

  /* M15 GET /regions/:id/timeseries */
  v1.get('/regions/:id/timeseries', async (req: Request, res: Response) => {
    try {
      const region = REGIONS.find((r) => r.id === req.params.id);
      if (!region) {
        res.status(404).json({ message: 'Region not found' });
        return;
      }
      const indicatorId = (String(req.query.indicator || 'rainfall') as IndicatorId);
      const months = Math.max(12, Math.min(24, Number(req.query.months) || 12));
      const ind = INDICATORS.find((i) => i.id === indicatorId) ?? INDICATORS[0];
      const ds = DATASETS.find((d) => d.id === ind.dataset_id) ?? DATASETS[0];

      const nasa = await fetchNasaPowerRange(region.id, 2020, 2025);
      const years = months > 12 ? [2024, 2025] : [2025];
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

      res.json({
        region_id: region.id,
        indicator_id: indicatorId,
        dataset_id: ds.id,
        source_name: ds.name,
        unit: ind.unit,
        series: series.slice(-months),
      });
    } catch (err: any) {
      res.status(502).json({ message: err?.message || 'Unable to load timeseries.' });
    }
  });

  /* M16 GET /regions/:id/compare */
  v1.get('/regions/:id/compare', async (req: Request, res: Response) => {
    try {
      const region = REGIONS.find((r) => r.id === req.params.id);
      if (!region) {
        res.status(404).json({ message: 'Region not found' });
        return;
      }

      const indicator = (String(req.query.indicator || 'rainfall') as IndicatorId);
      const startA = Math.max(2001, Number(req.query.start_a) || 2015);
      const endA = Math.max(startA, Math.min(2025, Number(req.query.end_a) || 2019));
      const startB = Math.max(2001, Number(req.query.start_b) || 2021);
      const endB = Math.max(startB, Math.min(2025, Number(req.query.end_b) || 2025));

      const minYear = Math.min(startA, startB);
      const maxYear = Math.max(endA, endB);
      const nasa = await fetchNasaPowerRange(region.id, minYear, maxYear);

      const computeRangeAvg = (sY: number, eY: number): number | null => {
        const yearValues: number[] = [];
        for (let y = sY; y <= eY; y++) {
          const row = nasa[y];
          if (!row) continue;
          if (indicator === 'rainfall') {
            const valid = row.precipMm.filter((v): v is number => v !== null);
            if (valid.length === 12) {
              yearValues.push(valid.reduce((a, b) => a + b, 0));
            }
          } else {
            const arr = indicator === 'greenness' ? row.gwetRoot : row.surfaceTempC;
            const valid = arr.filter((v): v is number => v !== null);
            if (valid.length > 0) {
              yearValues.push(valid.reduce((a, b) => a + b, 0) / valid.length);
            }
          }
        }
        if (yearValues.length === 0) return null;
        const mean = yearValues.reduce((a, b) => a + b, 0) / yearValues.length;
        return Number(mean.toFixed(indicator === 'greenness' ? 2 : 1));
      };

      const valA = computeRangeAvg(startA, endA);
      const valB = computeRangeAvg(startB, endB);
      const deltaAbs =
        valA !== null && valB !== null
          ? Number((valB - valA).toFixed(indicator === 'greenness' ? 2 : 1))
          : null;
      const deltaPct =
        deltaAbs !== null && valA !== null && valA !== 0
          ? Number((((valB! - valA) / valA) * 100).toFixed(1))
          : null;

      const unit =
        indicator === 'rainfall'
          ? 'mm/yr'
          : indicator === 'greenness'
          ? 'index'
          : '°C';
      const ind = INDICATORS.find((i) => i.id === indicator) ?? INDICATORS[0];

      res.json({
        region_id: region.id,
        indicator_id: indicator,
        dataset_id: ind.dataset_id,
        unit,
        period_a: {
          label: startA === endA ? `${startA}` : `${startA}–${endA}`,
          start_year: startA,
          end_year: endA,
          value: valA,
          unit,
        },
        period_b: {
          label: startB === endB ? `${startB}` : `${startB}–${endB}`,
          start_year: startB,
          end_year: endB,
          value: valB,
          unit,
        },
        delta_abs: deltaAbs,
        delta_pct: deltaPct,
      });
    } catch (err: any) {
      res.status(502).json({ message: err?.message || 'Comparison failed.' });
    }
  });

  /* M17 GET /regions/:id/timeseries/export */
  v1.get('/regions/:id/timeseries/export', async (req: Request, res: Response) => {
    try {
      const region = REGIONS.find((r) => r.id === req.params.id);
      if (!region) {
        res.status(404).json({ message: 'Region not found' });
        return;
      }
      const indicatorId = (String(req.query.indicator || 'rainfall') as IndicatorId);
      const months = Math.max(12, Math.min(24, Number(req.query.months) || 24));
      const ind = INDICATORS.find((i) => i.id === indicatorId) ?? INDICATORS[0];
      const ds = DATASETS.find((d) => d.id === ind.dataset_id) ?? DATASETS[0];

      const nasa = await fetchNasaPowerRange(region.id, 2020, 2025);
      const years = months > 12 ? [2024, 2025] : [2025];
      const rows: string[] = [];

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
              ? (baseVals.reduce((a, b) => a + b, 0) / baseVals.length).toFixed(2)
              : '';

          rows.push(`${y}-${String(m + 1).padStart(2, '0')},${val ?? ''},${normal}`);
        }
      }

      const csv = [
        `# source: ${ds.name} (${ds.resolution})`,
        `# units: ${ind.unit}`,
        `# region: ${region.name} (${region.capital}, Togo)`,
        'date,value,normal_2020_2024',
        ...rows.slice(-months),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="agbea-${region.id}-${indicatorId}.csv"`
      );
      res.send(csv);
    } catch (err: any) {
      res.status(502).json({ message: err?.message || 'CSV export failed.' });
    }
  });

  /* M18 GET /layers/:id/before-after */
  v1.get('/layers/:id/before-after', async (req: Request, res: Response) => {
    try {
      const indicator = (String(req.params.id || 'greenness') as IndicatorId);
      const regionId = (String(req.query.region_id || 'savanes') as RegionId);
      const dateA = String(req.query.date_a || '2020-09-15');
      const dateB = String(req.query.date_b || '2025-09-15');

      const parseYearMonth = (d: string) => {
        const [ys, ms] = d.split('-');
        return {
          year: Math.max(2005, Math.min(2025, Number(ys) || 2020)),
          monthIdx: Math.max(0, Math.min(11, (Number(ms) || 9) - 1)),
        };
      };

      const a = parseYearMonth(dateA);
      const b = parseYearMonth(dateB);

      const loadSideValues = async (y: number, mIdx: number) => {
        const map: Record<RegionId, number | null> = {
          maritime: null,
          plateaux: null,
          centrale: null,
          kara: null,
          savanes: null,
        };
        await Promise.all(
          REGIONS.map(async (r) => {
            const nasa = await fetchNasaPowerRange(r.id, y, y);
            const row = nasa[y];
            if (!row) return;
            map[r.id] =
              indicator === 'rainfall'
                ? row.precipMm[mIdx]
                : indicator === 'greenness'
                ? row.gwetRoot[mIdx]
                : row.surfaceTempC[mIdx];
          })
        );
        return map;
      };

      const [valuesA, valuesB] = await Promise.all([
        loadSideValues(a.year, a.monthIdx),
        loadSideValues(b.year, b.monthIdx),
      ]);

      const buildTileUrl = (y: number, mIdx: number) => {
        const gibsDate = `${y}-${String(mIdx + 1).padStart(2, '0')}-15`;
        if (indicator === 'rainfall') {
          return {
            url: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/IMERG_Precipitation_Rate/default/${gibsDate}/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png`,
            zoom: 6,
          };
        }
        if (indicator === 'lst') {
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

      const tileA = buildTileUrl(a.year, a.monthIdx);
      const tileB = buildTileUrl(b.year, b.monthIdx);

      res.json({
        indicator_id: indicator,
        region_id: regionId,
        left: {
          date: dateA,
          label_en: `${MONTH_NAMES_EN[a.monthIdx]} ${a.year}`,
          label_fr: `${MONTH_NAMES_FR[a.monthIdx]} ${a.year}`,
          tile_url_template: tileA.url,
          max_native_zoom: tileA.zoom,
          region_values: valuesA,
        },
        right: {
          date: dateB,
          label_en: `${MONTH_NAMES_EN[b.monthIdx]} ${b.year}`,
          label_fr: `${MONTH_NAMES_FR[b.monthIdx]} ${b.year}`,
          tile_url_template: tileB.url,
          max_native_zoom: tileB.zoom,
          region_values: valuesB,
        },
      });
    } catch (err: any) {
      res.status(502).json({ message: err?.message || 'Unable to load before/after layers.' });
    }
  });

  /* M19 GET /dashboard */
  v1.get('/dashboard', async (req: Request, res: Response) => {
    try {
      const profileId = (String(req.query.profile || 'community') as ProfileId);
      const profile = PROFILES.find((p) => p.id === profileId) ?? PROFILES[1];
      const featured = profile.featured_indicators.slice(0, 2);

      const summaries = await Promise.all(
        REGIONS.map((r) => buildRegionSummary(r.id, profile.id))
      );

      const cards: DashboardRegionCard[] = summaries
        .filter((s): s is NonNullable<typeof s> => Boolean(s))
        .map((s) => {
          const primary = s.indicators[0];
          const picked = s.indicators.filter((ind) =>
            featured.includes(ind.indicator_id)
          );
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

      const highlights: DashboardHighlight[] = cards
        .slice(0, 3)
        .map((c, idx) => {
          const m = c.metrics[0];
          const trendEn =
            m.trend === 'below_normal'
              ? 'Below-normal'
              : m.trend === 'above_normal'
              ? 'Above-normal'
              : 'Normal';
          const trendFr =
            m.trend === 'below_normal'
              ? 'Inférieur à la normale :'
              : m.trend === 'above_normal'
              ? 'Supérieur à la normale :'
              : 'Niveau normal :';
          const indObj = INDICATORS.find((i) => i.id === m.indicator_id) ?? INDICATORS[0];
          const ds = DATASETS.find((d) => d.id === indObj.dataset_id) ?? DATASETS[0];

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

      res.json({
        profile: profile.id,
        reference_period: 'September 2025',
        highlights,
        regions: cards,
      });
    } catch (err: any) {
      res.status(502).json({ message: err?.message || 'Dashboard unavailable.' });
    }
  });

  /* M20 GET /regions/:id/agriculture */
  v1.get('/regions/:id/agriculture', async (req: Request, res: Response) => {
    try {
      const region = REGIONS.find((r) => r.id === req.params.id);
      if (!region) {
        res.status(404).json({ message: 'Region not found' });
        return;
      }

      const monthParam = req.query.month ? Number(req.query.month) : 9; // default September
      const monthIdx = Math.max(0, Math.min(11, monthParam - 1));
      const nasa = await fetchNasaPowerRange(region.id, 2020, 2025);
      const m = computeRegionMetrics(region, nasa, monthIdx);
      const isRainy = region.rainyMonths.includes(monthIdx + 1);

      const rainLabelEn =
        m.rainTrend === 'below_normal'
          ? 'Rainfall: below normal'
          : m.rainTrend === 'above_normal'
          ? 'Rainfall: above normal'
          : 'Rainfall: normal';
      const rainLabelFr =
        m.rainTrend === 'below_normal'
          ? 'Pluie : sous la normale'
          : m.rainTrend === 'above_normal'
          ? 'Pluie : au-dessus de la normale'
          : 'Pluie : normale';

      const vegLabelEn =
        m.greenTrend === 'below_normal'
          ? 'Vegetation: below normal'
          : m.greenTrend === 'above_normal'
          ? 'Vegetation: above normal'
          : 'Vegetation: normal';
      const vegLabelFr =
        m.greenTrend === 'below_normal'
          ? 'Végétation : sous la normale'
          : m.greenTrend === 'above_normal'
          ? 'Végétation : au-dessus de la normale'
          : 'Végétation : normale';

      const tips = [
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
      ];

      res.json({
        region: {
          id: region.id,
          name: region.name,
          capital: region.capital,
          centroid: region.centroid,
          climate_zone_en: region.climate_zone_en,
          climate_zone_fr: region.climate_zone_fr,
          crops_en: region.crops_en,
          crops_fr: region.crops_fr,
        },
        month_label_en: MONTH_NAMES_EN[monthIdx],
        month_label_fr: MONTH_NAMES_FR[monthIdx],
        season_status: isRainy ? 'rainy' : 'dry',
        season_label_en: isRainy ? 'Rainy season' : 'Dry season',
        season_label_fr: isRainy ? 'Saison des pluies' : 'Saison sèche',
        rainfall_trend: m.rainTrend,
        rainfall_label_en: rainLabelEn,
        rainfall_label_fr: rainLabelFr,
        vegetation_trend: m.greenTrend,
        vegetation_label_en: vegLabelEn,
        vegetation_label_fr: vegLabelFr,
        tips,
        disclaimer_en: 'Does not replace official forecasts',
        disclaimer_fr: 'Ne remplace pas les prévisions officielles',
        source: 'NASA GPM IMERG / POWER',
        dataset_id: 'gpm_imerg',
      } satisfies AgricultureModeResponse);
    } catch (err: any) {
      res.status(502).json({ message: err?.message || 'Unable to load agriculture view.' });
    }
  });

  /* M21 POST /voice/transcribe (501 Not Implemented while voice is in development) */
  v1.post('/voice/transcribe', (_req: Request, res: Response) => {
    res.status(501).json({
      code: 'not_implemented',
      message: 'Voice is coming soon',
    });
  });

  /* M24 POST /explain */
  v1.post('/explain', async (req: Request, res: Response) => {
    try {
      const regionId = (req.body?.region_id || 'savanes') as RegionId;
      const indicatorId = (req.body?.indicator_id || 'rainfall') as IndicatorId;
      const profileId = (req.body?.profile || 'community') as ProfileId;
      const language = (req.body?.language || 'en') as LanguageCode;

      const summary = await buildRegionSummary(regionId, profileId);
      if (!summary) {
        res.status(404).json({ message: 'Region not found' });
        return;
      }

      const card =
        summary.indicators.find((c) => c.indicator_id === indicatorId) ??
        summary.indicators[0];
      const ds = DATASETS.find((d) => d.id === card.dataset_id) ?? DATASETS[0];

      // Deterministic, source-backed fallback builder in case Gemini is slow or offline
      const buildFallbackSentences = (): ExplainSentence[] => {
        if (profileId === 'researcher') {
          return [
            {
              text:
                language === 'fr'
                  ? `Valeur observée pour ${summary.region.name} (${card.period_label_fr}) : ${card.value ?? 'N/D'} ${card.unit} (écart ${card.anomaly_pct ?? 0}% par rapport à la moyenne 2020–2024).`
                  : `Observed value for ${summary.region.name} (${card.period_label_en}): ${card.value ?? 'N/A'} ${card.unit} (${card.anomaly_pct ?? 0}% vs 2020–2024 baseline).`,
              nature: 'observed',
              source_id: ds.id,
              source_name: ds.name,
            },
            {
              text:
                language === 'fr'
                  ? `Cette mesure est issue de la grille ${ds.resolution} avec pour limite connue : ${ds.limitations_fr}`
                  : `Derived at ${ds.resolution} spatial resolution; ${ds.limitations_en}`,
              nature: 'interpreted',
              source_id: ds.id,
              source_name: ds.name,
            },
          ];
        }

        return [
          {
            text:
              language === 'fr'
                ? `En ${summary.region.name}, la mesure observée est de ${card.value ?? 'N/D'} ${card.unit} (${card.trend_text_fr}).`
                : `In ${summary.region.name}, the observed measurement is ${card.value ?? 'N/A'} ${card.unit} (${card.trend_text_en}).`,
            nature: 'observed',
            source_id: ds.id,
            source_name: ds.name,
          },
          {
            text: language === 'fr' ? card.plain_sentence_fr : card.plain_sentence_en,
            nature: 'interpreted',
            source_id: ds.id,
            source_name: ds.name,
          },
        ];
      };

      if (!process.env.GEMINI_API_KEY) {
        res.json({
          region_id: regionId,
          indicator_id: indicatorId,
          profile: profileId,
          sentences: buildFallbackSentences(),
        });
        return;
      }

      const ai = getGeminiClient();
      const toneRule =
        profileId === 'farmer'
          ? 'Audience: farmer. Use very short sentences and zero technical jargon.'
          : profileId === 'researcher'
          ? `Audience: climate researcher. Include exact units (${card.unit}), spatial resolution (${ds.resolution}), and sensor limitations.`
          : 'Audience: local community or decision-maker. Use clear plain language.';

      const prompt = `Explain this single environmental indicator observation in 2 to 3 concise sentences in ${language === 'fr' ? 'French' : 'English'}.
${toneRule}
STRICT GROUNDING: Quote ONLY the figures below.
Data:
- Region: ${summary.region.name} (Capital: ${summary.region.capital})
- Indicator: ${card.label_en}
- Value: ${card.value} ${card.unit}
- Anomaly vs 2020–2024 normal: ${card.anomaly_pct}% (${card.trend})
- Source: ${ds.name}, resolution ${ds.resolution}, limitation: ${ds.limitations_en}

Tag each sentence's nature as "observed" (direct figure), "interpreted" (meaning/limitation), or "predicted" (only if a projection exists, otherwise do not use predicted).`;

      const aiResp = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                nature: { type: Type.STRING },
              },
            },
          },
        },
      });

      const parsed = JSON.parse((aiResp.text || '[]').trim()) as {
        text: string;
        nature: string;
      }[];

      const sentences: ExplainSentence[] =
        Array.isArray(parsed) && parsed.length > 0
          ? parsed.map((s) => ({
              text: s.text,
              nature:
                s.nature === 'interpreted' || s.nature === 'predicted'
                  ? s.nature
                  : 'observed',
              source_id: ds.id,
              source_name: ds.name,
            }))
          : buildFallbackSentences();

      res.json({
        region_id: regionId,
        indicator_id: indicatorId,
        profile: profileId,
        sentences,
      });
    } catch {
      const regionId = (req.body?.region_id || 'savanes') as RegionId;
      const indicatorId = (req.body?.indicator_id || 'rainfall') as IndicatorId;
      const profileId = (req.body?.profile || 'community') as ProfileId;
      const ds = DATASETS[0];
      res.json({
        region_id: regionId,
        indicator_id: indicatorId,
        profile: profileId,
        sentences: [
          {
            text: 'Observations are retrieved from NASA satellite records for this region.',
            nature: 'observed',
            source_id: ds.id,
            source_name: ds.name,
          },
        ],
      });
    }
  });

  async function buildGroundedChatReply(params: {
    message: string;
    regionId: RegionId;
    profileId: ProfileId;
    language: LanguageCode;
  }) {
    const region = REGIONS.find((r) => r.id === params.regionId) ?? REGIONS[0];
    const nasa = await fetchNasaPowerRange(region.id, 2020, 2025);
    const summary = await buildRegionSummary(region.id, params.profileId);

    const monthly2025 = Array.from({ length: 12 }, (_, m) => ({
      label: MONTH_NAMES_EN[m],
      rainfall_mm: nasa[2025]?.precipMm?.[m] ?? null,
      wetness: nasa[2025]?.gwetRoot?.[m] ?? null,
      lst_c: nasa[2025]?.surfaceTempC?.[m] ?? null,
    }));

    const wantsChart =
      /rain|pluie|vegetation|végétation|temp|chart|graph|savanes|kara|lome|plateaux|centrale/i.test(
        params.message
      );

    const chart = wantsChart
      ? {
          title:
            params.language === 'fr'
              ? `Précipitations 2025 — ${region.name}`
              : `2025 Rainfall — ${region.name}`,
          unit: 'mm',
          points: monthly2025.map((m, idx) => {
            const baseVals = [2020, 2021, 2022, 2023, 2024]
              .map((by) => nasa[by]?.precipMm?.[idx] ?? null)
              .filter((v): v is number => v !== null);
            const normal =
              baseVals.length > 0
                ? Number((baseVals.reduce((a, b) => a + b, 0) / baseVals.length).toFixed(1))
                : null;
            return { label: m.label, value: m.rainfall_mm, normal };
          }),
        }
      : null;

    const sources = [
      { dataset_id: 'gpm_imerg', name: 'NASA GPM IMERG' },
      { dataset_id: 'modis_ndvi', name: 'NASA MODIS NDVI / POWER' },
    ];

    const ai = getGeminiClient();
    const profileObj = PROFILES.find((p) => p.id === params.profileId) ?? PROFILES[1];

    const systemInstruction = `You are AGBÉA Assistant for Togo climate intelligence.
Language: Respond strictly in ${params.language === 'fr' ? 'French' : 'English'}.
User profile: ${profileObj.title_en} (${profileObj.ai_tone_en}).
RULES:
1. Interpret ONLY the NASA observations provided below for ${region.name}.
2. If the user asks about an off-topic subject (e.g., sports, politics, cooking, coding), politely refuse and explain you only answer environmental and climate questions for Togo based on NASA data.
3. Never invent numbers or claim unavailable forecasts.
4. Keep formatting clean prose without markdown hashtags or emojis.

NASA OBSERVATIONS FOR ${region.name}:
Summary (Sep 2025): ${JSON.stringify(summary?.indicators || [])}
Monthly 2025: ${JSON.stringify(monthly2025)}`;

    const aiResp = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: params.message,
      config: { systemInstruction },
    });

    const answer =
      aiResp.text?.trim() ||
      (params.language === 'fr'
        ? 'Les observations NASA ont été consultées pour votre région.'
        : 'NASA observations have been checked for your region.');

    return { answer, sources, chart };
  }

  function recordConversationInSession(
    sessionId: string | undefined,
    threadId: string,
    regionId: RegionId,
    message: string
  ) {
    if (!sessionId) return;
    const session = sessionStore.get(sessionId);
    if (!session) return;
    const existing = session.conversations.find((c) => c.thread_id === threadId);
    const now = new Date().toISOString();
    if (existing) {
      existing.updated_at = now;
      existing.last_message = message;
      existing.region_id = regionId;
    } else {
      session.conversations.unshift({
        thread_id: threadId,
        title: message.slice(0, 48),
        region_id: regionId,
        updated_at: now,
        last_message: message,
      });
    }
  }

  /* M25 POST /chat/stream */
  v1.post('/chat/stream', async (req: Request, res: Response) => {
    const {
      session_id,
      thread_id,
      message,
      region_id = 'savanes',
      profile = 'community',
      language = 'fr',
    } = req.body || {};

    if (!message || typeof message !== 'string') {
      res.status(400).json({ message: 'Message is required.' });
      return;
    }

    const activeThreadId = thread_id || crypto.randomUUID();
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendEvent = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      sendEvent('meta', { thread_id: activeThreadId });
      sendEvent('status', { status: language === 'fr' ? 'Récupération des données…' : 'Fetching data…' });

      const result = await buildGroundedChatReply({
        message,
        regionId: region_id as RegionId,
        profileId: (profile || 'community') as ProfileId,
        language: language as LanguageCode,
      });

      sendEvent('status', { status: language === 'fr' ? 'Rédaction…' : 'Writing…' });

      const words = result.answer.split(' ');
      for (let i = 0; i < words.length; i++) {
        sendEvent('token', { token: (i === 0 ? '' : ' ') + words[i] });
        await new Promise((r) => setTimeout(r, 14));
      }

      if (result.chart) {
        sendEvent('data', result.chart);
      }
      sendEvent('sources', { sources: result.sources });
      recordConversationInSession(session_id, activeThreadId, region_id, message);
      sendEvent('done', { thread_id: activeThreadId });
      res.end();
    } catch (err: any) {
      sendEvent('error', { message: err?.message || 'Stream error' });
      res.end();
    }
  });

  /* M26 POST /chat (fallback) */
  v1.post('/chat', async (req: Request, res: Response) => {
    try {
      const {
        session_id,
        thread_id,
        message,
        region_id = 'savanes',
        profile = 'community',
        language = 'fr',
      } = req.body || {};

      if (!message || typeof message !== 'string') {
        res.status(400).json({ message: 'Message is required.' });
        return;
      }

      const activeThreadId = thread_id || crypto.randomUUID();
      const result = await buildGroundedChatReply({
        message,
        regionId: region_id as RegionId,
        profileId: (profile || 'community') as ProfileId,
        language: language as LanguageCode,
      });

      recordConversationInSession(session_id, activeThreadId, region_id, message);

      res.json({
        thread_id: activeThreadId,
        answer: result.answer,
        sources: result.sources,
        chart: result.chart,
      });
    } catch (err: any) {
      res.status(500).json({ message: err?.message || 'Chat request failed.' });
    }
  });

  app.use('/api/v1', v1);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AGBÉA CLIMAT server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
