import { apiFetch } from './client';
import type { ContactResponse } from './types';

export function sendContact(
  email: string,
  message: string,
  token?: string | null,
): Promise<ContactResponse> {
  return apiFetch<ContactResponse>('/api/v1/contact', {
    method: 'POST',
    token,
    body: { email, message },
  });
}
