import { eq, asc, and, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { assignmentCriteria, clients, metricsCatalog, stressProtocols, type AssignmentCriteria } from '../models/schema.js';
import { evaluateCondition } from './criteria-evaluation-engine.js';
import { resolveMetricValue } from './metric-value-resolver.js';
import { findMetricById } from './metrics-catalog.service.js';
import type { AssignmentCriteriaInput, ConditionNode } from '@latribu/shared-types';

// "cuántos protocolos lo usan actualmente" (spec 22/23.3, librería de
// criterios en Administración) — por ahora solo cuenta stress_protocols
// (el único módulo con su propia librería de protocolos todavía, ver Fase
// 2 del plan); cuando Workout/Nutrition/Sleep tengan la suya, sumar sus
// conteos acá.
export type AssignmentCriteriaWithCount = AssignmentCriteria & { protocolCount: number };

export async function listCriteria(): Promise<AssignmentCriteriaWithCount[]> {
  const [rows, protocolRows] = await Promise.all([
    db.select().from(assignmentCriteria).orderBy(asc(assignmentCriteria.name)),
    db.select({ criteriaId: stressProtocols.criteriaId }).from(stressProtocols),
  ]);
  const countByCriteria = new Map<string, number>();
  for (const p of protocolRows) {
    if (!p.criteriaId) continue;
    countByCriteria.set(p.criteriaId, (countByCriteria.get(p.criteriaId) ?? 0) + 1);
  }
  return rows.map((r) => ({ ...r, protocolCount: countByCriteria.get(r.id) ?? 0 }));
}

export async function findCriteriaById(criteriaId: string): Promise<AssignmentCriteria | undefined> {
  const rows = await db.select().from(assignmentCriteria).where(eq(assignmentCriteria.id, criteriaId)).limit(1);
  return rows[0];
}

export async function createCriteria(input: AssignmentCriteriaInput, createdBy: string): Promise<AssignmentCriteria> {
  const [criteria] = await db
    .insert(assignmentCriteria)
    .values({
      name: input.name,
      conditions: input.conditions,
      applicableModules: input.applicable_modules,
      status: input.status ?? 'borrador',
      createdBy,
    })
    .returning();
  return criteria;
}

// Editar un criterio en borrador solo actualiza la fila (todavía no está en
// uso por ningún protocolo). Publicar (ver publishNewVersion) es lo que
// versiona — ese es el punto en el que un labeled_cases.baselineSnapshot
// histórico necesita que el criterio vigente al momento no cambie debajo.
export async function updateDraftCriteria(criteriaId: string, input: Partial<AssignmentCriteriaInput>): Promise<AssignmentCriteria | null> {
  const fields: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name !== undefined) fields.name = input.name;
  if (input.conditions !== undefined) fields.conditions = input.conditions;
  if (input.applicable_modules !== undefined) fields.applicableModules = input.applicable_modules;
  const [updated] = await db
    .update(assignmentCriteria)
    .set(fields)
    .where(and(eq(assignmentCriteria.id, criteriaId), eq(assignmentCriteria.status, 'borrador')))
    .returning();
  return updated ?? null;
}

