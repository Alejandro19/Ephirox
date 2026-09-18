// Funciones puras del índice "Capacidad de regulación" (spec 21.2) —
// separadas de regulation-capacity.service.ts (que toca la base de datos)
// para poder testearlas sin mocks. Pesos como constantes nombradas
// exportadas, no hardcodeadas inline: ajustar la ponderación tras
// calibración clínica debe ser un cambio de una línea, no una reescritura.
export const HRV_WEIGHT = 0.5;
export const SLEEP_WEIGHT = 0.3;
export const RESTING_HR_WEIGHT = 0.2;
export const BASELINE_MIN_DAYS = 7;

export type RegulationCapacityBaseline = {
  hrvAvg: number | null;
  fcReposoAvg: number | null;
  suenoScoreAvg: number | null;
};

export type RegulationCapacityInputs = {
  hrv: number | null;
  fcReposo: number | null;
  suenoScore: number | null;
};

export type DailyRegulationScore = { fecha: string; score: number };

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

// % de desviación de hoy vs. el baseline personal — positivo = mejor que el
// baseline. HRV y sueño: más alto es mejor. FC en reposo: más alto es PEOR,
// así que se invierte el signo (asimetría real, no un descuido).
function pctDeviation(today: number, baseline: number, invert: boolean): number {
  if (baseline === 0) return 0;
  const raw = ((today - baseline) / baseline) * 100;
  return invert ? -raw : raw;
}

// 100 = igual o mejor que el propio patrón habitual (el clamp superior es a
// propósito: superar el baseline no empuja el índice más allá de 100).
// Baja proporcional a la desviación ponderada cuando el día es peor que el
// baseline. Un componente sin dato (hoy o en el baseline) se excluye y su
// peso se redistribuye entre los que sí están — mismo criterio que
// weightedAverage() en wellness-index.service.ts, ninguna fórmula nueva.
export function computeRegulationCapacity(
  baseline: RegulationCapacityBaseline,
  today: RegulationCapacityInputs
): number | null {
  const components: Array<{ weight: number; deviationPct: number }> = [];
  if (today.hrv != null && baseline.hrvAvg != null) {
    components.push({ weight: HRV_WEIGHT, deviationPct: pctDeviation(today.hrv, baseline.hrvAvg, false) });
  }
  if (today.suenoScore != null && baseline.suenoScoreAvg != null) {
    components.push({ weight: SLEEP_WEIGHT, deviationPct: pctDeviation(today.suenoScore, baseline.suenoScoreAvg, false) });
  }
  if (today.fcReposo != null && baseline.fcReposoAvg != null) {
    components.push({ weight: RESTING_HR_WEIGHT, deviationPct: pctDeviation(today.fcReposo, baseline.fcReposoAvg, true) });
  }
  if (components.length === 0) return null;

  const totalWeight = components.reduce((s, c) => s + c.weight, 0);
  const weightedDeviation = components.reduce((s, c) => s + c.deviationPct * (c.weight / totalWeight), 0);
  return clamp(100 + weightedDeviation, 0, 100);
}
