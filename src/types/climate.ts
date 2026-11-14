export type Language = 'fr' | 'en';

export type ExperienceMode = 'public' | 'scientific';

export type IndicatorId = 'precipitation' | 'vegetation' | 'temperature';

export type SeasonFilter = 'all' | 'rainy' | 'dry';

export type RegionId = 'maritime' | 'plateaux' | 'centrale' | 'kara' | 'savanes';

export interface TogoLocation {
  id: string;
  name: string;
  regionId: RegionId;
  regionName: string;
  lat: number;
  lon: number;
  elevationM: number;
  climateZoneFr: string;
  climateZoneEn: string;
  descriptionFr: string;
  descriptionEn: string;
  cropsFr: string[];
  cropsEn: string[];
  rainySeasonMonths: number[];
}

export interface RegionPolygon {
  regionId: RegionId;
  name: string;
  capitalLocationId: string;
  coordinates: [number, number][];
}

export interface MonthlyObservation {
  yearMonth: string;
  year: number;
  month: number;
  precipitationMmDay: number | null;
  precipitationMmMonth: number | null;
  surfaceTempC: number | null;
  airTempC: number | null;
  soilWetnessTop: number | null;
  soilWetnessRoot: number | null;
  humidityPct: number | null;
  solarIrradianceKwh: number | null;
}

export interface ObservationSummary {
  totalPrecipitationMm: number | null;
  avgMonthlyPrecipitationMm: number | null;
  avgSurfaceTempC: number | null;
  maxSurfaceTempC: number | null;
  minSurfaceTempC: number | null;
  avgAirTempC: number | null;
  avgSoilWetnessTop: number | null;
  avgSoilWetnessRoot: number | null;
  avgHumidityPct: number | null;
  validMonthsCount: number;
  missingMonthsCount: number;
}

export interface DatasetMetadata {
  provider: string;
  datasets: string[];
  spatialResolution: string;
  temporalResolution: string;
  retrievedAt: string;
  limitationsFr: string;
  limitationsEn: string;
}

export interface ObservationDataset {
  location: TogoLocation;
  startYear: number;
  endYear: number;
  series: MonthlyObservation[];
  summary: ObservationSummary;
  metadata: DatasetMetadata;
}

export interface PairedComparisonPoint {
  month: number;
  monthLabelFr: string;
  monthLabelEn: string;
  valueA: number | null;
  valueB: number | null;
  delta: number | null;
}

export interface ComparisonResult {
  location: TogoLocation;
  indicator: IndicatorId;
  yearA: number;
  yearB: number;
  season: SeasonFilter;
  unit: string;
  metricLabelFr: string;
  metricLabelEn: string;
  aggregateMethod: 'sum' | 'mean';
  periodAValue: number | null;
  periodBValue: number | null;
  deltaAbsolute: number | null;
  deltaPercent: number | null;
  validMonthsA: number;
  validMonthsB: number;
  pairedSeries: PairedComparisonPoint[];
  metadata: DatasetMetadata;
  methodologyNoteFr: string;
  methodologyNoteEn: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  locationId?: string;
  error?: boolean;
}
