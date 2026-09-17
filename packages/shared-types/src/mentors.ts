import { z } from 'zod';

// Mentores de performance (Stress/Workout/Nutrition/Sleep) — catálogo simple
// gestionado por el admin, sin login propio (ver schema.ts::mentors).
export const MentorInputSchema = z.object({
  name: z.string().min(1),
  specialty: z.string().nullable().optional(),
  active: z.boolean().optional(),
});
export type MentorInput = z.infer<typeof MentorInputSchema>;

// "Caso Etiquetado" (spec punto 17) — objeto de datos común pensado para los
// 4 módulos de contenido; en esta ronda solo Stress tiene UI de asignación.
export const LABELED_CASE_MODULES = ['stress', 'training', 'nutrition', 'rest'] as const;
export const LabeledCaseModuleSchema = z.enum(LABELED_CASE_MODULES);
export type LabeledCaseModule = z.infer<typeof LabeledCaseModuleSchema>;

export const LABELED_CASE_OUTCOMES = ['mejora', 'sin_cambio', 'derivado', 'cerrado'] as const;
export const LabeledCaseOutcomeSchema = z.enum(LABELED_CASE_OUTCOMES);
export type LabeledCaseOutcome = z.infer<typeof LabeledCaseOutcomeSchema>;

export const LabeledCaseInputSchema = z.object({
  module: LabeledCaseModuleSchema,
  protocol_id: z.string().uuid(),
  mentor_id: z.string().uuid().nullable().optional(),
  cycle_weeks: z.coerce.number().int().min(1).optional(),
});
export type LabeledCaseInput = z.infer<typeof LabeledCaseInputSchema>;

export const LabeledCaseUpdateSchema = z.object({
  mentor_id: z.string().uuid().nullable().optional(),
  outcome: LabeledCaseOutcomeSchema.nullable().optional(),
});
export type LabeledCaseUpdate = z.infer<typeof LabeledCaseUpdateSchema>;

export const LABELED_CASE_CHECKPOINT_STATUSES = ['pendiente', 'completado', 'omitido'] as const;
export const LabeledCaseCheckpointStatusSchema = z.enum(LABELED_CASE_CHECKPOINT_STATUSES);
export type LabeledCaseCheckpointStatus = z.infer<typeof LabeledCaseCheckpointStatusSchema>;

export const LabeledCaseCheckpointUpdateSchema = z.object({
  status: LabeledCaseCheckpointStatusSchema,
  notes: z.string().nullable().optional(),
});
export type LabeledCaseCheckpointUpdate = z.infer<typeof LabeledCaseCheckpointUpdateSchema>;
