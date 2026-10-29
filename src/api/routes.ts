import { apiFetch } from './client';
import { getOrCreateAnonymousId } from './guestIdentity';
import type {
  AnonymousOptimizationUsage,
  AutocompleteResponse,
  Coordinates,
  GeocodeResponse,
  ReverseGeocodeResponse,
  RoutePolylineResponse,
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

export function getRoutePolyline(points: Coordinates[]): Promise<RoutePolylineResponse> {
  return apiFetch<RoutePolylineResponse>('/api/v1/routes/polyline', {
    method: 'POST',
    body: { points },
  });
}

export async function getAnonymousOptimizationUsage(): Promise<AnonymousOptimizationUsage> {
  const anonymousId = await getOrCreateAnonymousId();
  return apiFetch<AnonymousOptimizationUsage>('/api/v1/guest/usage', { anonymousId });
}

export async function optimizeRoute(
  addresses: string[],
  token?: string | null,
  origin?: string,
  destination?: string,
  fixedFirst?: string | null,
  fixedLast?: string | null,
  stopIds?: string[],
  preserveOrder = false,
): Promise<RouteResponse> {
  const anonymousId = token ? undefined : await getOrCreateAnonymousId();
  return apiFetch<RouteResponse>('/api/v1/routes/optimize', {
    method: 'POST',
    body: {
      addresses,
      ...(origin ? { origin } : {}),
      ...(destination ? { destination } : {}),
      ...(fixedFirst ? { fixed_first: fixedFirst } : {}),
      ...(fixedLast ? { fixed_last: fixedLast } : {}),
      ...(stopIds ? { stop_ids: stopIds } : {}),
      ...(preserveOrder ? { preserve_order: true } : {}),
    },
    token,
    anonymousId,
  });
}
