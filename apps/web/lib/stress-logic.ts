import { getWeekStart } from './training-home-logic';
import type { StressCompletion } from './stress-client';

// Ya no la usa ningún módulo directamente (Evolution quitó "Panorama
// general", ClientStressPanel ya había quitado "Momento de regulación") —
// se mantiene porque `weeklyAdherenceTrend` de abajo reusa el mismo criterio
// semana por semana.
export function calculateStressWeeklyStats(completions: StressCompletion[]): { count: number; pct: number } {
  const weekStart = getWeekStart();
  const count = new Set(completions.filter((c) => c.completedDate >= weekStart).map((c) => c.completedDate)).size;
  const pct = Math.round((count / 7) * 100);
  return { count, pct };
}

// Tendencia de adherencia (spec 29.1, Evolution → Stress "Adherencia al
// protocolo activo") — % de días con al menos una regulación registrada,
// por cada una de las últimas `weeks` semanas. No distingue por
// técnica/recurso: "adherencia" acá es "¿practicó algo ese día?".
export function weeklyAdherenceTrend(completions: StressCompletion[], weeks: number): { fecha: string; pct: number }[] {
  const points: { fecha: string; pct: number }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    const startStr = getWeekStart(d);
    const end = new Date(startStr);
    end.setDate(end.getDate() + 7);
    const endStr = end.toISOString().slice(0, 10);
    const count = new Set(completions.filter((c) => c.completedDate >= startStr && c.completedDate < endStr).map((c) => c.completedDate)).size;
    points.push({ fecha: startStr, pct: Math.round((count / 7) * 100) });
  }
  return points;
}

export function formatDurationLabel(minutes: string | number | null, seconds: string | number | null): string {
  const m = Number(minutes) || 0;
  const s = Number(seconds) || 0;
  if (!m && !s) return '';
  return `${m}:${String(s).padStart(2, '0')} min`;
}
