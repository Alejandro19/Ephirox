import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { clients } from '../models/schema.js';
import { getDataResearchConsentStatus } from './legal-acceptance.service.js';
import { getRegulationCapacityOverview } from './regulation-capacity.service.js';
import { obtenerMetricas } from './wearable.service.js';

// Mismo umbral que ya usa el resto del producto para clasificar recoveryScore
// como "óptimo" (wearable.service.ts RANGOS.recoveryScore.optimo = [66,100],
// también reutilizado en EvolutionExtraCategories.tsx) — nunca se inventa un
// corte nuevo para "riesgo".
const RECOVERY_GOOD_THRESHOLD = 66;
const TREND_WEEKS = 8;
const RECOVERY_WINDOW_DAYS = 56;

export async function listCohortMemberIds(leaderId: string): Promise<string[]> {
  const rows = await db.select({ id: clients.id }).from(clients).where(eq(clients.cohortLeaderId, leaderId));
  return rows.map((r) => r.id);
}

function average(values: number[]): number | null {
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : null;
}

function isoWeekStart(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day; // lunes como inicio de semana
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

type MemberSignals = {
  regulationToday: number | null;
  regulationTypical: number | null;
  regulationWeekly: { weekStart: string; avg: number }[];
  recoveryRecent: number | null;
  recoveryWeekly: { weekStart: string; avg: number }[];
};

async function collectMemberSignals(clientId: string): Promise<MemberSignals> {
  const [regulation, wearable] = await Promise.all([
    // Ventana ancha (56 días, no los 14 del dashboard individual del
    // cliente) — la tendencia semanal de la cohorte necesita más historial
    // del que trae la lectura por defecto (bug real: con el default de 14
    // días, atRiskByWeek/avgRegulationByWeek solo alcanzaban a cubrir ~2
    // semanas en vez de las 8 esperadas).
    getRegulationCapacityOverview(clientId, RECOVERY_WINDOW_DAYS).catch(() => null),
    obtenerMetricas({ clienteId: clientId, dias: RECOVERY_WINDOW_DAYS }).catch(() => []),
  ]);

  const trend = regulation?.trend ?? [];
  const regulationToday = trend.length ? trend[trend.length - 1].score : null;
  const regulationTypical = average(trend.slice(0, -1).map((t) => t.score));

  const regulationByWeek = new Map<string, number[]>();
  for (const t of trend) {
    const wk = isoWeekStart(t.fecha);
    if (!regulationByWeek.has(wk)) regulationByWeek.set(wk, []);
    regulationByWeek.get(wk)!.push(t.score);
  }
  const regulationWeekly = [...regulationByWeek.entries()]
    .map(([weekStart, scores]) => ({ weekStart, avg: average(scores) ?? 0 }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));

  const recoveryScores = wearable.filter((m) => m.recoveryScore != null).map((m) => Number(m.recoveryScore));
  const recoveryRecent = average(recoveryScores.slice(0, 7));

  const recoveryByWeek = new Map<string, number[]>();
  for (const m of wearable) {
    if (m.recoveryScore == null) continue;
    const wk = isoWeekStart(m.fecha);
    if (!recoveryByWeek.has(wk)) recoveryByWeek.set(wk, []);
    recoveryByWeek.get(wk)!.push(Number(m.recoveryScore));
  }
  const recoveryWeekly = [...recoveryByWeek.entries()]
    .map(([weekStart, scores]) => ({ weekStart, avg: average(scores) ?? 0 }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));

  return { regulationToday, regulationTypical, regulationWeekly, recoveryRecent, recoveryWeekly };
}

export type CohortMemberRow = { label: string; regulationDeficit: number; atRisk: boolean };
export type CohortWeekPoint = { label: string; value: number };

export type CohortReport = {
  enabled: boolean;
  memberCount: number;
  atRiskCount: number;
  avgRecoveryScore: number | null;
  members: CohortMemberRow[];
  atRiskByWeek: CohortWeekPoint[];
  signalsByPillar: { label: string; value: number; colorKey: 'stress' | 'recovery' }[];
  avgRegulationByWeek: CohortWeekPoint[];
  avgRecoveryByWeek: CohortWeekPoint[];
};

const EMPTY_REPORT: CohortReport = {
  enabled: true,
  memberCount: 0,
  atRiskCount: 0,
  avgRecoveryScore: null,
  members: [],
  atRiskByWeek: [],
  signalsByPillar: [],
  avgRegulationByWeek: [],
  avgRecoveryByWeek: [],
};

// Agregado y anonimizado por cohorte (spec 28) — nunca devuelve un nombre:
// cada miembro se identifica solo por su índice de array ("Miembro N"),
// igual que el mockup de referencia. Solo entran miembros con consentimiento
// de investigación confirmado (misma regla de privacidad que labeled-cases.
// service.ts usa para el dataset agregado de efectividad por protocolo) —
// la regla de checkpoints-no-vencidos de ese archivo es específica de casos
// etiquetados y no aplica acá, donde no hay necesariamente un caso activo.
export async function getCohortReport(leaderId: string): Promise<CohortReport> {
  const memberIds = await listCohortMemberIds(leaderId);
  if (memberIds.length === 0) return EMPTY_REPORT;

  const consentFlags = await Promise.all(memberIds.map((id) => getDataResearchConsentStatus(id)));
  const eligibleIds = memberIds.filter((_, i) => consentFlags[i] === true);
  if (eligibleIds.length === 0) return EMPTY_REPORT;

  const signals = await Promise.all(eligibleIds.map(collectMemberSignals));

  const members: CohortMemberRow[] = signals.map((s, i) => {
    const deficit = s.regulationToday != null && s.regulationTypical != null
      ? Math.max(0, Math.round((s.regulationTypical - s.regulationToday) * 10) / 10)
      : 0;
    const atRiskStress = s.regulationToday != null && s.regulationTypical != null && s.regulationToday < s.regulationTypical;
    const atRiskRecovery = s.recoveryRecent != null && s.recoveryRecent < RECOVERY_GOOD_THRESHOLD;
    return { label: `Miembro ${i + 1}`, regulationDeficit: deficit, atRisk: atRiskStress || atRiskRecovery };
  });

  const atRiskStressCount = signals.filter((s) => s.regulationToday != null && s.regulationTypical != null && s.regulationToday < s.regulationTypical).length;
  const atRiskRecoveryCount = signals.filter((s) => s.recoveryRecent != null && s.recoveryRecent < RECOVERY_GOOD_THRESHOLD).length;

  // Semanas en riesgo: por cada una de las últimas TREND_WEEKS semanas
  // calendario, cuántos miembros tuvieron esa semana un promedio de
  // capacidad de regulación por debajo de su propio típico histórico — una
  // comparación de cada miembro contra sí mismo, nunca contra un corte
  // arbitrario nuevo.
  const allWeeks = [...new Set(signals.flatMap((s) => s.regulationWeekly.map((w) => w.weekStart)))].sort();
  const recentWeeks = allWeeks.slice(-TREND_WEEKS);
  const atRiskByWeek: CohortWeekPoint[] = recentWeeks.map((week, idx) => {
    const count = signals.filter((s) => {
      const weekEntry = s.regulationWeekly.find((w) => w.weekStart === week);
      return weekEntry != null && s.regulationTypical != null && weekEntry.avg < s.regulationTypical;
    }).length;
    return { label: `Sem ${idx + 1}`, value: count };
  });

  const avgRegulationByWeek: CohortWeekPoint[] = recentWeeks.map((week, idx) => {
    const weekValues = signals.map((s) => s.regulationWeekly.find((w) => w.weekStart === week)?.avg).filter((v): v is number => v != null);
    return { label: `Sem ${idx + 1}`, value: Math.round(average(weekValues) ?? 0) };
  });

  const recoveryWeeksAll = [...new Set(signals.flatMap((s) => s.recoveryWeekly.map((w) => w.weekStart)))].sort();
  const recentRecoveryWeeks = recoveryWeeksAll.slice(-TREND_WEEKS);
  const avgRecoveryByWeek: CohortWeekPoint[] = recentRecoveryWeeks.map((week, idx) => {
    const weekValues = signals.map((s) => s.recoveryWeekly.find((w) => w.weekStart === week)?.avg).filter((v): v is number => v != null);
    return { label: `Sem ${idx + 1}`, value: Math.round(average(weekValues) ?? 0) };
  });

  return {
    enabled: true,
    memberCount: eligibleIds.length,
    atRiskCount: members.filter((m) => m.atRisk).length,
    avgRecoveryScore: (() => {
      const v = average(signals.map((s) => s.recoveryRecent).filter((v): v is number => v != null));
      return v != null ? Math.round(v) : null;
    })(),
    members,
    atRiskByWeek,
    // Solo Stress y Recuperación tienen hoy un umbral de "riesgo" ya
    // validado en el producto (regulationTypical propio, recoveryScore
    // óptimo>=66) — Sleep/Training/Nutrition se dejan fuera de esta señal
    // hasta que exista un corte equivalente, para no inventar uno nuevo acá.
    signalsByPillar: [
      { label: 'Estrés', value: atRiskStressCount, colorKey: 'stress' },
      { label: 'Recuperación', value: atRiskRecoveryCount, colorKey: 'recovery' },
    ],
    avgRegulationByWeek,
    avgRecoveryByWeek,
  };
}
