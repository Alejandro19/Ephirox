const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3003';

export type EnterpriseLeadInput = {
  nombre: string;
  correo: string;
  celular: string;
  // Paso 2 del formulario (revelado progresivo, punto 12.1) — Empresa/Cargo/
  // Tamaño de cohorte/Sede-país/Sitio web. Quedan opcionales a nivel de tipo
  // para no romper el resto del backend, aunque el formulario los pide.
  empresa?: string;
  rol?: string;
  tamano?: string;
  pais?: string;
  sitioWeb?: string;
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
