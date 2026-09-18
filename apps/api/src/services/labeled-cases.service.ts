import { eq, and, desc, asc, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  labeledCases,
  labeledCaseCheckpoints,
  wearableMetricas,
  cognitiveLoadHistory,
  clients,
  type LabeledCase,
  type LabeledCaseCheckpoint,
  type Mentor,
  type StressProtocol,
  type StressProtocolResource,
} from '../models/schema.js';
import { findMentorById } from './mentors.service.js';
import { findProtocolById, listResourcesForProtocol } from './stress-protocols.service.js';
import type { LabeledCaseInput, LabeledCaseUpdate, LabeledCaseCheckpointUpdate } from '@latribu/shared-types';

const FOLLOWUP_WEEKS = [6, 12];

// Copia congelada de lo que hay disponible hoy (wearable + Carga Cognitiva) —
// no hay todavía panel de baseline curado (Fase 4) ni catálogo de marcadores
// (Fase 5), así que esto es deliberadamente simple: lo último conocido al
// momento de asignar, para que el caso etiquetado sea auditable más adelante
// aunque el shape de las métricas cambie.
async function buildBaselineSnapshot(clientId: string): Promise<Record<string, unknown>> {
  const [latestWearable] = await db
    .select()
    .from(wearableMetricas)
    .where(eq(wearableMetricas.clientId, clientId))
    .orderBy(desc(wearableMetricas.fecha))
    .limit(1);
  const [latestCognitiveLoad] = await db
    .select()
    .from(cognitiveLoadHistory)
    .where(eq(cognitiveLoadHistory.clientId, clientId))
    .orderBy(desc(cognitiveLoadHistory.fecha))
    .limit(1);

  return {
    fecha: latestWearable?.fecha ?? null,
    hrvNocturno: latestWearable?.hrvNocturno ?? null,
    fcReposo: latestWearable?.fcReposo ?? null,
    suenoScore: latestWearable?.suenoScore ?? null,
    recoveryScore: latestWearable?.recoveryScore ?? null,
    cognitiveLoadScore: latestCognitiveLoad?.score ?? null,
  };
}

export async function listActiveCasesForModule(module: string): Promise<LabeledCase[]> {
  return db
    .select()
    .from(labeledCases)
    .where(and(eq(labeledCases.module, module), isNull(labeledCases.outcome)))
    .orderBy(desc(labeledCases.assignedAt));
}

export async function findCaseById(caseId: string): Promise<LabeledCase | undefined> {
  const rows = await db.select().from(labeledCases).where(eq(labeledCases.id, caseId)).limit(1);
  return rows[0];
}

// "Historial de protocolos" (spec 23.3, vista cliente) — casos ya cerrados
// (outcome no nulo) de este cliente, con el nombre del protocolo resuelto
// para mostrar filas simples "nombre + rango de fechas".
export type ClosedCaseSummary = { id: string; protocolName: string; assignedAt: string; closedAt: string | null };

export async function listClosedCasesForClient(clientId: string, module: string): Promise<ClosedCaseSummary[]> {
  const rows = await db
    .select()
    .from(labeledCases)
    .where(and(eq(labeledCases.clientId, clientId), eq(labeledCases.module, module)))
    .orderBy(desc(labeledCases.closedAt));
  const closed = rows.filter((r) => r.outcome != null);

  const summaries: ClosedCaseSummary[] = [];
  for (const row of closed) {
    const protocol = row.protocolId ? await findProtocolById(row.protocolId) : undefined;
    summaries.push({
      id: row.id,
      protocolName: protocol?.name ?? 'Protocolo',
      assignedAt: row.assignedAt as unknown as string,
      closedAt: row.closedAt as unknown as string | null,
    });
  }
  return summaries;
}

// "Asignaciones recientes" (spec 19/23.3, vista admin) — últimos casos
// creados para el módulo, cualquier estado, con cliente/protocolo/mentor ya
// resueltos para el log de una sola línea del mockup ("Camila Ruiz — CEO →
// Recuperación Vagal, Nivel 1 · Caso #1247").
export type RecentCaseLogEntry = {
  id: string;
  caseNumber: number;
  clientName: string;
  clientType: string;
  protocolName: string;
  mentorName: string | null;
  assignedAt: string;
};

