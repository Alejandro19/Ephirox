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
import { findCriteriaById } from './assignment-criteria.service.js';
import { getDataResearchConsentStatus } from './legal-acceptance.service.js';
import type { LabeledCaseInput, LabeledCaseUpdate, LabeledCaseCheckpointUpdate, OutcomeRating } from '@latribu/shared-types';

const FOLLOWUP_WEEKS = [6, 12];
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Mejora (leve o significativa) — lo único que cuenta como "mejora" para la
// efectividad por protocolo (punto 24). Empeora/sin cambio no cuentan.
const IMPROVEMENT_RATINGS: OutcomeRating[] = ['mejora_significativa', 'mejora_leve'];

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
  // Sin cycle_weeks explícito, se hereda el default configurado en el
  // protocolo (stress_protocols.default_cycle_weeks) en vez de un 12
  // fijo — así "Duración del ciclo" del protocolo realmente aplica al
  // asignar, no solo se muestra en el form.
  const protocol = await findProtocolById(input.protocol_id);
  const cycleWeeks = input.cycle_weeks ?? protocol?.defaultCycleWeeks ?? 12;
  const [labeledCase] = await db
    .insert(labeledCases)
    .values({
      clientId,
      module: input.module,
      protocolId: input.protocol_id,
      // Congelado al momento de asignar (punto 25) — si la regla se
      // reversiona después, este caso sigue apuntando a la que realmente
      // lo activó.
      criteriaId: protocol?.criteriaId ?? null,
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
  if (input.valoracion !== undefined) fields.valoracion = input.valoracion;
  fields.completedAt = input.status === 'completado' ? new Date() : null;
  const [updated] = await db
    .update(labeledCaseCheckpoints)
    .set(fields)
    .where(and(eq(labeledCaseCheckpoints.caseId, caseId), eq(labeledCaseCheckpoints.weekNumber, weekNumber)))
    .returning();
  if (!updated) return null;

  // Registrar el ÚLTIMO checkpoint del caso fija sola la etiqueta final con
  // su valoración (punto 25.3: "se define al completar el último
  // checkpoint") — nunca queda a criterio manual aparte.
  if (updated.status === 'completado' && updated.valoracion) {
    const allCheckpoints = await listCheckpoints(caseId);
    const lastWeek = Math.max(...allCheckpoints.map((c) => c.weekNumber));
    if (weekNumber === lastWeek) {
      await db.update(labeledCases).set({ outcome: updated.valoracion, closedAt: new Date(), updatedAt: new Date() }).where(eq(labeledCases.id, caseId));
    }
  }
  return updated;
}

function checkpointDueDate(assignedAt: Date, weekNumber: number): Date {
  return new Date(assignedAt.getTime() + weekNumber * 7 * MS_PER_DAY);
}

// "Vencido" (punto 24) es un estado DERIVADO, no guardado: un checkpoint
// pendiente cuya fecha objetivo ya pasó. Se recalcula siempre contra "hoy",
// nunca se congela — si no se registra, sigue vencido indefinidamente.
function isCheckpointOverdue(assignedAt: Date, checkpoint: LabeledCaseCheckpoint): boolean {
  return checkpoint.status === 'pendiente' && checkpointDueDate(assignedAt, checkpoint.weekNumber).getTime() < Date.now();
}

export type CaseStatus = 'activo' | 'vencido' | 'completado';

function computeCaseStatus(caseRow: LabeledCase, checkpoints: LabeledCaseCheckpoint[]): CaseStatus {
  if (caseRow.outcome != null) return 'completado';
  const assignedAt = caseRow.assignedAt ? new Date(caseRow.assignedAt as unknown as string) : new Date();
  return checkpoints.some((c) => isCheckpointOverdue(assignedAt, c)) ? 'vencido' : 'activo';
}

// Regla de calidad del dataset (punto 24/25.4): un caso solo entra al
// dataset agregado (efectividad, export CSV) si el cliente autorizó el uso
// de sus datos para investigación Y el caso no tiene ningún checkpoint
// vencido sin registrar — así el dataset nunca se arma con huecos
// silenciosos ni sin la autorización específica.
async function isCaseDatasetEligible(caseRow: LabeledCase, checkpoints: LabeledCaseCheckpoint[]): Promise<boolean> {
  const consent = await getDataResearchConsentStatus(caseRow.clientId);
  if (consent !== true) return false;
  const assignedAt = caseRow.assignedAt ? new Date(caseRow.assignedAt as unknown as string) : new Date();
  return !checkpoints.some((c) => isCheckpointOverdue(assignedAt, c));
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

// ---------------------------------------------------------------------
// Panel "Casos etiquetados" (punto 24) — vista admin con detalle completo.
// ---------------------------------------------------------------------

export type CaseCheckpointView = LabeledCaseCheckpoint & { dueDate: string; overdue: boolean };

export type CaseListRow = {
  id: string;
  caseNumber: number;
  clientId: string;
  clientName: string;
  clientType: string;
  protocolName: string;
  status: CaseStatus;
  currentWeek: number;
  cycleWeeks: number;
  nextCheckpoint: CaseCheckpointView | null;
  outcome: string | null;
};

function currentWeekOf(assignedAt: Date, cycleWeeks: number): number {
  const elapsedWeeks = Math.floor((Date.now() - assignedAt.getTime()) / (7 * MS_PER_DAY));
  return Math.min(cycleWeeks, Math.max(1, elapsedWeeks + 1));
}

function toCheckpointViews(assignedAt: Date, checkpoints: LabeledCaseCheckpoint[]): CaseCheckpointView[] {
  return checkpoints.map((c) => ({
    ...c,
    dueDate: checkpointDueDate(assignedAt, c.weekNumber).toISOString(),
    overdue: isCheckpointOverdue(assignedAt, c),
  }));
}

// Tabla de "Casos Etiquetados" del admin — un fetch por caso es aceptable acá
// (no hay paginación todavía, el volumen esperado por módulo es bajo).
export async function listCasesForModule(
  module: string,
  filters: { search?: string; status?: CaseStatus; protocolId?: string } = {}
): Promise<CaseListRow[]> {
  const rows = await db.select().from(labeledCases).where(eq(labeledCases.module, module)).orderBy(desc(labeledCases.assignedAt));

  const result: CaseListRow[] = [];
  for (const row of rows) {
    if (filters.protocolId && row.protocolId !== filters.protocolId) continue;
    const [client] = await db.select({ name: clients.name, clientType: clients.clientType }).from(clients).where(eq(clients.id, row.clientId)).limit(1);
    const protocol = row.protocolId ? await findProtocolById(row.protocolId) : undefined;
    const checkpoints = await listCheckpoints(row.id);
    const assignedAt = row.assignedAt ? new Date(row.assignedAt as unknown as string) : new Date();
    const status = computeCaseStatus(row, checkpoints);
    if (filters.status && status !== filters.status) continue;
    const clientName = client?.name ?? 'Cliente';
    const protocolName = protocol?.name ?? 'Protocolo';
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!clientName.toLowerCase().includes(q) && !protocolName.toLowerCase().includes(q)) continue;
    }
    const checkpointViews = toCheckpointViews(assignedAt, checkpoints);
    const nextCheckpoint = checkpointViews.find((c) => c.status === 'pendiente') ?? null;
    result.push({
      id: row.id,
      caseNumber: row.caseNumber,
      clientId: row.clientId,
      clientName,
      clientType: client?.clientType ?? '',
      protocolName,
      status,
      currentWeek: currentWeekOf(assignedAt, row.cycleWeeks),
      cycleWeeks: row.cycleWeeks,
      nextCheckpoint,
      outcome: row.outcome,
    });
  }
  return result;
}

