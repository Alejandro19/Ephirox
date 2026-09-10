// Check-ins de baja fricción (Fase C, exclusivo Mentoría) — pulso diario y
// reflexión semanal. Nunca se bloquea al cliente por no responder; la
// ausencia de fila para un día/semana ES la "confianza degradada" (no se
// guarda un valor explícito para eso, ver schema.ts).
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { dailyCheckins, weeklyReflections, type DailyCheckin, type WeeklyReflection } from '../models/schema.js';
import { getPersonalInfoByClientId } from './personal-info.service.js';
import { isPeriodConfirmationDue } from './insights/fase-ciclo.js';
import { addDaysISO, todayInTz, weekStartInTz, isWeekendInTz } from './timezone.js';

// "Hoy"/"esta semana" se calculan en la tz del cliente (ver timezone.ts) —
// antes usaban el día calendario UTC puro, lo que hacía que el corte de día
// cayera a las 7pm hora Bogotá en vez de medianoche local: un check-in
// respondido después de esa hora quedaba guardado con `fecha` del día
// siguiente, y al volver a abrir el ritual esa misma noche/madrugada parecía
// "no respondido todavía" aunque el cliente ya lo había llenado unas horas
// antes.

// Mismo patrón que computeConsecutiveDaysOverThreshold (cognitive-load-logic.ts):
// función pura, derivada en lectura, sin contador persistido.
export function computeDailyCheckinStreak(fechas: string[], today: string): number {
  const set = new Set(fechas);
  let streak = 0;
  let cursor = today;
  while (set.has(cursor)) {
    streak += 1;
    cursor = addDaysISO(cursor, -1);
  }
  return streak;
}

// Mismo patrón que el recorrido hacia atrás de computeTrainingStreakState (training.service.ts).
export function computeWeeklyReflectionStreak(semanaInicios: string[], currentWeekStart: string): number {
  const set = new Set(semanaInicios);
  let streak = 0;
  let cursor = currentWeekStart;
  while (set.has(cursor)) {
    streak += 1;
    cursor = addDaysISO(cursor, -7);
  }
  return streak;
}

export async function getTodayCheckin(clientId: string, tz?: string): Promise<DailyCheckin | null> {
  const rows = await db.select().from(dailyCheckins).where(and(eq(dailyCheckins.clientId, clientId), eq(dailyCheckins.fecha, todayInTz(tz)))).limit(1);
  return rows[0] ?? null;
}

export async function upsertDailyCheckin(clientId: string, pulsoAnimo: number, tz?: string): Promise<DailyCheckin> {
  const [row] = await db
    .insert(dailyCheckins)
    .values({ clientId, fecha: todayInTz(tz), pulsoAnimo })
    .onConflictDoUpdate({ target: [dailyCheckins.clientId, dailyCheckins.fecha], set: { pulsoAnimo } })
    .returning();
  return row;
}

export async function getCurrentWeekReflection(clientId: string, tz?: string): Promise<WeeklyReflection | null> {
  const rows = await db.select().from(weeklyReflections).where(and(eq(weeklyReflections.clientId, clientId), eq(weeklyReflections.semanaInicio, weekStartInTz(tz)))).limit(1);
  return rows[0] ?? null;
}

export type UpsertWeeklyReflectionInput = {
  estresCronico: number;
  tecnicasManejoUsadas?: string | null;
  despertaresNocturnosSemana?: string | null;
};

export async function upsertWeeklyReflection(clientId: string, input: UpsertWeeklyReflectionInput, tz?: string): Promise<WeeklyReflection> {
  const semanaInicio = weekStartInTz(tz);
  const values = {
    estresCronico: input.estresCronico,
    tecnicasManejoUsadas: input.tecnicasManejoUsadas ?? null,
    despertaresNocturnosSemana: input.despertaresNocturnosSemana ?? null,
  };
  const [row] = await db
    .insert(weeklyReflections)
    .values({ clientId, semanaInicio, ...values })
    .onConflictDoUpdate({ target: [weeklyReflections.clientId, weeklyReflections.semanaInicio], set: values })
    .returning();
  return row;
}

// engine.ts la usa para refrescar stress_level/coping_techniques/wakeups del
// baseline con el dato más reciente, en vez de la foto fija del onboarding.
export async function getLatestWeeklyReflection(clientId: string): Promise<WeeklyReflection | null> {
  const rows = await db.select().from(weeklyReflections).where(eq(weeklyReflections.clientId, clientId)).orderBy(desc(weeklyReflections.semanaInicio)).limit(1);
  return rows[0] ?? null;
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

export async function getCheckinsStatus(clientId: string, tz?: string): Promise<CheckinsStatus> {
  const today = todayInTz(tz);
  const currentWeekStart = weekStartInTz(tz);

  const [
    todayCheckin,
    currentWeek,
    personalInfo,
    latestDaily,
    latestWeekly,
    allDailyFechas,
    allWeeklyStarts,
  ] = await Promise.all([
    getTodayCheckin(clientId, tz),
    getCurrentWeekReflection(clientId, tz),
    getPersonalInfoByClientId(clientId),
    db.select().from(dailyCheckins).where(eq(dailyCheckins.clientId, clientId)).orderBy(desc(dailyCheckins.fecha)).limit(1),
    getLatestWeeklyReflection(clientId),
    db.select({ fecha: dailyCheckins.fecha }).from(dailyCheckins).where(eq(dailyCheckins.clientId, clientId)),
    db.select({ semanaInicio: weeklyReflections.semanaInicio }).from(weeklyReflections).where(eq(weeklyReflections.clientId, clientId)),
  ]);

  const periodConfirmationDue = isPeriodConfirmationDue({
    hormonalStatus: personalInfo?.hormonalStatus ?? null,
    lastPeriodDate: personalInfo?.lastPeriodDate ?? null,
    cycleLengthDays: personalInfo?.cycleLengthDays ?? null,
  });

  const candidates = [
    latestDaily[0]?.createdAt ?? null,
    latestWeekly?.createdAt ?? null,
  ].filter((d): d is Date => d !== null);
  const lastResponseAt = candidates.length > 0
    ? new Date(Math.max(...candidates.map((d) => d.getTime()))).toISOString()
    : null;

  return {
    dailyDoneToday: !!todayCheckin,
    weeklyDueThisWeek: !currentWeek,
    periodConfirmationDue,
    lastResponseAt,
    dailyStreakDays: computeDailyCheckinStreak(allDailyFechas.map((r) => r.fecha), today),
    weeklyStreakWeeks: computeWeeklyReflectionStreak(allWeeklyStarts.map((r) => r.semanaInicio), currentWeekStart),
    weeklyRitualWindowOpen: isWeekendInTz(tz),
  };
}
