import { apiFetch } from './client';

export interface AccountDeletionPreview {
  is_pro: boolean;
  refund_amount: number;
  currency: string;
  refund_type: 'full' | 'prorated' | 'none';
  period_end: string | null;
  cancellation_required: boolean;
  deletion_enabled: boolean;
}

export function getAccountDeletionPreview(token: string): Promise<AccountDeletionPreview> {
  return apiFetch<AccountDeletionPreview>('/api/v1/account/deletion/preview', { token });
}

export function requestAccountDeletion(token: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>('/api/v1/account/deletion/request', {
    method: 'POST',
    token,
  });
}
