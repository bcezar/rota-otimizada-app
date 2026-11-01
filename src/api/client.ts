import { Platform } from 'react-native';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error('EXPO_PUBLIC_API_BASE_URL não está definida (veja .env)');
}

const resolvedApiBaseUrl =
  __DEV__ && Platform.OS === 'android'
    ? API_BASE_URL.replace(
        /^(https?:\/\/)(localhost|127\.0\.0\.1)(?=[:/]|$)/i,
        (_match, protocol: string) => `${protocol}10.0.2.2`,
      )
    : API_BASE_URL;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public detail: unknown = message,
  ) {
    super(message);
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  token?: string | null;
  anonymousId?: string;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }
  if (options.anonymousId) {
    headers['X-Anonymous-ID'] = options.anonymousId;
  }

  const res = await fetch(`${resolvedApiBaseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail = body?.detail ?? res.statusText;
    const message = typeof detail === 'string' ? detail : res.statusText;
    throw new ApiError(res.status, message, detail);
  }

  return res.json() as Promise<T>;
}
