const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3003';

export type EnterpriseLeadInput = {
  nombre: string;
  empresa: string;
  rol: string;
  tamano?: string;
  quien?: string;
};

// Endpoint público, sin sesión — a diferencia del resto de lib/*-client.ts,
// esto se llama desde la landing de marketing (ephirox.com), donde el
// visitante nunca está logueado.
export async function createEnterpriseLead(input: EnterpriseLeadInput): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/enterprise-leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'No pudimos enviar tu solicitud. Intenta de nuevo.');
  }
}
