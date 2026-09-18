import type {
  MetricSource,
  MetricAggregation,
  AssignmentCriteriaOperator,
  AssignmentCriteriaStatus,
  ConditionNode,
} from '@latribu/shared-types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3003';

async function authorizedRequest<T>(path: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

export type MetricsCatalogEntry = {
  id: string;
  name: string;
  unit: string | null;
  source: MetricSource;
  fieldKey: string;
  aggregation: MetricAggregation;
  referenceRange: { min?: number; max?: number } | null;
  active: boolean;
  createdAt: string;
};

export type AssignmentCriteria = {
  id: string;
  name: string;
  conditions: ConditionNode;
  applicableModules: string[];
  status: AssignmentCriteriaStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export async function listMetrics(): Promise<MetricsCatalogEntry[]> {
  const body = await authorizedRequest<{ success: boolean; metrics: MetricsCatalogEntry[]; error?: string }>('/api/admin/metrics-catalog', 'GET');
  if (!body.success) throw new Error(body.error || 'Error al obtener el catálogo de marcadores.');
  return body.metrics;
}

export async function updateMetric(
  metricId: string,
  input: { active?: boolean; reference_range?: { min?: number | null; max?: number | null } | null }
): Promise<MetricsCatalogEntry> {
  const body = await authorizedRequest<{ success: boolean; metric: MetricsCatalogEntry; error?: string }>(
    `/api/admin/metrics-catalog/${metricId}`,
    'PATCH',
    input
  );
  if (!body.success) throw new Error(body.error || 'Error al actualizar el marcador.');
  return body.metric;
}

export async function listCriteria(): Promise<AssignmentCriteria[]> {
  const body = await authorizedRequest<{ success: boolean; criteria: AssignmentCriteria[]; error?: string }>('/api/admin/assignment-criteria', 'GET');
  if (!body.success) throw new Error(body.error || 'Error al obtener los criterios.');
  return body.criteria;
}

export type CriteriaInput = { name: string; conditions: ConditionNode; applicable_modules: string[] };

export async function createCriteria(input: CriteriaInput): Promise<AssignmentCriteria> {
  const body = await authorizedRequest<{ success: boolean; criteria: AssignmentCriteria; error?: string }>('/api/admin/assignment-criteria', 'POST', input);
  if (!body.success) throw new Error(body.error || 'Error al crear el criterio.');
  return body.criteria;
}

export async function updateDraftCriteria(criteriaId: string, input: Partial<CriteriaInput>): Promise<AssignmentCriteria> {
  const body = await authorizedRequest<{ success: boolean; criteria: AssignmentCriteria; error?: string }>(
    `/api/admin/assignment-criteria/${criteriaId}`,
    'PATCH',
    input
  );
  if (!body.success) throw new Error(body.error || 'Error al actualizar el criterio.');
  return body.criteria;
}

export async function publishCriteria(criteriaId: string, input?: Partial<CriteriaInput>): Promise<AssignmentCriteria> {
  const body = await authorizedRequest<{ success: boolean; criteria: AssignmentCriteria; error?: string }>(
    `/api/admin/assignment-criteria/${criteriaId}/publish`,
    'POST',
    input ?? {}
  );
  if (!body.success) throw new Error(body.error || 'Error al publicar el criterio.');
  return body.criteria;
}

export async function getMatchingClients(criteriaId: string): Promise<Array<{ id: string; name: string; clientType: string }>> {
  const body = await authorizedRequest<{ success: boolean; clients: Array<{ id: string; name: string; clientType: string }>; error?: string }>(
    `/api/admin/assignment-criteria/${criteriaId}/matching-clients`,
    'GET'
  );
  if (!body.success) throw new Error(body.error || 'Error al calcular los clientes que cumplen el criterio.');
  return body.clients;
}

export async function deleteCriteria(criteriaId: string): Promise<void> {
  const body = await authorizedRequest<{ success: boolean; error?: string }>(`/api/admin/assignment-criteria/${criteriaId}`, 'DELETE');
  if (!body.success) throw new Error(body.error || 'Error al eliminar el criterio.');
}

export type AssignmentCriteriaOperatorValue = AssignmentCriteriaOperator;
