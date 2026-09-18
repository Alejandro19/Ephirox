import { describe, it, expect } from 'vitest';
import { computeRegulationCapacity, HRV_WEIGHT, SLEEP_WEIGHT, RESTING_HR_WEIGHT } from '../src/services/regulation-capacity-logic.js';

describe('regulation-capacity-logic (spec 21.2 — índice propio "Capacidad de regulación")', () => {
  it('weights sum to 1 (50% HRV / 30% sueño / 20% FC-reposo)', () => {
    expect(HRV_WEIGHT + SLEEP_WEIGHT + RESTING_HR_WEIGHT).toBe(1);
  });

  it('returns 100 when today exactly matches the baseline on every component', () => {
    const baseline = { hrvAvg: 50, fcReposoAvg: 60, suenoScoreAvg: 70 };
    expect(computeRegulationCapacity(baseline, { hrv: 50, fcReposo: 60, suenoScore: 70 })).toBe(100);
  });

  it('caps at 100 even when today is better than baseline (never exceeds the ceiling)', () => {
    const baseline = { hrvAvg: 50, fcReposoAvg: 60, suenoScoreAvg: 70 };
    expect(computeRegulationCapacity(baseline, { hrv: 80, fcReposo: 40, suenoScore: 90 })).toBe(100);
  });

  it('drops below 100 when HRV today is lower than baseline (worse regulation)', () => {
    const baseline = { hrvAvg: 50, fcReposoAvg: 60, suenoScoreAvg: 70 };
    // HRV 40 vs 50 -> -20% deviation; único componente presente, así que su
    // peso se redistribuye a 100% (no se queda en 0.5) -> 100 - 20 = 80.
    const score = computeRegulationCapacity(baseline, { hrv: 40, fcReposo: null, suenoScore: null });
    expect(score).toBeCloseTo(80, 5);
  });

  it('inverts the sign for resting HR (higher = worse, unlike HRV/sleep)', () => {
    const baseline = { hrvAvg: 50, fcReposoAvg: 60, suenoScoreAvg: 70 };
    // FC en reposo 66 vs 60 -> +10% en bruto, pero invertido = -10% de desviación -> peor, no mejor.
    const higherFc = computeRegulationCapacity(baseline, { hrv: null, fcReposo: 66, suenoScore: null });
    const lowerFc = computeRegulationCapacity(baseline, { hrv: null, fcReposo: 54, suenoScore: null });
    expect(higherFc).toBeLessThan(100);
    expect(lowerFc).toBe(100); // clamp superior — mejor que baseline no pasa de 100.
    expect(higherFc).toBeLessThan(lowerFc!);
  });

  it('excludes missing components and redistributes weight among what is present', () => {
    const baseline = { hrvAvg: 50, fcReposoAvg: null, suenoScoreAvg: null };
    // Solo HRV disponible (baseline y hoy) -> pesa 100% del score, no solo 50%.
    const score = computeRegulationCapacity(baseline, { hrv: 25, fcReposo: 70, suenoScore: 90 });
    // -50% de desviación, con peso completo (ya no 0.5) -> 100 - 50 = 50.
    expect(score).toBeCloseTo(50, 5);
  });

  it('returns null when there is no overlapping data between today and the baseline', () => {
    const baseline = { hrvAvg: null, fcReposoAvg: null, suenoScoreAvg: null };
    expect(computeRegulationCapacity(baseline, { hrv: 50, fcReposo: 60, suenoScore: 70 })).toBeNull();
    const baseline2 = { hrvAvg: 50, fcReposoAvg: 60, suenoScoreAvg: 70 };
    expect(computeRegulationCapacity(baseline2, { hrv: null, fcReposo: null, suenoScore: null })).toBeNull();
  });

  it('never goes below 0 even with a deviation beyond -100%', () => {
    const baseline = { hrvAvg: 50, fcReposoAvg: null, suenoScoreAvg: null };
    // ((-25 - 50) / 50) * 100 = -150% de desviación -> sin el clamp, score sería -50.
    const score = computeRegulationCapacity(baseline, { hrv: -25, fcReposo: null, suenoScore: null });
    expect(score).toBe(0);
  });
});
