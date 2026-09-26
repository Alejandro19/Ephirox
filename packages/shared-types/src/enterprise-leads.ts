import { z } from 'zod';
import { ExecutiveEvaluationSchema } from './executive-score.js';
import { isPlausiblePhone, isPlausibleText, PHONE_ERROR, TEXT_ERROR, LEAD_CODE_LENGTH } from './lead-sanity.js';

// Formulario "Llevar Ephirox a mi empresa" de la landing pública
// (ephirox.com/landing) — endpoint sin autenticación, expuesto a internet.
export const EMPRESA_TAMANOS = ['1 – 10', '11 – 30', '31 – 80', '80 +'] as const;

// Cargo — recuperado del formulario "preparar propuesta" original (antes
// del punto 12), pero ahora como select fijo en vez de texto libre (punto
// 12.1: revelado progresivo + campos de calificación restaurados).
export const LEAD_CARGOS = ['CEO', 'CFO', 'COO', 'Founder', 'Top Sales', 'Otro'] as const;

// Dominios de correo personal/gratuito — el Paso 1 del formulario exige un
// correo corporativo (punto 12.1). Lista no exhaustiva a propósito (el spec
// la deja abierta con "..."); se puede ampliar sin tocar el resto del schema.
export const FREE_EMAIL_DOMAINS = [
  'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com',
  'live.com', 'aol.com', 'protonmail.com', 'msn.com', 'yahoo.es', 'hotmail.es',
  'outlook.es', 'gmx.com', 'mail.com', 'zoho.com',
] as const;

export function isCorporateEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase().trim();
  if (!domain) return false;
  return !(FREE_EMAIL_DOMAINS as readonly string[]).includes(domain);
}

export const EnterpriseLeadInputSchema = z.object({
  nombre: z.string().min(1).max(200).refine((v) => isPlausibleText(v), TEXT_ERROR),
  correo: z
    .string()
    .email()
    .max(320)
    .refine(isCorporateEmail, { message: 'Introduce un correo electrónico corporativo válido.' }),
  celular: z.string().min(1).max(40).refine(isPlausiblePhone, PHONE_ERROR),
  // Paso 2 (revelado progresivo, punto 12.1) — se revela y se pide una vez
  // que Nombre+Apellido demuestran intención real, así que en la práctica
  // casi siempre vienen con dato. Quedan opcionales igual, para no romper
  // leads viejos ni el panel admin si alguna vez se abandona a mitad.
  empresa: z.string().max(200).refine((v) => v === '' || isPlausibleText(v), TEXT_ERROR).optional(),
  rol: z.enum(LEAD_CARGOS).optional(),
  tamano: z.enum(EMPRESA_TAMANOS).optional(),
  // Sede/país y sitio web — campos nuevos del punto 12.1, no existían antes.
  pais: z.string().max(100).optional(),
  sitioWeb: z.string().max(300).optional(),
  quien: z.string().max(200).optional(),
  // Respuestas del Executive Performance Score (CTA del Hero) — el backend
  // recalcula score/segmento/programa desde acá, nunca los toma del cliente.
  evaluacion: ExecutiveEvaluationSchema.optional(),
  // Prueba de que la persona controla el correo (ver lead-verification.service.ts)
  // — lo exige el controller, no el schema, para no romper validaciones de campos.
  verificationToken: z.string().max(200).optional(),
  // Honeypot: campo oculto que una persona nunca llena; un bot sí.
  hp: z.string().max(200).optional(),
});

export const LeadVerificationStartSchema = z.object({
  correo: z.string().email().max(320).refine(isCorporateEmail, { message: 'Introduce un correo electrónico corporativo válido.' }),
});
export const LeadVerificationConfirmSchema = z.object({
  correo: z.string().email().max(320),
  code: z.string().regex(new RegExp(`^\\d{${LEAD_CODE_LENGTH}}$`), 'El código tiene 6 dígitos.'),
});
export type EnterpriseLeadInput = z.infer<typeof EnterpriseLeadInputSchema>;

// Pipeline del submódulo admin "Leads por contactar" — 'nuevo' es el estado
// de entrada (todavía sin contactar), el resto avanza en orden.
export const ENTERPRISE_LEAD_ESTADOS = [
  'nuevo',
  'contactado',
  'preparando_propuesta',
  'propuesta_entregada',
  'cerrado',
] as const;

export const EnterpriseLeadEstadoUpdateSchema = z.object({
  estado: z.enum(ENTERPRISE_LEAD_ESTADOS),
});
export type EnterpriseLeadEstadoUpdate = z.infer<typeof EnterpriseLeadEstadoUpdateSchema>;
