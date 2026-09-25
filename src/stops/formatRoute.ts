import type { RouteResponse } from '../api/types';

export function formatRouteText(result: RouteResponse): string {
  const lines = [`Rota otimizada — ${result.total_distance_km.toFixed(1)} km`, ''];

  for (const stop of result.optimized_route) {
    lines.push(`${stop.order}. ${stop.original_address}`);
  }

  lines.push('', 'Rota otimizada com rotaotimizada.com.br');
  return lines.join('\n');
}
