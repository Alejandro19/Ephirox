import { describe, it, expect } from 'vitest';
import { weeklyAdherenceTrend } from '../lib/stress-logic';
import { getWeekStart } from '../lib/training-home-logic';
import type { StressCompletion } from '../lib/stress-client';

function completion(daysAgo: number): StressCompletion {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return { id: `c-${daysAgo}`, techniqueId: null, completedDate: d.toISOString().slice(0, 10) };
}

describe('weeklyAdherenceTrend', () => {
  it('returns one point per requested week, oldest first', () => {
    const points = weeklyAdherenceTrend([], 8);
    expect(points).toHaveLength(8);
    expect(points[7].fecha).toBe(getWeekStart());
  });

  it('computes 100% for a week with a completion on every day', () => {
    const completions = Array.from({ length: 7 }, (_, i) => completion(i));
    const points = weeklyAdherenceTrend(completions, 1);
    expect(points[0].pct).toBe(100);
  });

  it('counts distinct days only — two completions the same day count once', () => {
    const completions: StressCompletion[] = [completion(0), { ...completion(0), id: 'dup' }];
    const points = weeklyAdherenceTrend(completions, 1);
    expect(points[0].pct).toBe(Math.round((1 / 7) * 100));
  });

  it('does not leak a completion into the wrong week', () => {
    const eightWeeksAgo = completion(8 * 7);
    const points = weeklyAdherenceTrend([eightWeeksAgo], 1);
    expect(points[0].pct).toBe(0);
  });
});
