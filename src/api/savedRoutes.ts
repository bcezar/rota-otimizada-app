import { apiFetch } from './client';
import type { RouteResponse, SavedRoute, SavedRouteInputs, SavedRouteStopDetails } from './types';

export async function saveRoute(
  name: string,
  result: RouteResponse,
  inputs: SavedRouteInputs,
  stopDetails: SavedRouteStopDetails[],
  destinationMode: SavedRouteInputs['destination_mode'],
  token: string,
): Promise<{ code: string; path: string }> {
  return apiFetch<{ code: string; path: string }>('/api/v1/routes/save', {
    method: 'POST',
    token,
    body: {
      name,
      result,
      inputs: {
        addresses: inputs.addresses,
        ...(inputs.origin ? { origin: inputs.origin } : {}),
        ...(inputs.destination ? { destination: inputs.destination } : {}),
        ...(inputs.fixed_first ? { fixed_first: inputs.fixed_first } : {}),
        ...(inputs.fixed_last ? { fixed_last: inputs.fixed_last } : {}),
        ...(inputs.stop_ids ? { stop_ids: inputs.stop_ids } : {}),
        ...(inputs.preserve_order ? { preserve_order: true } : {}),
      },
      stop_details: stopDetails,
      destination_mode: destinationMode,
    },
  });
}

export async function listSavedRoutes(token: string): Promise<SavedRoute[]> {
  const response = await apiFetch<{ routes: SavedRoute[] }>('/api/v1/routes/my-routes', { token });
  return response.routes;
}

export function deleteSavedRoute(code: string, token: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/api/v1/routes/saved/${encodeURIComponent(code)}`, {
    method: 'DELETE',
    token,
  });
}
