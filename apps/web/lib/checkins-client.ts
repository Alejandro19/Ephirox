import { PermissionDeniedError } from './api-client';
import { clientTz } from './client-tz';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3003';

function withTz(path: string): string {
  return `${path}?tz=${encodeURIComponent(clientTz())}`;
}

async function authorizedRequest<T>(path: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  if (res.status === 403) {
    const errorBody = await res.json().catch(() => ({}));
    throw new PermissionDeniedError(errorBody.error || 'No tienes acceso a este módulo.');
  }
  return res.json();
}

export type CheckinsStatus = {
  dailyDoneToday: boolean;
  weeklyDueThisWeek: boolean;
  periodConfirmationDue: boolean;
  lastResponseAt: string | null;
  dailyStreakDays: number;
  weeklyStreakWeeks: number;
  weeklyRitualWindowOpen: boolean;
};

export type WeeklyReflectionInput = {
  estresCronico: number;
  tecnicasManejoUsadas?: string;
  despertaresNocturnosSemana?: 'Ninguno' | '1-2' | '3+';
};

export type DailyCheckinRecord = {
  id: string;
  fecha: string;
  pulsoAnimo: number;
  createdAt: string;
} | null;

export type WeeklyReflectionRecord = {
  id: string;
  semanaInicio: string;
  estresCronico: number;
  tecnicasManejoUsadas: string | null;
  despertaresNocturnosSemana: string | null;
  createdAt: string;
} | null;

export async function getCheckinsStatus(clientId: string): Promise<CheckinsStatus> {
  const body = await authorizedRequest<{ success: boolean; error?: string } & Partial<CheckinsStatus>>(withTz(`/api/clients/${clientId}/checkins-status`), 'GET');
  if (!body.success) throw new Error(body.error || 'Error al obtener el estado de los rituales.');
  return body as CheckinsStatus;
}

export async function getTodayCheckin(clientId: string): Promise<DailyCheckinRecord> {
  const body = await authorizedRequest<{ success: boolean; checkin: DailyCheckinRecord; error?: string }>(withTz(`/api/clients/${clientId}/daily-checkin/today`), 'GET');
  if (!body.success) throw new Error(body.error || 'Error al obtener el ritual diario.');
  return body.checkin;
}

export async function postDailyCheckin(clientId: string, pulsoAnimo: number): Promise<void> {
  await authorizedRequest(`/api/clients/${clientId}/daily-checkin`, 'POST', { pulsoAnimo, tz: clientTz() });
}

export async function getCurrentWeekReflection(clientId: string): Promise<WeeklyReflectionRecord> {
  const body = await authorizedRequest<{ success: boolean; reflection: WeeklyReflectionRecord; error?: string }>(withTz(`/api/clients/${clientId}/weekly-reflection/current`), 'GET');
  if (!body.success) throw new Error(body.error || 'Error al obtener la reflexión semanal.');
  return body.reflection;
}

export async function postWeeklyReflection(clientId: string, input: WeeklyReflectionInput): Promise<void> {
  await authorizedRequest(`/api/clients/${clientId}/weekly-reflection`, 'POST', { ...input, tz: clientTz() });
}
