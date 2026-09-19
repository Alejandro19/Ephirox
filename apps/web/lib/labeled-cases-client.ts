import type { LabeledCaseModule, LabeledCaseOutcome, LabeledCaseCheckpointStatus, OutcomeRating } from '@latribu/shared-types';
import type { StressProtocolResource } from './stress-protocols-client';
import { PermissionDeniedError } from './api-client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3003';

async function authorizedRequest<T>(path: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  if (res.status === 403) {
    const errorBody = await res.json().catch(() => ({}));
    throw new PermissionDeniedError(errorBody.error || 'No tienes acceso a este módulo.');
  }
  return res.json();
}

export type LabeledCase = {
  id: string;
  caseNumber: number;
  clientId: string;
  module: LabeledCaseModule;
  protocolId: string | null;
  mentorId: string | null;
  assignedAt: string;
  cycleWeeks: number;
  outcome: LabeledCaseOutcome | null;
};

export type LabeledCaseCheckpoint = {
  id: string;
  caseId: string;
  weekNumber: number;
  status: LabeledCaseCheckpointStatus;
  valoracion: OutcomeRating | null;
  notes: string | null;
  completedAt: string | null;
};

export type CaseCheckpointView = LabeledCaseCheckpoint & { dueDate: string; overdue: boolean };

export type ActiveCaseView = {
  labeledCase: LabeledCase;
  mentor: { id: string; name: string; specialty: string | null } | null;
  protocol: { id: string; name: string; mechanism: string | null; suggestedFrequency: string | null } | null;
  resources: StressProtocolResource[];
  checkpoints: LabeledCaseCheckpoint[];
};

export async function listActiveCases(module: LabeledCaseModule): Promise<LabeledCase[]> {
  const body = await authorizedRequest<{ success: boolean; cases: LabeledCase[]; error?: string }>(
    `/api/admin/labeled-cases?module=${module}`,
    'GET'
  );
  if (!body.success) throw new Error(body.error || 'Error al obtener los casos.');
  return body.cases;
}

export async function createCase(
  clientId: string,
  input: { module: LabeledCaseModule; protocol_id: string; mentor_id: string | null; cycle_weeks?: number }
): Promise<LabeledCase> {
  const body = await authorizedRequest<{ success: boolean; case: LabeledCase; error?: string }>(
    `/api/admin/clients/${clientId}/labeled-cases`,
    'POST',
    input
  );
  if (!body.success) throw new Error(body.error || 'Error al asignar el protocolo.');
  return body.case;
}

export async function closeCase(caseId: string, outcome: LabeledCaseOutcome): Promise<LabeledCase> {
  const body = await authorizedRequest<{ success: boolean; case: LabeledCase; error?: string }>(
    `/api/admin/labeled-cases/${caseId}`,
    'PATCH',
    { outcome }
  );
  if (!body.success) throw new Error(body.error || 'Error al cerrar el caso.');
  return body.case;
}

export async function getActiveCase(clientId: string, module: LabeledCaseModule): Promise<ActiveCaseView | null> {
  const body = await authorizedRequest<{ success: boolean; activeCase: ActiveCaseView | null; error?: string }>(
    `/api/clients/${clientId}/labeled-cases/active?module=${module}`,
    'GET'
  );
  if (!body.success) throw new Error(body.error || 'Error al obtener tu protocolo activo.');
  return body.activeCase;
}

export type ClosedCaseSummary = { id: string; protocolName: string; assignedAt: string; closedAt: string | null };

export async function listClosedCases(clientId: string, module: LabeledCaseModule): Promise<ClosedCaseSummary[]> {
  const body = await authorizedRequest<{ success: boolean; cases: ClosedCaseSummary[]; error?: string }>(
    `/api/clients/${clientId}/labeled-cases/closed?module=${module}`,
    'GET'
  );
  if (!body.success) throw new Error(body.error || 'Error al obtener tu historial de protocolos.');
  return body.cases;
}

