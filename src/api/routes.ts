import { apiFetch } from './client';
import type {
  AutocompleteResponse,
  Coordinates,
  GeocodeResponse,
  ReverseGeocodeResponse,
  RouteResponse,
} from './types';

function locationHintParams(locationHint?: Coordinates | null): string {
  if (!locationHint) return '';
  return `&lat=${locationHint.lat}&lng=${locationHint.lng}`;
}

export function autocomplete(
  q: string,
  locationHint?: Coordinates | null,
): Promise<AutocompleteResponse> {
  return apiFetch<AutocompleteResponse>(
    `/api/v1/autocomplete?q=${encodeURIComponent(q)}${locationHintParams(locationHint)}`,
  );
}

export function geocode(q: string, locationHint?: Coordinates | null): Promise<GeocodeResponse> {
  return apiFetch<GeocodeResponse>(
    `/api/v1/geocode?q=${encodeURIComponent(q)}${locationHintParams(locationHint)}`,
  );
}

export function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResponse> {
  return apiFetch<ReverseGeocodeResponse>(`/api/v1/reverse?lat=${lat}&lng=${lng}`);
}

export function optimizeRoute(addresses: string[], token?: string | null): Promise<RouteResponse> {
  return apiFetch<RouteResponse>('/api/v1/routes/optimize', {
    method: 'POST',
    body: { addresses },
    token,
  });
}
