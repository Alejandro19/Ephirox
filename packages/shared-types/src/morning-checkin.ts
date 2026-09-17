import { z } from 'zod';

// Check-in matutino de autorreporte (reemplaza la fuente inexistente de
// "Cortisol AM") — 3 preguntas 1-5, ver Prompt 02 §5 parte 1.
// `tz` opcional — ver comentario en DailyCheckinInputSchema (checkins.ts).
export const MorningCheckinInputSchema = z.object({
  energia: z.coerce.number().int().min(1).max(5),
  tension: z.coerce.number().int().min(1).max(5),
  claridad: z.coerce.number().int().min(1).max(5),
  tz: z.string().optional(),
});
export type MorningCheckinInput = z.infer<typeof MorningCheckinInputSchema>;
