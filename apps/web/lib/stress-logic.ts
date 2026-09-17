import { getWeekStart } from './training-home-logic';
import type { StressCompletion } from './stress-client';

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
