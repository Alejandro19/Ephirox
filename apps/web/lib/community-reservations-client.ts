import { getSessionToken } from './api-client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3003';

async function authorizedRequest<T>(path: string, method: string, body?: unknown): Promise<T> {
  const token = getSessionToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

export async function getConfirmedReservations() {
  const body = await authorizedRequest<{
    success: boolean;
    eventReservations: Array<any>;
    therapyReservations: Array<any>;
    error?: string;
  }>('/api/community/reservations', 'GET');
  if (!body.success) throw new Error(body.error || 'Error al obtener reservaciones.');
  return {
    eventReservations: body.eventReservations,
    therapyReservations: body.therapyReservations,
  };
}