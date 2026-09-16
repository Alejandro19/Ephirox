import { z } from 'zod';

// Formulario "Llevar Ephirox a mi empresa" de la landing pública
// (ephirox.com/landing) — endpoint sin autenticación, expuesto a internet.
export const EMPRESA_TAMANOS = ['1 – 10', '11 – 30', '31 – 80', '80 +'] as const;

export const EnterpriseLeadInputSchema = z.object({
  nombre: z.string().min(1).max(200),
  correo: z.string().email().max(320),
  celular: z.string().min(1).max(40),
  // El formulario público pasó de "preparar una propuesta" (pedía
  // empresa/rol/tamaño de equipo por adelantado) a "solicitar una demo"
  // (esa calificación se hace en vivo, en la llamada) — empresa/rol/tamano/
  // quien quedan opcionales para no romper leads viejos ni el panel admin,
  // pero el formulario nuevo ya no los pide.
  empresa: z.string().max(200).optional(),
  rol: z.string().max(200).optional(),
  tamano: z.enum(EMPRESA_TAMANOS).optional(),
  quien: z.string().max(200).optional(),
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
