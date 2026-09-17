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

export type Mentor = { id: string; name: string; specialty: string | null; active: boolean; createdAt: string };

export async function listMentors(): Promise<Mentor[]> {
  const body = await authorizedRequest<{ success: boolean; mentors: Mentor[]; error?: string }>('/api/admin/mentors', 'GET');
  if (!body.success) throw new Error(body.error || 'Error al obtener los mentores.');
  return body.mentors;
}

export async function createMentor(name: string, specialty: string | null): Promise<Mentor> {
  const body = await authorizedRequest<{ success: boolean; mentor: Mentor; error?: string }>('/api/admin/mentors', 'POST', { name, specialty });
  if (!body.success) throw new Error(body.error || 'Error al crear el mentor.');
  return body.mentor;
}

export async function updateMentor(mentorId: string, input: { active?: boolean; name?: string; specialty?: string | null }): Promise<Mentor> {
  const body = await authorizedRequest<{ success: boolean; mentor: Mentor; error?: string }>(`/api/admin/mentors/${mentorId}`, 'PATCH', input);
  if (!body.success) throw new Error(body.error || 'Error al actualizar el mentor.');
  return body.mentor;
}

export async function deleteMentor(mentorId: string): Promise<void> {
  const body = await authorizedRequest<{ success: boolean; error?: string }>(`/api/admin/mentors/${mentorId}`, 'DELETE');
  if (!body.success) throw new Error(body.error || 'Error al eliminar el mentor.');
}
