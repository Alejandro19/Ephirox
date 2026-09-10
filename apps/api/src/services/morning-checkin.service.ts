// Check-in matutino de autorreporte (Stress) — reemplaza la fuente
// inexistente de "Cortisol AM". Un día sin respuesta no tiene fila; nunca
// se rellena con un valor por defecto ni se repite el último (ver
// morning_checkins en schema.ts).
import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { morningCheckins, type MorningCheckin } from '../models/schema.js';
import { computeActivacionMatutina } from './cognitive-load-logic.js';
import { todayInTz } from './timezone.js';

// "Hoy" se calcula en la tz del cliente (ver timezone.ts) — antes usaba el
// día calendario UTC puro, desincronizado del check-in de ánimo diario
// (checkins.service.ts) cerca de la medianoche local. Ver comentario ahí.

export async function getTodayMorningCheckin(clientId: string, tz?: string): Promise<MorningCheckin | null> {
  const rows = await db
    .select()
    .from(morningCheckins)
    .where(and(eq(morningCheckins.clientId, clientId), eq(morningCheckins.fecha, todayInTz(tz))))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertTodayMorningCheckin(
  clientId: string,
  input: { energia: number; tension: number; claridad: number },
  tz?: string
): Promise<MorningCheckin> {
  const activacionMatutina = computeActivacionMatutina(input.energia, input.tension, input.claridad);
  const [row] = await db
    .insert(morningCheckins)
    .values({ clientId, fecha: todayInTz(tz), ...input, activacionMatutina })
    .onConflictDoUpdate({
      target: [morningCheckins.clientId, morningCheckins.fecha],
      set: { ...input, activacionMatutina },
    })
    .returning();
  return row;
}
