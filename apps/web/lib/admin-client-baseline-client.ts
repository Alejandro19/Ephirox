const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3003';

async function authorizedRequest<T>(path: string, method: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, { method, credentials: 'include' });
  return res.json();
}

export type ActiveClientBaseline = {
  id: string;
  name: string;
  clientType: string;
  fecha: string | null;
  hrvNocturno: number | null;
  fcReposo: number | null;
  suenoScore: number | null;
  recoveryScore: number | null;
};

export async function listActiveClientsWithBaseline(): Promise<ActiveClientBaseline[]> {
  const body = await authorizedRequest<{ success: boolean; clients: ActiveClientBaseline[]; error?: string }>('/api/admin/clients/active-summary', 'GET');
  if (!body.success) throw new Error(body.error || 'Error al obtener los clientes activos.');
  return body.clients;
}
