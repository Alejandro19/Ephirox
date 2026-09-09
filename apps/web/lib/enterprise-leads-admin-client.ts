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

export type EnterpriseLeadEstado =
  | 'nuevo'
  | 'contactado'
  | 'preparando_propuesta'
  | 'propuesta_entregada'
  | 'cerrado';

export type AdminEnterpriseLead = {
  id: string;
  nombre: string;
  empresa: string;
  rol: string;
  correo: string | null;
  celular: string | null;
  tamano: string | null;
  quien: string | null;
  estado: EnterpriseLeadEstado;
  createdAt: string;
};

export async function listEnterpriseLeads(): Promise<AdminEnterpriseLead[]> {
  const body = await authorizedRequest<{ success: boolean; leads: AdminEnterpriseLead[]; error?: string }>(
    '/api/admin/enterprise-leads',
    'GET'
  );
  if (!body.success) throw new Error(body.error || 'Error al obtener los leads.');
  return body.leads;
}

export async function updateEnterpriseLeadEstado(
  id: string,
  estado: EnterpriseLeadEstado
): Promise<AdminEnterpriseLead> {
  const body = await authorizedRequest<{ success: boolean; lead: AdminEnterpriseLead; error?: string }>(
    `/api/admin/enterprise-leads/${id}/estado`,
    'PATCH',
    { estado }
  );
  if (!body.success) throw new Error(body.error || 'Error al actualizar el estado.');
  return body.lead;
}
