import { getSessionToken } from './api-client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

export type ClientSummary = {
  id: string;
  name: string;
  email: string;
  plan: string;
  status: string;
  clientType: string;
};

export async function fetchClients(): Promise<ClientSummary[]> {
  const token = getSessionToken();
  const res = await fetch(`${API_BASE_URL}/api/clients`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  if (!body.success) throw new Error(body.error || 'Error al listar clientes.');
  return body.clients;
}
