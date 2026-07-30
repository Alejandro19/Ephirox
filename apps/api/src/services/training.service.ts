import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { clients, trainingCompletions, trainingProtectorUses, type TrainingCompletion, type Client } from '../models/schema.js';

export async function updateTrainingDays(clientId: string, trainingDays: number): Promise<Client | null> {
  const [client] = await db.update(clients).set({ trainingDays, updatedAt: new Date() }).where(eq(clients.id, clientId)).returning();
  return client ?? null;
}

export async function listTrainingCompletions(clientId: string): Promise<TrainingCompletion[]> {
  return db.select().from(trainingCompletions).where(eq(trainingCompletions.clientId, clientId));
}

export const DEFAULT_TRAINING_TZ = 'America/Mexico_City';
const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function safeTz(tz: string | undefined): string {
  if (!tz) return DEFAULT_TRAINING_TZ;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TRAINING_TZ;
  }
}

function todayInTz(tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: safeTz(tz), year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function dowInTz(tz: string): number {
  const short = new Intl.DateTimeFormat('en-US', { timeZone: safeTz(tz), weekday: 'short' }).format(new Date());
  return WEEKDAY_INDEX[short];
}

function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

// Semana calendario lunes→domingo, calculada en la tz dada — mismo criterio
// que getWeekStart() en el legacy (index.html).
function weekStartInTz(tz: string): string {
  const today = todayInTz(tz);
  const dow = dowInTz(tz);
  return addDaysISO(today, (dow === 0 ? -6 : 1) - dow);
}

export class NoTrainingDaysError extends Error {
  constructor() {
    super('Este cliente no tiene días de entrenamiento asignados.');
    this.name = 'NoTrainingDaysError';
  }
}

// Versión mínima del confirm-session del legacy (server.js:1305-1334): inserta
// el día que corresponde de la semana, sin racha/protector/frase/achievements
// — esos se agregan en un sub-proyecto futuro que EXTIENDE esta respuesta.
export async function confirmSession(clientId: string, tz: string): Promise<{ alreadyConfirmedToday: boolean; dayNumber: number | null }> {
  const rows = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
  const client = rows[0];
  const trainingDays = client?.trainingDays || 0;
  if (!trainingDays) throw new NoTrainingDaysError();

  const today = todayInTz(tz);
  const weekStart = weekStartInTz(tz);
  const completions = await listTrainingCompletions(clientId);
  const alreadyConfirmedToday = completions.some((c) => c.completedDate === today);
  if (alreadyConfirmedToday) {
    return { alreadyConfirmedToday: true, dayNumber: null };
  }

  const doneThisWeek = new Set(completions.filter((c) => c.completedDate >= weekStart).map((c) => c.dayNumber)).size;
  const dayNumber = Math.min(trainingDays, doneThisWeek + 1);

  const existing = await db
    .select()
    .from(trainingCompletions)
    .where(
      and(
        eq(trainingCompletions.clientId, clientId),
        eq(trainingCompletions.dayNumber, dayNumber),
        eq(trainingCompletions.completedDate, today)
      )
    )
    .limit(1);

  if (existing.length === 0) {
    await db.insert(trainingCompletions).values({ clientId, dayNumber, completedDate: today, source: 'manual' });
  }

  return { alreadyConfirmedToday: false, dayNumber };
}

export type TrainingStreak = {
  streakWeeks: number;
  sessionsDoneThisWeek: number;
  sessionsRequiredThisWeek: number;
  protectorAvailable: boolean;
  protectorUsedThisWeek: boolean;
  atRisk: boolean;
};

// Puerto de computeTrainingStreakState (server.js:1254-1287).
export async function computeTrainingStreakState(clientId: string, trainingDays: number, tz: string): Promise<TrainingStreak> {
  const [completions, protectorUses] = await Promise.all([
    listTrainingCompletions(clientId),
    db.select().from(trainingProtectorUses).where(eq(trainingProtectorUses.clientId, clientId)),
  ]);
  const protectorWeeks = new Set(protectorUses.map((p) => p.weekStart));
  const weekStart = weekStartInTz(tz);
  const sessionsDoneThisWeek = new Set(completions.filter((c) => c.completedDate >= weekStart).map((c) => c.dayNumber)).size;
  const protectorUsedThisWeek = protectorWeeks.has(weekStart);

  let streakWeeks = trainingDays > 0 && (sessionsDoneThisWeek >= trainingDays || protectorUsedThisWeek) ? 1 : 0;
  let cStart = addDaysISO(weekStart, -7);
  for (let i = 0; i < 208 && trainingDays > 0; i++) {
    const cEnd = addDaysISO(cStart, 7);
    const doneInWeek = new Set(completions.filter((c) => c.completedDate >= cStart && c.completedDate < cEnd).map((c) => c.dayNumber)).size;
    if (doneInWeek >= trainingDays || protectorWeeks.has(cStart)) {
      streakWeeks++;
      cStart = addDaysISO(cStart, -7);
    } else break;
  }

  const dow = dowInTz(tz);
  const daysLeftInWeek = dow === 0 ? 1 : 8 - dow;
  const atRisk = trainingDays > 0 && !protectorUsedThisWeek && sessionsDoneThisWeek < trainingDays && daysLeftInWeek <= 2;

  return {
    streakWeeks,
    sessionsDoneThisWeek,
    sessionsRequiredThisWeek: trainingDays,
    protectorAvailable: !protectorUsedThisWeek,
    protectorUsedThisWeek,
    atRisk,
  };
}

export async function getStreak(clientId: string, tz: string): Promise<TrainingStreak> {
  const rows = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
  const trainingDays = rows[0]?.trainingDays || 0;
  return computeTrainingStreakState(clientId, trainingDays, tz);
}
