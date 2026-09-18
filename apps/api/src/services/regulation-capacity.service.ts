// Índice propio "Capacidad de regulación" (Fase 7 del rediseño de Stress,
// spec 21.2) — servicio HERMANO de cognitive-load.service.ts, no una
// extensión: fórmula (regulation-capacity-logic.ts) y fuente distintas (solo
// wearable objetivo, sin autorreporte). El job nocturno calcula/guarda; la
// lectura del cliente solo lee lo ya guardado — nunca calcula al vuelo.
import { and, asc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { wearableMetricas, regulationCapacityBaselines, regulationCapacityHistory, clients, type RegulationCapacityBaselineRow } from '../models/schema.js';
import { isModuleAllowedForType } from './type-module-access.service.js';
import { computeRegulationCapacity, BASELINE_MIN_DAYS, type DailyRegulationScore } from './regulation-capacity-logic.js';

const TREND_DAYS = 14;

// Apagado hasta aprobación clínica de los pesos 50/30/20 (ver
// regulation-capacity-logic.ts) — mientras esté en false, getRegulationCapacityOverview
// devuelve enabled:false y el cliente sigue mostrando el placeholder de
// Carga Cognitiva escalado (RegulationCapacityCard.tsx, Fase 1).
export const REGULATION_CAPACITY_ENABLED_IN_PRODUCTION = false;

function average(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v != null);
  if (!nums.length) return null;
  return nums.reduce((s, v) => s + v, 0) / nums.length;
}

// Promedia los primeros BASELINE_MIN_DAYS días de wearable (los más viejos
// disponibles, mismo patrón que getHrvBaseline en cognitive-load.service.ts)
// y lo congela — nunca se recalcula con el tiempo. Con menos de 7 días
// todavía, devuelve null (no hay baseline, no hay índice ese día).
export async function ensureBaseline(clientId: string): Promise<RegulationCapacityBaselineRow | null> {
  const [existing] = await db
    .select()
    .from(regulationCapacityBaselines)
    .where(eq(regulationCapacityBaselines.clientId, clientId))
    .limit(1);
  if (existing) return existing;

  const rows = await db
    .select({ hrvNocturno: wearableMetricas.hrvNocturno, fcReposo: wearableMetricas.fcReposo, suenoScore: wearableMetricas.suenoScore })
    .from(wearableMetricas)
    .where(eq(wearableMetricas.clientId, clientId))
    .orderBy(asc(wearableMetricas.fecha))
    .limit(BASELINE_MIN_DAYS);

  if (rows.length < BASELINE_MIN_DAYS) return null;

  const [baseline] = await db
    .insert(regulationCapacityBaselines)
    .values({
      clientId,
      hrvAvg: average(rows.map((r) => r.hrvNocturno)),
      fcReposoAvg: average(rows.map((r) => r.fcReposo)),
      suenoScoreAvg: average(rows.map((r) => r.suenoScore)),
      daysUsed: rows.length,
    })
    .returning();
  return baseline;
}

// Calcula y guarda el índice de un cliente en una fecha dada. Si falta el
// baseline (menos de 7 días todavía) o el dato de wearable de ese día
// específico, no inserta fila — nunca se rellena con un valor por defecto.
export async function computeAndStoreRegulationCapacityForDate(clientId: string, fecha: string): Promise<void> {
  const baseline = await ensureBaseline(clientId);
  if (!baseline) return;

  const [wearableRow] = await db
    .select({ hrvNocturno: wearableMetricas.hrvNocturno, fcReposo: wearableMetricas.fcReposo, suenoScore: wearableMetricas.suenoScore })
    .from(wearableMetricas)
    .where(and(eq(wearableMetricas.clientId, clientId), eq(wearableMetricas.fecha, fecha)))
    .limit(1);
  if (!wearableRow) return;

  const score = computeRegulationCapacity(
    { hrvAvg: baseline.hrvAvg, fcReposoAvg: baseline.fcReposoAvg, suenoScoreAvg: baseline.suenoScoreAvg },
    { hrv: wearableRow.hrvNocturno, fcReposo: wearableRow.fcReposo, suenoScore: wearableRow.suenoScore }
  );
  if (score == null) return;

  await db
    .insert(regulationCapacityHistory)
    .values({ clientId, fecha, score })
    .onConflictDoUpdate({ target: [regulationCapacityHistory.clientId, regulationCapacityHistory.fecha], set: { score } });
}

// Job nocturno — mismo criterio que runCognitiveLoadNightlyJob: un cliente
// por vez, un fallo individual no interrumpe al resto.
export async function runRegulationCapacityNightlyJob(fecha: string = new Date().toISOString().slice(0, 10)): Promise<void> {
  const rows = await db.select({ id: clients.id, clientType: clients.clientType }).from(clients);
  for (const row of rows) {
    const allowed = await isModuleAllowedForType(row.clientType, 'stress');
    if (!allowed) continue;
    try {
      await computeAndStoreRegulationCapacityForDate(row.id, fecha);
    } catch (e) {
      console.error(`regulation-capacity-cron: falló el cálculo para cliente ${row.id}`, e);
    }
  }
}

export type RegulationCapacityOverview = {
  enabled: boolean;
  today: number | null;
  trend: DailyRegulationScore[];
  baseline: { hrvAvg: number | null; fcReposoAvg: number | null; suenoScoreAvg: number | null; daysUsed: number } | null;
};

// Vista de lectura — nunca calcula al vuelo, solo lee lo que el job nocturno
// ya guardó (mismo criterio que getCognitiveLoadOverview).
export async function getRegulationCapacityOverview(clientId: string): Promise<RegulationCapacityOverview> {
  if (!REGULATION_CAPACITY_ENABLED_IN_PRODUCTION) {
    return { enabled: false, today: null, trend: [], baseline: null };
  }

  const [baselineRow, historyRows] = await Promise.all([
    db.select().from(regulationCapacityBaselines).where(eq(regulationCapacityBaselines.clientId, clientId)).limit(1),
    db.select({ fecha: regulationCapacityHistory.fecha, score: regulationCapacityHistory.score }).from(regulationCapacityHistory).where(eq(regulationCapacityHistory.clientId, clientId)),
  ]);

  const history = historyRows.sort((a, b) => a.fecha.localeCompare(b.fecha));
  const today = new Date().toISOString().slice(0, 10);
  const todayRow = history.find((h) => h.fecha === today);
  const baseline = baselineRow[0];

  return {
    enabled: true,
    today: todayRow?.score ?? null,
    trend: history.slice(-TREND_DAYS),
    baseline: baseline
      ? { hrvAvg: baseline.hrvAvg, fcReposoAvg: baseline.fcReposoAvg, suenoScoreAvg: baseline.suenoScoreAvg, daysUsed: baseline.daysUsed }
      : null,
  };
}
