import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { clients, trainingCompletions, type TrainingCompletion, type Client } from '../models/schema.js';

export async function updateTrainingDays(clientId: string, trainingDays: number): Promise<Client | null> {
  const [client] = await db.update(clients).set({ trainingDays, updatedAt: new Date() }).where(eq(clients.id, clientId)).returning();
  return client ?? null;
}

export async function listTrainingCompletions(clientId: string): Promise<TrainingCompletion[]> {
  return db.select().from(trainingCompletions).where(eq(trainingCompletions.clientId, clientId));
}

function todayInTz(tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

// Semana calendario lunes→domingo, calculada en la tz dada — mismo criterio
// que getWeekStart() en el legacy (index.html).
function weekStartInTz(tz: string): string {
  const today = todayInTz(tz);
  const d = new Date(`${today}T00:00:00`);
  const day = d.getDay();
  d.setDate(d.getDate() + ((day === 0 ? -6 : 1) - day));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
