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

export type AccountDeletionStatusValue =
  | 'none'
  | 'awaiting_confirmation'
  | 'awaiting_authorization'
  | 'refund_processing'
  | 'refund_completed';

export interface AccountDeletionStatus {
  status: AccountDeletionStatusValue;
  refund_amount?: number;
  currency?: string;
  refresh_failed?: boolean;
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

export function getAccountDeletionStatus(token: string): Promise<AccountDeletionStatus> {
  return apiFetch<AccountDeletionStatus>('/api/v1/account/deletion/status', { token });
}
