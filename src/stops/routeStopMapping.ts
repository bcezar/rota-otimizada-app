import type { RouteStop } from '../api/types';
import type { Stop } from './StopsContext';

function normalizedAddress(address: string) {
  return address.trim().toLocaleLowerCase('pt-BR');
}

// The backend now returns stop_id. The address queue remains as a fallback
// for older results that were produced before IDs were included.
export function mapRouteStopsToLocalStops(routeStops: RouteStop[], stops: Stop[]) {
  const responseIds = new Set(
    routeStops.map((routeStop) => routeStop.stop_id).filter((id): id is string => !!id),
  );
  const idsByAddress = new Map<string, string[]>();
  for (const stop of stops) {
    if (responseIds.has(stop.id)) continue;
    const key = normalizedAddress(stop.address);
    const ids = idsByAddress.get(key) ?? [];
    ids.push(stop.id);
    idsByAddress.set(key, ids);
  }

  const idsByOrder: Record<number, string> = {};
  for (const routeStop of routeStops.slice().sort((a, b) => a.order - b.order)) {
    if (routeStop.stop_id) {
      idsByOrder[routeStop.order] = routeStop.stop_id;
      continue;
    }
    const ids = idsByAddress.get(normalizedAddress(routeStop.original_address));
    const id = ids?.shift();
    if (id) idsByOrder[routeStop.order] = id;
  }
  return idsByOrder;
}
