import { z } from 'zod';

// Check-ins de baja fricción (Fase C) — pulso diario y reflexión semanal,
// exclusivos del tier Mentoría. Ver Matriz_Reglas_Mentoria_BIO360.md, pestaña
// "Check-ins y Fricción".
// `tz` (IANA, ej. "America/Bogota") es opcional — el cliente la manda
// resuelta del navegador (Intl.DateTimeFormat().resolvedOptions().timeZone)
// para que "hoy"/"esta semana" se calculen en su día calendario local, no en
// UTC. Sin ella, el backend usa un default fijo (ver DEFAULT_APP_TZ).
export const DailyCheckinInputSchema = z.object({
  pulsoAnimo: z.coerce.number().int().min(1).max(5),
  tz: z.string().optional(),
});
export type DailyCheckinInput = z.infer<typeof DailyCheckinInputSchema>;

export const WeeklyReflectionInputSchema = z.object({
  estresCronico: z.coerce.number().int().min(1).max(10),
  tecnicasManejoUsadas: z.string().optional(),
  despertaresNocturnosSemana: z.enum(['Ninguno', '1-2', '3+']).optional(),
  tz: z.string().optional(),
});
export type WeeklyReflectionInput = z.infer<typeof WeeklyReflectionInputSchema>;
