import type { RouteResponse } from '../api/types';
import type { Stop } from './StopsContext';

export function formatRouteText(result: RouteResponse, stops: Stop[] = []): string {
  const lines = [`Rota otimizada — ${result.total_distance_km.toFixed(1)} km`, ''];

  if (result.origin) {
    lines.push(`0. ${result.origin.address} (origem)`);
  }

  for (const stop of result.optimized_route) {
    const description = stops.find((s) => s.address === stop.original_address)?.description;
    const label = description ? `${description} — ` : '';
    lines.push(`${stop.order}. ${label}${stop.original_address}`);
  }

  if (result.destination) {
    lines.push(`F. ${result.destination.address} (destino)`);
  }

  lines.push('', 'Rota otimizada com rotaotimizada.com.br');
  return lines.join('\n');
}
