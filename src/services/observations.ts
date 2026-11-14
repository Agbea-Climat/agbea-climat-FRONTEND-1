import type {
  ComparisonResult,
  IndicatorId,
  ObservationDataset,
  SeasonFilter,
  DatasetMetadata,
} from '../types/climate.ts';
import { fetchJson } from './api.ts';

export interface MapSnapshotPoint {
  locationId: string;
  regionId: string;
  name: string;
  regionName: string;
  lat: number;
  lon: number;
  value: number | null;
  validMonths: number;
}

export interface MapSnapshotResponse {
  year: number;
  month: number | null;
  indicator: IndicatorId;
  snapshots: MapSnapshotPoint[];
  metadata: DatasetMetadata;
}

export async function fetchObservations(
  locationId: string,
  startYear: number,
  endYear: number
): Promise<ObservationDataset> {
  const params = new URLSearchParams({
    locationId,
    startYear: String(startYear),
    endYear: String(endYear),
  });
  return fetchJson<ObservationDataset>(`/api/observations?${params.toString()}`);
}

export async function fetchMapSnapshot(
  indicator: IndicatorId,
  year: number,
  month: number | null
): Promise<MapSnapshotResponse> {
  const params = new URLSearchParams({
    indicator,
    year: String(year),
  });
  if (month !== null) {
    params.set('month', String(month));
  }
  return fetchJson<MapSnapshotResponse>(`/api/map-snapshot?${params.toString()}`);
}

export async function fetchComparison(
  locationId: string,
  indicator: IndicatorId,
  yearA: number,
  yearB: number,
  season: SeasonFilter
): Promise<ComparisonResult> {
  const params = new URLSearchParams({
    locationId,
    indicator,
    yearA: String(yearA),
    yearB: String(yearB),
    season,
  });
  return fetchJson<ComparisonResult>(`/api/compare?${params.toString()}`);
}

export function getCsvExportUrl(
  locationId: string,
  startYear: number,
  endYear: number
): string {
  const params = new URLSearchParams({
    locationId,
    startYear: String(startYear),
    endYear: String(endYear),
  });
  return `/api/observations/csv?${params.toString()}`;
}
