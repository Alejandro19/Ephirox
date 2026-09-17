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

export type StressTip = { id: string; content: string; active: boolean };

export async function listTips(): Promise<StressTip[]> {
  const body = await authorizedRequest<{ success: boolean; tips: StressTip[]; error?: string }>('/api/admin/stress-tips', 'GET');
  if (!body.success) throw new Error(body.error || 'Error al obtener los tips.');
  return body.tips;
}

export async function createTip(content: string): Promise<StressTip> {
  const body = await authorizedRequest<{ success: boolean; tip: StressTip; error?: string }>('/api/admin/stress-tips', 'POST', { content });
  if (!body.success) throw new Error(body.error || 'Error al crear el tip.');
  return body.tip;
}

export async function updateTip(tipId: string, patch: { content?: string; active?: boolean }): Promise<StressTip> {
  const body = await authorizedRequest<{ success: boolean; tip: StressTip; error?: string }>(`/api/admin/stress-tips/${tipId}`, 'PATCH', patch);
  if (!body.success) throw new Error(body.error || 'Error al actualizar el tip.');
  return body.tip;
}

export async function deleteTip(tipId: string): Promise<void> {
  const body = await authorizedRequest<{ success: boolean; error?: string }>(`/api/admin/stress-tips/${tipId}`, 'DELETE');
  if (!body.success) throw new Error(body.error || 'Error al eliminar el tip.');
}
