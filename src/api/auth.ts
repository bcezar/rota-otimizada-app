import { apiFetch } from './client';
import type { LoginResponse, UserResponse } from './types';

export function login(email: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: { email },
  });
}

export function me(token: string): Promise<UserResponse> {
  return apiFetch<UserResponse>('/api/v1/auth/me', { token });
}
