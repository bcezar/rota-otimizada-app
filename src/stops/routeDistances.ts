import type { RouteResponse, RouteStop } from '../api/types';

export function distanceDisplayedOnStop(
  result: RouteResponse,
  routeStops: RouteStop[],
  order: number,
) {
  const sortedStops = routeStops.slice().sort((a, b) => a.order - b.order);
  const currentIndex = sortedStops.findIndex((stop) => stop.order === order);
  if (currentIndex < 0) return null;

  const current = sortedStops[currentIndex];
  const isLastStop = currentIndex === sortedStops.length - 1;

  if (isLastStop && result.destination) {
    // Older saved routes have no dedicated endpoint field, but the last stop's
    // outgoing leg already represents the distance to that destination.
    return result.last_stop_to_destination_distance_km ?? current.leg_distance_km;
  }

  if (currentIndex === 0) {
    if (!result.origin) return null;
    if (result.origin_to_first_stop_distance_km != null) {
      return result.origin_to_first_stop_distance_km;
    }
    // Backward compatibility for saved results from before endpoint legs were
    // returned separately: the remaining total after all stop legs is the
    // origin-to-first-stop segment.
    const returnedStopLegs = sortedStops.reduce((total, stop) => total + (stop.leg_distance_km ?? 0), 0);
    return Math.max(0, result.total_distance_km - returnedStopLegs);
  }

  return sortedStops[currentIndex - 1]?.leg_distance_km ?? null;
}

export function distanceLabelForStop(result: RouteResponse, routeStops: RouteStop[], order: number) {
  const isLastStop = routeStops.length > 0 && order === Math.max(...routeStops.map((stop) => stop.order));
  return isLastStop && result.destination ? 'até o destino final' : 'até esta parada';
}
