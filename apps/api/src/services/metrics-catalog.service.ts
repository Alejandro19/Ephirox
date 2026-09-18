import { eq, asc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { metricsCatalog, assignmentCriteria, type MetricsCatalogEntry } from '../models/schema.js';
import type { MetricsCatalogUpdate, ConditionNode } from '@latribu/shared-types';

// Seed controlado por código (ver comentario de metricsCatalog en schema.ts)
// — cada fieldKey está verificado contra el schema Drizzle real (no
// inventado a mano) antes de agregarse acá. "Reuniones/semana" del mockup
// de referencia NO se incluye: no existe ningún campo real en el schema que
// la respalde todavía, y sembrar un marcador sin fuente de datos real
// rompería el motor en silencio (siempre null).
type SeedMetric = {
  name: string;
  unit: string | null;
  source: 'wearable' | 'lab_panel' | 'cognitive_load' | 'morning_checkin';
  fieldKey: string;
  aggregation: 'latest' | 'avg_7d' | 'avg_14d';
  referenceRange: { min?: number; max?: number } | null;
};

export const SEED_METRICS: SeedMetric[] = [
  { name: 'HRV basal (RMSSD)', unit: 'ms', source: 'wearable', fieldKey: 'hrvNocturno', aggregation: 'latest', referenceRange: { min: 40, max: 60 } },
  { name: 'FC en reposo', unit: 'bpm', source: 'wearable', fieldKey: 'fcReposo', aggregation: 'latest', referenceRange: { min: 60, max: 70 } },
  { name: 'Sleep score', unit: '/100', source: 'wearable', fieldKey: 'suenoScore', aggregation: 'latest', referenceRange: null },
  { name: 'Recovery score', unit: '/100', source: 'wearable', fieldKey: 'recoveryScore', aggregation: 'latest', referenceRange: null },
  // Biomarcador real de laboratorio (no confundir con el módulo Stress) —
  // mismo rango ya validado en insights/marker-ranges.ts (6-18 µg/dL).
  { name: 'Cortisol PM', unit: 'µg/dL', source: 'lab_panel', fieldKey: 'cortisol', aggregation: 'latest', referenceRange: { min: 6, max: 18 } },
  { name: 'Carga Cognitiva', unit: '/10', source: 'cognitive_load', fieldKey: 'score', aggregation: 'latest', referenceRange: null },
];

export async function ensureSeeded(): Promise<void> {
  const existing = await db.select({ fieldKey: metricsCatalog.fieldKey, source: metricsCatalog.source }).from(metricsCatalog);
  const existingKeys = new Set(existing.map((e) => `${e.source}:${e.fieldKey}`));
  const missing = SEED_METRICS.filter((m) => !existingKeys.has(`${m.source}:${m.fieldKey}`));
  if (missing.length === 0) return;
  await db.insert(metricsCatalog).values(
    missing.map((m) => ({
      name: m.name,
      unit: m.unit,
      source: m.source,
      fieldKey: m.fieldKey,
      aggregation: m.aggregation,
      referenceRange: m.referenceRange,
    }))
  );
}

export async function listMetrics(): Promise<MetricsCatalogEntry[]> {
  await ensureSeeded();
  return db.select().from(metricsCatalog).orderBy(asc(metricsCatalog.name));
}

export async function findMetricById(metricId: string): Promise<MetricsCatalogEntry | undefined> {
  const rows = await db.select().from(metricsCatalog).where(eq(metricsCatalog.id, metricId)).limit(1);
  return rows[0];
}

export async function updateMetric(metricId: string, input: MetricsCatalogUpdate): Promise<MetricsCatalogEntry | null> {
  const fields: Record<string, unknown> = {};
  if (input.active !== undefined) fields.active = input.active;
  if (input.reference_range !== undefined) fields.referenceRange = input.reference_range;
  const [updated] = await db.update(metricsCatalog).set(fields).where(eq(metricsCatalog.id, metricId)).returning();
  return updated ?? null;
}

function collectMetricIds(node: ConditionNode): string[] {
  if ('metric_id' in node) return [node.metric_id];
  return node.rules.flatMap(collectMetricIds);
}

// "Módulos donde se usa" cada marcador (spec 22/23.3, catálogo de
// marcadores) — derivado, no una columna propia: se calcula recorriendo qué
// criterios de asignación referencian cada métrica en su árbol de
// condiciones, y se unen los módulos aplicables de esos criterios. Un mismo
// marcador queda disponible para cualquier módulo apenas un criterio de ese
// módulo lo usa — no hace falta declararlo a mano por marcador.
export type MetricsCatalogEntryWithModules = MetricsCatalogEntry & { modulesInUse: string[] };

export async function listMetricsWithModules(): Promise<MetricsCatalogEntryWithModules[]> {
  const [metrics, criteria] = await Promise.all([
    listMetrics(),
    db.select({ conditions: assignmentCriteria.conditions, applicableModules: assignmentCriteria.applicableModules }).from(assignmentCriteria),
  ]);

  const modulesByMetricId = new Map<string, Set<string>>();
  for (const c of criteria) {
    const metricIds = collectMetricIds(c.conditions as ConditionNode);
    for (const metricId of metricIds) {
      const set = modulesByMetricId.get(metricId) ?? new Set<string>();
      for (const m of c.applicableModules) set.add(m);
      modulesByMetricId.set(metricId, set);
    }
  }

  return metrics.map((m) => ({ ...m, modulesInUse: Array.from(modulesByMetricId.get(m.id) ?? []) }));
}
