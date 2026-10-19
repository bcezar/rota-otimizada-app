import { apiFetch } from './client';
import type { BillingAccountResponse, CheckoutResponse } from './types';

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

export function cancelSubscription(token: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>('/api/v1/billing/subscription', {
    method: 'DELETE',
    token,
  });
}
