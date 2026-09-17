import type { LabeledCaseModule, LabeledCaseOutcome, LabeledCaseCheckpointStatus } from '@latribu/shared-types';
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
  notes: string | null;
  completedAt: string | null;
};

export type ActiveCaseView = {
  labeledCase: LabeledCase;
  mentor: { id: string; name: string; specialty: string | null } | null;
  protocol: { id: string; name: string; mechanism: string | null } | null;
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
