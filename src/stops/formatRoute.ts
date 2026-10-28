import type { RouteResponse } from '../api/types';
import type { Stop } from './StopsContext';

export function formatRouteText(result: RouteResponse, stops: Stop[] = []): string {
  const lines = [`Rota otimizada — ${result.total_distance_km.toFixed(1)} km`, ''];
  const stopsByAddress = new Map<string, Stop[]>();
  for (const stop of stops) {
    const matches = stopsByAddress.get(stop.address) ?? [];
    matches.push(stop);
    stopsByAddress.set(stop.address, matches);
  }

  if (result.origin) {
    lines.push(`0. ${result.origin.address} (origem)`);
  }

  for (const stop of result.optimized_route) {
    const localStop = stop.stop_id
      ? stops.find((item) => item.id === stop.stop_id)
      : stopsByAddress.get(stop.original_address)?.shift();
    const label = localStop?.description ? `${localStop.description} — ` : '';
    lines.push(`${stop.order}. ${label}${stop.original_address}`);
  }

  if (result.destination) {
    lines.push(`F. ${result.destination.address} (destino)`);
  }

  lines.push('', 'Rota otimizada com rotaotimizada.com.br');
  return lines.join('\n');
}
