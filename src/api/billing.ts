import { apiFetch } from './client';
import type { BillingAccountResponse, CheckoutResponse } from './types';

export type SubscriptionCancellationReason =
  | 'stop_limit'
  | 'price'
  | 'not_using'
  | 'missing_features'
  | 'technical_issues'
  | 'alternative'
  | 'other';

interface CheckoutParams {
  cpfCnpj: string;
  billingType: 'PIX' | 'CREDIT_CARD';
  couponCode?: string;
}

export function getAccount(token: string): Promise<BillingAccountResponse> {
  return apiFetch<BillingAccountResponse>('/api/v1/billing/account', { token });
}

export function checkout(token: string, params: CheckoutParams): Promise<CheckoutResponse> {
  return apiFetch<CheckoutResponse>('/api/v1/billing/checkout', {
    method: 'POST',
    token,
    body: {
      cpf_cnpj: params.cpfCnpj,
      billing_type: params.billingType,
      ...(params.couponCode ? { coupon_code: params.couponCode } : {}),
    },
  });
}

export function cancelSubscription(
  token: string,
  reasonCodes: SubscriptionCancellationReason[] = [],
): Promise<{ ok: boolean; pro_expires_at: string }> {
  return apiFetch<{ ok: boolean; pro_expires_at: string }>('/api/v1/billing/subscription', {
    method: 'DELETE',
    token,
    body: { reason_codes: reasonCodes },
  });
}
