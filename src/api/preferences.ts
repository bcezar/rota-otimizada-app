import { apiFetch } from './client';
import type { UpdatePreferencesRequest, UserPreferencesResponse } from './types';

export function getPreferences(token: string): Promise<UserPreferencesResponse> {
  return apiFetch<UserPreferencesResponse>('/api/v1/users/preferences', { token });
}

export function updatePreferences(
  token: string,
  fields: UpdatePreferencesRequest,
): Promise<UserPreferencesResponse> {
  return apiFetch<UserPreferencesResponse>('/api/v1/users/preferences', {
    method: 'PUT',
    token,
    body: fields,
  });
}
