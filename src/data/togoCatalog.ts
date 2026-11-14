import type {
  DatasetInfo,
  IndicatorInfo,
  RegionGeoJsonFeature,
  RegionId,
  RegionInfo,
  UserProfile,
} from '../types/apiContract.ts';

export interface TogoRegionRecord extends RegionInfo {
  elevationM: number;
  rainyMonths: number[];
  polygon: [number, number][]; // [lon, lat]
}

export const TOGO_REGIONS: TogoRegionRecord[] = [
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

export const TOGO_GEOJSON_FEATURES: RegionGeoJsonFeature[] = TOGO_REGIONS.map((r) => ({
  type: 'Feature',
  properties: { id: r.id, name: r.name, capital: r.capital },
  geometry: { type: 'Polygon', coordinates: [r.polygon] },
}));

export const USER_PROFILES: UserProfile[] = [
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

export const CLIMATE_INDICATORS: IndicatorInfo[] = [
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

export const NASA_DATASETS: DatasetInfo[] = [
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

export function stripRegionRecord(r: TogoRegionRecord): RegionInfo {
  return {
    id: r.id,
    name: r.name,
    capital: r.capital,
    centroid: r.centroid,
    climate_zone_en: r.climate_zone_en,
    climate_zone_fr: r.climate_zone_fr,
    crops_en: r.crops_en,
    crops_fr: r.crops_fr,
  };
}

export function pointInRegionPolygon(lon: number, lat: number, polygon: [number, number][]): boolean {
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

export function findRegionById(id: string): TogoRegionRecord | undefined {
  return TOGO_REGIONS.find((r) => r.id === (id as RegionId));
}
