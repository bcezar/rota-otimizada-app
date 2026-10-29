import { apiFetch } from './client';
import type { LoginResponse, UserResponse } from './types';

export function requestMagicLink(email: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>('/api/v1/auth/magic-request', {
    method: 'POST',
    body: { email, client: 'app' },
  });
}

export function provisionalDevLogin(email: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: { email },
  });
}

export function exchangeMobileCode(code: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/api/v1/auth/mobile-exchange', {
    method: 'POST',
    body: { code },
  });
}

export function me(token: string): Promise<UserResponse> {
  return apiFetch<UserResponse>('/api/v1/auth/me', { token });
}