export type CaseDetailView = {
  labeledCase: LabeledCase;
  clientName: string;
  clientType: string;
  mentor: Mentor | null;
  protocolName: string | null;
  criteriaName: string | null;
  criteriaVersion: number | null;
  dataResearchConsent: boolean | null;
  checkpoints: CaseCheckpointView[];
};

export async function getCaseDetail(caseId: string): Promise<CaseDetailView | null> {
  const caseRow = await findCaseById(caseId);
  if (!caseRow) return null;

  const [client, mentor, protocol, criteria, dataResearchConsent, checkpoints] = await Promise.all([
    db.select({ name: clients.name, clientType: clients.clientType }).from(clients).where(eq(clients.id, caseRow.clientId)).limit(1).then((r) => r[0]),
    caseRow.mentorId ? findMentorById(caseRow.mentorId) : Promise.resolve(undefined),
    caseRow.protocolId ? findProtocolById(caseRow.protocolId) : Promise.resolve(undefined),
    caseRow.criteriaId ? findCriteriaById(caseRow.criteriaId) : Promise.resolve(undefined),
    getDataResearchConsentStatus(caseRow.clientId),
    listCheckpoints(caseId),
  ]);

  const assignedAt = caseRow.assignedAt ? new Date(caseRow.assignedAt as unknown as string) : new Date();
  return {
    labeledCase: caseRow,
    clientName: client?.name ?? 'Cliente',
    clientType: client?.clientType ?? '',
    mentor: mentor ?? null,
    protocolName: protocol?.name ?? null,
    criteriaName: criteria?.name ?? null,
    criteriaVersion: criteria?.version ?? null,
    dataResearchConsent,
    checkpoints: toCheckpointViews(assignedAt, checkpoints),
  };
}

