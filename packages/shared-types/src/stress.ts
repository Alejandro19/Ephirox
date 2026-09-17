import { z } from 'zod';

export const STRESS_TECHNIQUE_TYPES = [
  'Respiración', 'Breathwork', 'Meditación', 'Mindfulness',
  'Respiración Vagal', 'Exposición Controlada', 'Recuperación Activa',
] as const;
export const StressTechniqueTypeSchema = z.enum(STRESS_TECHNIQUE_TYPES);
export type StressTechniqueType = z.infer<typeof StressTechniqueTypeSchema>;

// Subsección "Regulación del Sistema Nervioso" (Neurowellness, exclusivo
// Mentoría) — entrenamiento proactivo de la capacidad de regulación, no
// respuesta reactiva a un cortisol elevado. Ver ClientStressPanel.tsx.
export const NEUROWELLNESS_TECHNIQUE_TYPES = ['Respiración Vagal', 'Exposición Controlada', 'Recuperación Activa'] as const;

export const StressTechniqueInputSchema = z.object({
  title: z.string().min(1),
  type: StressTechniqueTypeSchema.optional(),
  duration: z.string().nullable().optional(),
  duration_minutes: z.coerce.number().int().min(0).nullable().optional(),
  duration_seconds: z.coerce.number().int().min(0).nullable().optional(),
  description: z.string().nullable().optional(),
  youtube_url: z.string().url().nullable().optional(),
  // Legado del check-in de ánimo ya retirado del producto — la columna se
  // conserva por compatibilidad de datos, pero ya no valida contra un set
  // cerrado de emociones (ese enum se eliminó junto con el check-in) ni
  // impulsa ninguna recomendación en el cliente.
  emotion: z.string().nullable().optional(),
  // Aviso visible de precaución/contraindicación — relevante sobre todo para
  // "Exposición Controlada" (frío/calor), pero disponible para cualquier tipo.
  precaution_note: z.string().nullable().optional(),
  // "The Rox Ritual" (bloque fijo de 3 rituales en Stress) reutiliza esta
  // misma tabla — is_ritual es lo único que distingue a una técnica-ritual.
  is_ritual: z.boolean().optional(),
});
export type StressTechniqueInput = z.infer<typeof StressTechniqueInputSchema>;

export const StressCompletionInputSchema = z.object({
  technique_id: z.string().uuid().nullable().optional(),
});
export type StressCompletionInput = z.infer<typeof StressCompletionInputSchema>;

export const StressTipInputSchema = z.object({
  content: z.string().min(1),
});
export type StressTipInput = z.infer<typeof StressTipInputSchema>;

export const StressTipUpdateSchema = z.object({
  content: z.string().min(1).optional(),
  active: z.boolean().optional(),
});
export type StressTipUpdate = z.infer<typeof StressTipUpdateSchema>;
