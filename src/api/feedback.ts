import { apiFetch } from './client';

export interface RouteFeedbackSummary {
  stop_count: number;
  distance_km: number;
  duration_min: number | null;
  visited_count: number;
  skipped_count: number;
}

export function sendRouteFeedback(
  rating: number,
  comment: string | null,
  routeSummary: RouteFeedbackSummary,
  token?: string | null,
): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>('/api/v1/routes/feedback', {
    method: 'POST',
    token,
    body: {
      client_platform: 'app',
      rating,
      comment,
      route_summary: routeSummary,
    },
  });
}
