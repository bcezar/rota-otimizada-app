import type { RouteResponse, RouteStop } from '../api/types';

export function distanceDisplayedOnStop(
  result: RouteResponse,
  routeStops: RouteStop[],
  order: number,
) {
  const sortedStops = routeStops.slice().sort((a, b) => a.order - b.order);
  const currentIndex = sortedStops.findIndex((stop) => stop.order === order);
  if (currentIndex < 0) return null;

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

export function durationDisplayedOnStop(
  result: RouteResponse,
  routeStops: RouteStop[],
  order: number,
) {
  const sortedStops = routeStops.slice().sort((a, b) => a.order - b.order);
  const currentIndex = sortedStops.findIndex((stop) => stop.order === order);
  if (currentIndex < 0) return null;

  if (currentIndex === 0) {
    if (!result.origin) return null;
    if (result.origin_to_first_stop_duration_min != null) {
      return result.origin_to_first_stop_duration_min;
    }
    // Backward compatibility for routes saved before the origin duration was returned separately.
    const returnedStopLegs = sortedStops.reduce((total, stop) => total + (stop.leg_duration_min ?? 0), 0);
    return result.total_duration_min != null
      ? Math.max(0, result.total_duration_min - returnedStopLegs)
      : null;
  }

  return sortedStops[currentIndex - 1]?.leg_duration_min ?? null;
}

export function distanceToDestinationDisplayed(result: RouteResponse, routeStops: RouteStop[]) {
  const sortedStops = routeStops.slice().sort((a, b) => a.order - b.order);
  if (!result.destination || sortedStops.length === 0) return null;
  return result.last_stop_to_destination_distance_km
    ?? sortedStops[sortedStops.length - 1].leg_distance_km
    ?? null;
}

export function durationToDestinationDisplayed(result: RouteResponse, routeStops: RouteStop[]) {
  const sortedStops = routeStops.slice().sort((a, b) => a.order - b.order);
  if (!result.destination || sortedStops.length === 0) return null;
  return sortedStops[sortedStops.length - 1].leg_duration_min;
}

export function formatRouteDuration(minutes: number) {
  if (!minutes) return null;
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
}