export type RecentCaseLogEntry = {
  id: string;
  caseNumber: number;
  clientName: string;
  clientType: string;
  protocolName: string;
  mentorName: string | null;
  assignedAt: string;
};

export async function listRecentCases(module: LabeledCaseModule): Promise<RecentCaseLogEntry[]> {
  const body = await authorizedRequest<{ success: boolean; cases: RecentCaseLogEntry[]; error?: string }>(
    `/api/admin/labeled-cases/recent?module=${module}`,
    'GET'
  );
  if (!body.success) throw new Error(body.error || 'Error al obtener las asignaciones recientes.');
  return body.cases;
}

export async function updateCheckpoint(
  caseId: string,
  weekNumber: number,
  input: { status: LabeledCaseCheckpointStatus; valoracion?: OutcomeRating | null; notes?: string | null }
): Promise<LabeledCaseCheckpoint> {
  const body = await authorizedRequest<{ success: boolean; checkpoint: LabeledCaseCheckpoint; error?: string }>(
    `/api/admin/labeled-cases/${caseId}/checkpoints/${weekNumber}`,
    'PATCH',
    input
  );
  if (!body.success) throw new Error(body.error || 'Error al registrar el checkpoint.');
  return body.checkpoint;
}

// Panel "Casos Etiquetados" (punto 24) — tabla con estado derivado.
export type CaseStatus = 'activo' | 'vencido' | 'completado';

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
  outcome: OutcomeRating | null;
};

export async function listCasesDetailed(
  module: LabeledCaseModule,
  filters: { search?: string; status?: CaseStatus; protocolId?: string } = {}
): Promise<CaseListRow[]> {
  const params = new URLSearchParams({ module });
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  if (filters.protocolId) params.set('protocolId', filters.protocolId);
  const body = await authorizedRequest<{ success: boolean; cases: CaseListRow[]; error?: string }>(
    `/api/admin/labeled-cases/detailed?${params.toString()}`,
    'GET'
  );
  if (!body.success) throw new Error(body.error || 'Error al obtener los casos etiquetados.');
  return body.cases;
}

export type CaseDetailView = {
  labeledCase: LabeledCase;
  clientName: string;
  clientType: string;
  mentor: { id: string; name: string; specialty: string | null } | null;
  protocolName: string | null;
  criteriaName: string | null;
  criteriaVersion: number | null;
  dataResearchConsent: boolean | null;
  checkpoints: CaseCheckpointView[];
};

export async function getCaseDetail(caseId: string): Promise<CaseDetailView> {
  const body = await authorizedRequest<{ success: boolean; detail: CaseDetailView; error?: string }>(
    `/api/admin/labeled-cases/${caseId}/detail`,
    'GET'
  );
  if (!body.success) throw new Error(body.error || 'Error al obtener el detalle del caso.');
  return body.detail;
}

export type ProtocolEffectiveness = { improvementPct: number; eligibleCompletedCount: number } | null;

export async function getProtocolEffectiveness(protocolId: string): Promise<ProtocolEffectiveness> {
  const body = await authorizedRequest<{ success: boolean; effectiveness: ProtocolEffectiveness; error?: string }>(
    `/api/admin/labeled-cases/protocol/${protocolId}/effectiveness`,
    'GET'
  );
  if (!body.success) throw new Error(body.error || 'Error al calcular la efectividad del protocolo.');
  return body.effectiveness;
}

// Dispara la descarga del navegador directamente — el endpoint devuelve
// text/csv con Content-Disposition: attachment, no JSON, así que no pasa
// por authorizedRequest (que asume JSON).
export function exportCasesCsvUrl(module?: string, onlyCompleted = true): string {
  const params = new URLSearchParams();
  if (module) params.set('module', module);
  if (!onlyCompleted) params.set('status', 'all');
  return `${API_BASE_URL}/api/admin/labeled-cases/export.csv?${params.toString()}`;
}
