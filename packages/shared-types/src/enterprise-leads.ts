import { z } from 'zod';

// Formulario "Llevar Ephirox a mi empresa" de la landing pública
// (ephirox.com/landing) — endpoint sin autenticación, expuesto a internet.
export const EMPRESA_TAMANOS = ['1 – 10', '11 – 30', '31 – 80', '80 +'] as const;

export const EnterpriseLeadInputSchema = z.object({
  nombre: z.string().min(1),
  empresa: z.string().min(1),
  rol: z.string().min(1),
  correo: z.string().email(),
  celular: z.string().min(1),
  // Los chips de tamaño de equipo no son obligatorios en el formulario
  // original (solo nombre/empresa/rol/correo/celular llevan `required`) —
  // se guarda si el visitante eligió uno, sin bloquear el envío si no.
  tamano: z.enum(EMPRESA_TAMANOS).optional(),
  quien: z.string().optional(),
});
export type EnterpriseLeadInput = z.infer<typeof EnterpriseLeadInputSchema>;