export async function listRecentCasesForModule(module: string, limit = 10): Promise<RecentCaseLogEntry[]> {
  const rows = await db
    .select()
    .from(labeledCases)
    .where(eq(labeledCases.module, module))
    .orderBy(desc(labeledCases.assignedAt))
    .limit(limit);

  const entries: RecentCaseLogEntry[] = [];
  for (const row of rows) {
    const [client] = await db.select({ name: clients.name, clientType: clients.clientType }).from(clients).where(eq(clients.id, row.clientId)).limit(1);
    const protocol = row.protocolId ? await findProtocolById(row.protocolId) : undefined;
    const mentor = row.mentorId ? await findMentorById(row.mentorId) : undefined;
    entries.push({
      id: row.id,
      caseNumber: row.caseNumber,
      clientName: client?.name ?? 'Cliente',
      clientType: client?.clientType ?? '',
      protocolName: protocol?.name ?? 'Protocolo',
      mentorName: mentor?.name ?? null,
      assignedAt: row.assignedAt as unknown as string,
    });
  }
  return entries;
}

export async function createCase(clientId: string, input: LabeledCaseInput, assignedBy: string): Promise<LabeledCase> {
  const baselineSnapshot = await buildBaselineSnapshot(clientId);
  const cycleWeeks = input.cycle_weeks ?? 12;
  const [labeledCase] = await db
    .insert(labeledCases)
    .values({
      clientId,
      module: input.module,
      protocolId: input.protocol_id,
      mentorId: input.mentor_id ?? null,
      assignedBy,
      baselineSnapshot,
      cycleWeeks,
    })
    .returning();

  const weeks = FOLLOWUP_WEEKS.filter((w) => w <= cycleWeeks);
  if (weeks.length > 0) {
    await db.insert(labeledCaseCheckpoints).values(weeks.map((weekNumber) => ({ caseId: labeledCase.id, weekNumber })));
  }
  return labeledCase;
}

export async function updateCase(caseId: string, input: LabeledCaseUpdate): Promise<LabeledCase | null> {
  const fields: Record<string, unknown> = { updatedAt: new Date() };
  if (input.mentor_id !== undefined) fields.mentorId = input.mentor_id;
  if (input.outcome !== undefined) {
    fields.outcome = input.outcome;
    fields.closedAt = input.outcome ? new Date() : null;
  }
  const [updated] = await db.update(labeledCases).set(fields).where(eq(labeledCases.id, caseId)).returning();
  return updated ?? null;
}

export async function listCheckpoints(caseId: string): Promise<LabeledCaseCheckpoint[]> {
  return db.select().from(labeledCaseCheckpoints).where(eq(labeledCaseCheckpoints.caseId, caseId)).orderBy(asc(labeledCaseCheckpoints.weekNumber));
}

export async function updateCheckpoint(
  caseId: string,
  weekNumber: number,
  input: LabeledCaseCheckpointUpdate
): Promise<LabeledCaseCheckpoint | null> {
  const fields: Record<string, unknown> = { status: input.status };
  if (input.notes !== undefined) fields.notes = input.notes;
  fields.completedAt = input.status === 'completado' ? new Date() : null;
  const [updated] = await db
    .update(labeledCaseCheckpoints)
    .set(fields)
    .where(and(eq(labeledCaseCheckpoints.caseId, caseId), eq(labeledCaseCheckpoints.weekNumber, weekNumber)))
    .returning();
  return updated ?? null;
}

export type ActiveCaseView = {
  labeledCase: LabeledCase;
  mentor: Mentor | null;
  protocol: StressProtocol | null;
  resources: StressProtocolResource[];
  checkpoints: LabeledCaseCheckpoint[];
};

// Vista denormalizada para la superficie 1 del spec 17 (vista cliente): un
// solo fetch trae caso + mentor + protocolo + recursos + checkpoints, sin
// necesitar endpoints públicos adicionales para leer un protocolo suelto.
// La resolución de `protocol`/`resources` es solo para module='stress' —
// Workout/Nutrition/Sleep no tienen todavía su propia librería (Fase 2).
export async function getActiveCaseForClient(clientId: string, module: string): Promise<ActiveCaseView | null> {
  const rows = await db
    .select()
    .from(labeledCases)
    .where(and(eq(labeledCases.clientId, clientId), eq(labeledCases.module, module), isNull(labeledCases.outcome)))
    .orderBy(desc(labeledCases.assignedAt))
    .limit(1);
  const activeCase = rows[0];
  if (!activeCase) return null;

  const [mentor, checkpoints] = await Promise.all([
    activeCase.mentorId ? findMentorById(activeCase.mentorId) : Promise.resolve(undefined),
    listCheckpoints(activeCase.id),
  ]);

  let protocol: StressProtocol | null = null;
  let resources: StressProtocolResource[] = [];
  if (module === 'stress' && activeCase.protocolId) {
    protocol = (await findProtocolById(activeCase.protocolId)) ?? null;
    if (protocol) resources = await listResourcesForProtocol(protocol.id);
  }

  return { labeledCase: activeCase, mentor: mentor ?? null, protocol, resources, checkpoints };
}
