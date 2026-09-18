import type { StressProtocolStatus, StressResourceType } from '@latribu/shared-types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3003';

async function authorizedRequest<T>(path: string, method: string, body?: unknown): Promise<T> {
  const isFormData = body instanceof FormData;
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers: { ...(isFormData ? {} : { 'Content-Type': 'application/json' }) },
    body: isFormData ? body : body != null ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

export type StressProtocol = {
  id: string;
  name: string;
  mechanism: string | null;
  status: StressProtocolStatus;
  criteriaId: string | null;
  sortOrder: number;
  createdAt: string;
};

export type StressProtocolResource = {
  id: string;
  protocolId: string;
  type: StressResourceType;
  title: string;
  durationMinutes: number | null;
  durationSeconds: number | null;
  instructions: string | null;
  audioUrl: string | null;
  audioName: string | null;
  videoUrl: string | null;
  videoName: string | null;
  youtubeUrl: string | null;
  sortOrder: number;
};

export async function listProtocols(): Promise<StressProtocol[]> {
  const body = await authorizedRequest<{ success: boolean; protocols: StressProtocol[]; error?: string }>('/api/admin/stress-protocols', 'GET');
  if (!body.success) throw new Error(body.error || 'Error al obtener los protocolos.');
  return body.protocols;
}

export async function getProtocol(protocolId: string): Promise<{ protocol: StressProtocol; resources: StressProtocolResource[] }> {
  const body = await authorizedRequest<{ success: boolean; protocol: StressProtocol; resources: StressProtocolResource[]; error?: string }>(
    `/api/admin/stress-protocols/${protocolId}`,
    'GET'
  );
  if (!body.success) throw new Error(body.error || 'Error al obtener el protocolo.');
  return { protocol: body.protocol, resources: body.resources };
}

export async function createProtocol(name: string, mechanism: string | null): Promise<StressProtocol> {
  const body = await authorizedRequest<{ success: boolean; protocol: StressProtocol; error?: string }>('/api/admin/stress-protocols', 'POST', {
    name,
    mechanism,
  });
  if (!body.success) throw new Error(body.error || 'Error al crear el protocolo.');
  return body.protocol;
}

export async function updateProtocolStatus(protocolId: string, status: StressProtocolStatus): Promise<StressProtocol> {
  const body = await authorizedRequest<{ success: boolean; protocol: StressProtocol; error?: string }>(
    `/api/admin/stress-protocols/${protocolId}`,
    'PATCH',
    { status }
  );
  if (!body.success) throw new Error(body.error || 'Error al actualizar el estado.');
  return body.protocol;
}

export async function updateProtocolCriteria(protocolId: string, criteriaId: string | null): Promise<StressProtocol> {
  const body = await authorizedRequest<{ success: boolean; protocol: StressProtocol; error?: string }>(
    `/api/admin/stress-protocols/${protocolId}`,
    'PATCH',
    { criteria_id: criteriaId }
  );
  if (!body.success) throw new Error(body.error || 'Error al actualizar el criterio del protocolo.');
  return body.protocol;
}

export async function deleteProtocol(protocolId: string): Promise<void> {
  const body = await authorizedRequest<{ success: boolean; error?: string }>(`/api/admin/stress-protocols/${protocolId}`, 'DELETE');
  if (!body.success) throw new Error(body.error || 'Error al eliminar el protocolo.');
}

export async function createResource(
  protocolId: string,
  input: { type: StressResourceType; title: string; duration_minutes: number | null; instructions: string | null }
): Promise<StressProtocolResource> {
  const body = await authorizedRequest<{ success: boolean; resource: StressProtocolResource; error?: string }>(
    `/api/admin/stress-protocols/${protocolId}/resources`,
    'POST',
    input
  );
  if (!body.success) throw new Error(body.error || 'Error al crear el recurso.');
  return body.resource;
}

export async function updateResource(
  protocolId: string,
  resourceId: string,
  input: Partial<{ type: StressResourceType; title: string; duration_minutes: number | null; instructions: string | null }>
): Promise<StressProtocolResource> {
  const body = await authorizedRequest<{ success: boolean; resource: StressProtocolResource; error?: string }>(
    `/api/admin/stress-protocols/${protocolId}/resources/${resourceId}`,
    'PATCH',
    input
  );
  if (!body.success) throw new Error(body.error || 'Error al actualizar el recurso.');
  return body.resource;
}

export async function deleteResource(protocolId: string, resourceId: string): Promise<void> {
  const body = await authorizedRequest<{ success: boolean; error?: string }>(
    `/api/admin/stress-protocols/${protocolId}/resources/${resourceId}`,
    'DELETE'
  );
  if (!body.success) throw new Error(body.error || 'Error al eliminar el recurso.');
}

export async function uploadResourceAudio(protocolId: string, resourceId: string, file: File): Promise<StressProtocolResource> {
  const formData = new FormData();
  formData.append('audio', file);
  const body = await authorizedRequest<{ success: boolean; resource: StressProtocolResource; error?: string }>(
    `/api/admin/stress-protocols/${protocolId}/resources/${resourceId}/upload-audio`,
    'POST',
    formData
  );
  if (!body.success) throw new Error(body.error || 'Error al subir el audio.');
  return body.resource;
}