// Publica: si el criterio actual está en borrador, lo pasa a publicado
// directo. Si ya estaba publicado y se está "editando" (el caller manda
// datos nuevos), archiva la versión vieja y crea una fila nueva version+1 —
// nunca muta un criterio publicado en su lugar.
export async function publishCriteria(criteriaId: string, input?: Partial<AssignmentCriteriaInput>): Promise<AssignmentCriteria | null> {
  const current = await findCriteriaById(criteriaId);
  if (!current) return null;

  if (current.status !== 'publicado' || !input) {
    const [updated] = await db
      .update(assignmentCriteria)
      .set({
        status: 'publicado',
        updatedAt: new Date(),
        ...(input?.name !== undefined ? { name: input.name } : {}),
        ...(input?.conditions !== undefined ? { conditions: input.conditions } : {}),
        ...(input?.applicable_modules !== undefined ? { applicableModules: input.applicable_modules } : {}),
      })
      .where(eq(assignmentCriteria.id, criteriaId))
      .returning();
    return updated ?? null;
  }

  await db.update(assignmentCriteria).set({ status: 'archivado', updatedAt: new Date() }).where(eq(assignmentCriteria.id, criteriaId));
  const [newVersion] = await db
    .insert(assignmentCriteria)
    .values({
      name: input.name ?? current.name,
      conditions: input.conditions ?? current.conditions,
      applicableModules: input.applicable_modules ?? current.applicableModules,
      status: 'publicado',
      version: current.version + 1,
      createdBy: current.createdBy,
    })
    .returning();
  return newVersion;
}

export async function deleteCriteria(criteriaId: string): Promise<void> {
  await db.delete(assignmentCriteria).where(eq(assignmentCriteria.id, criteriaId));
}

// Resuelve cada metric_id del árbol de condiciones a su valor actual para
// este cliente, y evalúa. Devuelve también los valores resueltos, para que
// la UI pueda mostrar un preview en vivo de por qué matcheó o no.
export async function evaluateCriteriaForClient(
  criteriaId: string,
  clientId: string
): Promise<{ matches: boolean; resolvedValues: Record<string, number | null> } | null> {
  const criteria = await findCriteriaById(criteriaId);
  if (!criteria) return null;

  const metricIds = collectMetricIds(criteria.conditions as ConditionNode);
  const resolvedValues: Record<string, number | null> = {};
  for (const metricId of metricIds) {
    const metric = await findMetricById(metricId);
    resolvedValues[metricId] = metric ? await resolveMetricValue(clientId, metric) : null;
  }

  const matches = evaluateCondition(criteria.conditions as ConditionNode, resolvedValues);
  return { matches, resolvedValues };
}

function collectMetricIds(node: ConditionNode): string[] {
  if ('metric_id' in node) return [node.metric_id];
  return node.rules.flatMap(collectMetricIds);
}

// Clientes activos que cumplen el criterio — usado por la Fase 4 para
// preseleccionar el checklist de "Asignar a clientes activos". A diferencia
// de evaluateCriteriaForClient, resuelve el criterio y el catálogo UNA sola
// vez (no por cliente) — con decenas/cientos de clientes activos, repetir
// esos selects por cada uno sería un N+1 real.
export async function findMatchingClients(criteriaId: string): Promise<Array<{ id: string; name: string; clientType: string }>> {
  const criteria = await findCriteriaById(criteriaId);
  if (!criteria) return [];
  const conditions = criteria.conditions as ConditionNode;
  const metricIds = collectMetricIds(conditions);
  const metrics = await Promise.all(metricIds.map((id) => findMetricById(id)));
  const metricById = new Map(metrics.filter((m): m is NonNullable<typeof m> => !!m).map((m) => [m.id, m]));

  const activeClients = await db
    .select({ id: clients.id, name: clients.name, clientType: clients.clientType })
    .from(clients)
    .where(eq(clients.status, 'active'));

  const matches: Array<{ id: string; name: string; clientType: string }> = [];
  for (const client of activeClients) {
    const resolvedValues: Record<string, number | null> = {};
    for (const metricId of metricIds) {
      const metric = metricById.get(metricId);
      resolvedValues[metricId] = metric ? await resolveMetricValue(client.id, metric) : null;
    }
    if (evaluateCondition(conditions, resolvedValues)) matches.push(client);
  }
  return matches;
}

export async function listMetricsByIds(metricIds: string[]): Promise<Array<{ id: string; name: string }>> {
  if (metricIds.length === 0) return [];
  return db.select({ id: metricsCatalog.id, name: metricsCatalog.name }).from(metricsCatalog).where(inArray(metricsCatalog.id, metricIds));
}
