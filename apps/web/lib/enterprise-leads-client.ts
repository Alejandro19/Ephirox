import type { ExecutiveEvaluation } from '@latribu/shared-types';

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
  // Respuestas del Executive Performance Score — el backend recalcula el score.
  evaluacion?: ExecutiveEvaluation;
  // Prueba de correo verificado (ver confirmLeadVerification) y honeypot.
  verificationToken?: string;
  hp?: string;
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

// Verificación del correo: se manda un código de 6 dígitos al correo y, al
// confirmarlo, el servidor entrega el token que el lead debe llevar.
export async function requestLeadVerification(correo: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/enterprise-leads/verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'No pudimos enviar el código. Intenta de nuevo.');
  }
}

export async function confirmLeadVerification(correo: string, code: string): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/api/enterprise-leads/verification/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo, code }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'El código no es correcto o ya venció.');
  return body.token as string;
}
