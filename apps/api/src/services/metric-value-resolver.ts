import { eq, desc, and } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import { db } from '../db/index.js';
import { wearableMetricas, cognitiveLoadHistory, labPanels, type MetricsCatalogEntry } from '../models/schema.js';

// Resuelve el valor actual de una métrica del catálogo para un cliente,
// según su `source`/`fieldKey`/`aggregation` (spec 21.1). Usa un switch
// explícito en vez de acceso dinámico a columnas por nombre de string —
// exactamente para evitar el riesgo de typo camelCase/snake_case que
// rompería un criterio en silencio (ver comentario en metricsCatalog,
// schema.ts). Extensible: agregar un nuevo fieldKey acá cuando se agregue
// al seed de metrics-catalog.service.ts.

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

async function resolveWearableField(clientId: string, fieldKey: string, aggregation: string): Promise<number | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columnMap: Record<string, PgColumn<any>> = {
    hrvNocturno: wearableMetricas.hrvNocturno,
    fcReposo: wearableMetricas.fcReposo,
    suenoScore: wearableMetricas.suenoScore,
    recoveryScore: wearableMetricas.recoveryScore,
    readinessScore: wearableMetricas.readinessScore,
  };
  const column = columnMap[fieldKey];
  if (!column) return null;

  const limit = aggregation === 'avg_14d' ? 14 : aggregation === 'avg_7d' ? 7 : 1;
  const rows = await db
    .select({ value: column, fecha: wearableMetricas.fecha })
    .from(wearableMetricas)
    .where(eq(wearableMetricas.clientId, clientId))
    .orderBy(desc(wearableMetricas.fecha))
    .limit(limit);

  if (aggregation === 'latest') return rows[0]?.value ?? null;
  return average(rows.map((r) => r.value).filter((v): v is number => v != null));
}

async function resolveCognitiveLoadField(clientId: string, fieldKey: string, aggregation: string): Promise<number | null> {
  if (fieldKey !== 'score') return null;
  const limit = aggregation === 'avg_14d' ? 14 : aggregation === 'avg_7d' ? 7 : 1;
  const rows = await db
    .select({ score: cognitiveLoadHistory.score })
    .from(cognitiveLoadHistory)
    .where(eq(cognitiveLoadHistory.clientId, clientId))
    .orderBy(desc(cognitiveLoadHistory.fecha))
    .limit(limit);

  if (aggregation === 'latest') return rows[0]?.score ?? null;
  return average(rows.map((r) => r.score).filter((v): v is number => v != null));
}

// Panels de laboratorio son esporádicos (0/6/12) — solo tiene sentido
// "latest" (el panel APROBADO más reciente), no un promedio de ventana.
async function resolveLabPanelField(clientId: string, fieldKey: string): Promise<number | null> {
  const rows = await db
    .select({ datos: labPanels.datos })
    .from(labPanels)
    .where(and(eq(labPanels.clientId, clientId), eq(labPanels.status, 'aprobado')))
    .orderBy(desc(labPanels.fecha))
    .limit(1);
  const datos = rows[0]?.datos as Record<string, unknown> | undefined;
  const raw = datos?.[fieldKey];
  return typeof raw === 'number' ? raw : null;
}

export async function resolveMetricValue(clientId: string, metric: MetricsCatalogEntry): Promise<number | null> {
  switch (metric.source) {
    case 'wearable':
      return resolveWearableField(clientId, metric.fieldKey, metric.aggregation);
    case 'cognitive_load':
      return resolveCognitiveLoadField(clientId, metric.fieldKey, metric.aggregation);
    case 'lab_panel':
      return resolveLabPanelField(clientId, metric.fieldKey);
    default:
      return null;
  }
}
