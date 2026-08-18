import { getSessionToken, PermissionDeniedError } from './api-client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3003';

async function authorizedRequest<T>(path: string, method: string, body?: unknown): Promise<T> {
  const token = getSessionToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 403) {
    const errorBody = await res.json().catch(() => ({}));
    throw new PermissionDeniedError(errorBody.error || 'No tienes acceso a esta sección.');
  }
  return res.json();
}

export type MembershipPrice = {
  id: string;
  clientType: string;
  durationMonths: number;
  amountCents: number;
  currency: string;
};

export async function getMembershipPrices(): Promise<MembershipPrice[]> {
  const body = await authorizedRequest<{ success: boolean; prices: MembershipPrice[]; error?: string }>('/api/membership-prices', 'GET');
  if (!body.success) throw new Error(body.error || 'Error al obtener los precios.');
  return body.prices;
}

export async function updateMembershipPrice(id: string, amountCents: number): Promise<MembershipPrice> {
  const body = await authorizedRequest<{ success: boolean; price: MembershipPrice; error?: string }>(
    `/api/membership-prices/${id}`,
    'PATCH',
    { amount_cents: amountCents }
  );
  if (!body.success) throw new Error(body.error || 'Error al actualizar el precio.');
  return body.price;
}

export type MembershipCheckout = { clientSecret: string; membershipPaymentId: string };

export async function createMembershipCheckout(clientType: string, durationMonths: number): Promise<MembershipCheckout> {
  const body = await authorizedRequest<{ success: boolean; clientSecret: string; membershipPaymentId: string; error?: string }>(
    '/api/account/membership/checkout',
    'POST',
    { client_type: clientType, duration_months: durationMonths }
  );
  if (!body.success) throw new Error(body.error || 'Error al iniciar el pago.');
  return { clientSecret: body.clientSecret, membershipPaymentId: body.membershipPaymentId };
}

export async function getMembershipPaymentStatus(paymentId: string): Promise<{ status: 'pending' | 'succeeded' | 'failed' }> {
  const body = await authorizedRequest<{ success: boolean; status: 'pending' | 'succeeded' | 'failed'; error?: string }>(
    `/api/account/membership/payments/${paymentId}`,
    'GET'
  );
  if (!body.success) throw new Error(body.error || 'Error al consultar el estado del pago.');
  return { status: body.status };
}
