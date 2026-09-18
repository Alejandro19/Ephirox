import { getWeekStart } from './training-home-logic';
import type { StressCompletion } from './stress-client';

// Todavía usada por Evolution (AdminEvolutionPanel/ClientEvolutionPanel) para
// su propio conteo de "regulación semanal" — ya no por ClientStressPanel.tsx,
// que quitó la card "Momento de regulación" que la mostraba directamente.
export function calculateStressWeeklyStats(completions: StressCompletion[]): { count: number; pct: number } {
  const weekStart = getWeekStart();
  const count = new Set(completions.filter((c) => c.completedDate >= weekStart).map((c) => c.completedDate)).size;
  const pct = Math.round((count / 7) * 100);
  return { count, pct };
}

export function formatDurationLabel(minutes: string | number | null, seconds: string | number | null): string {
  const m = Number(minutes) || 0;
  const s = Number(seconds) || 0;
  if (!m && !s) return '';
  return `${m}:${String(s).padStart(2, '0')} min`;
}