// Efectividad por protocolo (punto 24) — % de casos con mejora entre los
// casos COMPLETADOS y elegibles para el dataset (consentimiento + sin
// vencidos) de ese protocolo. null mientras no haya ningún caso elegible
// todavía — nunca se muestra un 0% que en realidad es "sin datos".
export type ProtocolEffectiveness = { improvementPct: number; eligibleCompletedCount: number } | null;

export async function computeProtocolEffectiveness(protocolId: string): Promise<ProtocolEffectiveness> {
  const rows = await db.select().from(labeledCases).where(and(eq(labeledCases.protocolId, protocolId)));
  let eligible = 0;
  let improved = 0;
  for (const row of rows) {
    if (row.outcome == null) continue;
    const checkpoints = await listCheckpoints(row.id);
    if (!(await isCaseDatasetEligible(row, checkpoints))) continue;
    eligible += 1;
    if (IMPROVEMENT_RATINGS.includes(row.outcome as OutcomeRating)) improved += 1;
  }
  if (eligible === 0) return null;
  return { improvementPct: Math.round((improved / eligible) * 100), eligibleCompletedCount: eligible };
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

// Export del dataset (punto 24/6-del-pitch) — solo casos con consentimiento
// de investigación confirmado y sin checkpoints vencidos sin registrar
// (misma regla de calidad que la efectividad por protocolo).
export async function exportCasesCsv(module?: string, onlyCompleted = true): Promise<string> {
  const query = module ? db.select().from(labeledCases).where(eq(labeledCases.module, module)) : db.select().from(labeledCases);
  const rows = await query;

  const header = ['caso', 'modulo', 'cliente', 'tipo_cliente', 'protocolo', 'regla', 'version_regla', 'dia_0', 'duracion_ciclo_semanas', 'resultado', 'baseline_snapshot'];
  const lines = [header.join(',')];

  for (const row of rows) {
    if (onlyCompleted && row.outcome == null) continue;
    const checkpoints = await listCheckpoints(row.id);
    if (!(await isCaseDatasetEligible(row, checkpoints))) continue;

    const [client] = await db.select({ name: clients.name, clientType: clients.clientType }).from(clients).where(eq(clients.id, row.clientId)).limit(1);
    const protocol = row.protocolId ? await findProtocolById(row.protocolId) : undefined;
    const criteria = row.criteriaId ? await findCriteriaById(row.criteriaId) : undefined;
    lines.push(
      [
        `#${row.caseNumber}`,
        row.module,
        client?.name ?? '',
        client?.clientType ?? '',
        protocol?.name ?? '',
        criteria?.name ?? '',
        criteria?.version != null ? `v${criteria.version}` : '',
        row.assignedAt ? new Date(row.assignedAt as unknown as string).toISOString().slice(0, 10) : '',
        String(row.cycleWeeks),
        row.outcome ?? '',
        JSON.stringify(row.baselineSnapshot),
      ]
        .map((v) => csvEscape(String(v)))
        .join(',')
    );
  }
  return lines.join('\n');
}
