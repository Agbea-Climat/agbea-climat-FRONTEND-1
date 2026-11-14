import { TOGO_LOCATIONS } from '../data/togoLocations.ts';
import type { TogoLocation } from '../types/climate.ts';
import { fetchJson } from './api.ts';

export async function fetchLocations(): Promise<TogoLocation[]> {
  try {
    const data = await fetchJson<{ locations: TogoLocation[] }>('/api/locations');
    return data.locations;
  } catch {
    return TOGO_LOCATIONS;
  }
}
