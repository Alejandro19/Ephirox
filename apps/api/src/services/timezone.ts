// Utilidades de fecha civil (día calendario) conscientes de zona horaria del
// cliente — mismo patrón ya usado en training.service.ts (DEFAULT_TRAINING_TZ/
// safeTz/todayInTz), extraído acá para reutilizarlo en checkins.service.ts y
// morning-checkin.service.ts, que antes calculaban "hoy" con
// `new Date().toISOString().slice(0,10)` (día UTC puro, sin tz) — eso hace que
// el corte de "día" ocurra a las 7pm hora Bogotá en vez de medianoche local,
// causando que dos check-ins del mismo día calendario del cliente (ej. uno
// antes y otro después de esa hora) queden guardados con `fecha` distinta.
export const DEFAULT_APP_TZ = 'America/Bogota';

export function safeTz(tz: string | undefined): string {
  if (!tz) return DEFAULT_APP_TZ;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_APP_TZ;
  }
}

export function todayInTz(tz: string | undefined): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: safeTz(tz), year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function dowInTz(tz: string | undefined): number {
  const short = new Intl.DateTimeFormat('en-US', { timeZone: safeTz(tz), weekday: 'short' }).format(new Date());
  return WEEKDAY_INDEX[short];
}

export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

// Lunes de la semana calendario vigente, en la tz dada.
export function weekStartInTz(tz: string | undefined): string {
  const today = todayInTz(tz);
  const dow = dowInTz(tz);
  return addDaysISO(today, (dow === 0 ? -6 : 1) - dow);
}

export function isWeekendInTz(tz: string | undefined): boolean {
  const dow = dowInTz(tz);
  return dow === 0 || dow === 6;
}
