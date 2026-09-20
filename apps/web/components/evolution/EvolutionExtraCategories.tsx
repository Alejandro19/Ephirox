'use client';

import type { RefObject } from 'react';
import type { RegulationCapacityOverview } from '../../lib/stress-client';
import type { StressCompletion } from '../../lib/stress-client';
import type { WearableMetrica } from '../../lib/wearable-client';
import { weeklyAdherenceTrend } from '../../lib/stress-logic';
import EmptyState from '../ui/EmptyState';
import { Trend, type TrendPoint } from './charts/Trend';
import { ProportionBar, type ProportionSegment } from './charts/ProportionBar';
import { Legend } from './charts/Legend';
import { StatRow, KpiTile, ChartCard, ChartGrid } from './charts/Layout';
import type { TooltipHandle } from './charts/Tooltip';

function average(values: number[]): number | null {
  return values.length ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : null;
}

// ─── Stress — Capacidad de regulación + adherencia (spec 29.1) ───────

export function StressEvolutionSection({
  regulationCapacity,
  completions,
  tip,
}: {
  regulationCapacity: RegulationCapacityOverview | null;
  completions: StressCompletion[];
  tip?: RefObject<TooltipHandle | null>;
}) {
  const capacityPoints: TrendPoint[] = (regulationCapacity?.trend ?? []).slice(-56).map((d) => ({ label: d.fecha, value: d.score }));
  const capacityTypical = average(capacityPoints.slice(0, -1).map((p) => p.value));
  const capacityToday = regulationCapacity?.today ?? null;

  const adherenceRaw = weeklyAdherenceTrend(completions, 8);
  const adherencePoints: TrendPoint[] = adherenceRaw.map((p) => ({ label: p.fecha, value: p.pct }));
  const adherenceTypical = average(adherenceRaw.slice(0, -1).map((p) => p.pct));
  const adherenceToday = adherenceRaw.length ? adherenceRaw[adherenceRaw.length - 1].pct : null;

  if (capacityToday == null && completions.length === 0) {
    return <EmptyState message="Aún no hay suficientes datos de Stress para esta vista." />;
  }

  return (
    <>
      <StatRow>
        <KpiTile label="Capacidad de regulación" value={capacityToday ?? '—'} typical={capacityTypical ?? undefined} />
        <KpiTile label="Adherencia al protocolo activo" value={adherenceToday ?? '—'} unit={adherenceToday != null ? '%' : undefined} typical={adherenceTypical != null ? `${adherenceTypical}%` : undefined} />
      </StatRow>
      <ChartGrid>
        <ChartCard title="Capacidad de regulación — tendencia">
          <Trend points={capacityPoints} baseline={capacityTypical} tip={tip} color="var(--eph-pillar-stress)" emptyMessage="Necesitas más días de datos para ver tu tendencia." />
        </ChartCard>
        <ChartCard title="Adherencia al protocolo activo — últimas 8 semanas">
          <Trend points={adherencePoints} tip={tip} color="var(--eph-pillar-stress)" unit="%" emptyMessage="Necesitas más semanas de historial para ver tu tendencia." />
        </ChartCard>
      </ChartGrid>
    </>
  );
}

// ─── Sleep — cifras + etapas + tendencia de hora de despertar (spec 29.1) ──

function timeToDecimalHour(hhmm: string): number | null {
  const m = hhmm.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return Number(m[1]) + Number(m[2]) / 60;
}

function formatMinutesAsHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m}m`;
}

export function SleepEvolutionSection({ metrics, tip }: { metrics: WearableMetrica[]; tip?: RefObject<TooltipHandle | null> }) {
  if (metrics.length === 0) return <EmptyState message="Aún no hay datos de tu wearable para Sleep." />;
  // obtenerMetricas ordena desc por fecha — se invierte para graficar en
  // orden cronológico (igual que el resto de las gráficas del módulo).
  const chrono = [...metrics].reverse();
  const last = chrono[chrono.length - 1];

  const scorePoints: TrendPoint[] = chrono.filter((m) => m.suenoScore != null).map((m) => ({ label: m.fecha, value: Number(m.suenoScore) }));
  const scoreTypical = average(scorePoints.slice(0, -1).map((p) => p.value));
  const totalPoints = chrono.filter((m) => m.suenoTotalMinutos != null).map((m) => Number(m.suenoTotalMinutos));
  const totalTypical = average(totalPoints.slice(0, -1));

  // Etapas de sueño — de la noche más reciente con desglose disponible, no
  // un promedio del período (una sola noche, como en el mockup de referencia).
  const stageNight = [...chrono].reverse().find((m) => m.suenoRemMinutos != null || m.suenoProfundoMinutos != null);
  const stageSegments: ProportionSegment[] | null = stageNight
    ? [
        { label: 'Despierto', value: Number(stageNight.suenoDespiertoMinutos ?? 0), color: 'var(--eph-sleep-stage-1)' },
        { label: 'REM', value: Number(stageNight.suenoRemMinutos ?? 0), color: 'var(--eph-sleep-stage-2)' },
        { label: 'Sueño ligero', value: Number(stageNight.suenoLigeroMinutos ?? 0), color: 'var(--eph-sleep-stage-3)' },
        { label: 'Sueño profundo', value: Number(stageNight.suenoProfundoMinutos ?? 0), color: 'var(--eph-sleep-stage-4)' },
      ]
    : null;

  // Hora de despertar en horas decimales (7:30 → 7.5) para poder graficarla
  // con el mismo componente Trend — no es una duración, es hora del día.
  const wakeupPoints: TrendPoint[] = chrono
    .filter((m) => m.horaDespertar)
    .slice(-8)
    .map((m) => ({ label: m.fecha, value: Math.round((timeToDecimalHour(m.horaDespertar!) ?? 0) * 10) / 10 }))
    .filter((p) => p.value > 0);

  return (
    <>
      <StatRow>
        <KpiTile label="Sleep score" value={last.suenoScore ?? '—'} typical={scoreTypical ?? undefined} />
        <KpiTile label="Hora de dormir" value={last.horaDormir ?? '—'} />
        <KpiTile
          label="Sueño total"
          value={last.suenoTotalMinutos != null ? formatMinutesAsHours(Number(last.suenoTotalMinutos)) : '—'}
          typical={totalTypical != null ? formatMinutesAsHours(totalTypical) : undefined}
        />
      </StatRow>
      {stageSegments && (
        <ChartGrid>
          <ChartCard title="Etapas de sueño — última noche">
            <Legend items={stageSegments} />
            <ProportionBar segments={stageSegments} tip={tip} />
          </ChartCard>
        </ChartGrid>
      )}
      <div style={{ marginTop: 16 }}>
        <ChartCard title="Hora de despertar — últimos 8 días" caption="Eje en hora del día (7.5 = 7:30 a. m.), no en duración.">
          <Trend points={wakeupPoints} tip={tip} color="var(--eph-pillar-sleep)" unit="h" emptyMessage="Necesitas más días de datos wearable para ver tu tendencia." />
        </ChartCard>
      </div>
    </>
  );
}

// ─── Recuperación — nueva categoría (spec 29.1) ──────────────────────

// Mismo umbral que ya usa el backend para clasificar recoveryScore como
// "óptimo" (wearable.service.ts RANGOS.recoveryScore.optimo = [66,100]) —
// no se inventa un corte nuevo para "bien recuperado".
const RECOVERY_GOOD_THRESHOLD = 66;

export function RecoveryEvolutionSection({ metrics, tip }: { metrics: WearableMetrica[]; tip?: RefObject<TooltipHandle | null> }) {
  if (metrics.length === 0) return <EmptyState message="Aún no hay datos de tu wearable para Recuperación." />;
  const chrono = [...metrics].reverse();
  const last = chrono[chrono.length - 1];

  const hrvPoints: TrendPoint[] = chrono.filter((m) => m.hrvNocturno != null).slice(-56).map((m) => ({ label: m.fecha, value: Number(m.hrvNocturno) }));
  const fcPoints: TrendPoint[] = chrono.filter((m) => m.fcReposo != null).slice(-56).map((m) => ({ label: m.fecha, value: Number(m.fcReposo) }));
  const hrvTypical = average(hrvPoints.slice(0, -1).map((p) => p.value));
  const fcTypical = average(fcPoints.slice(0, -1).map((p) => p.value));

  const last14 = chrono.slice(-14).filter((m) => m.recoveryScore != null);
  const wellRecovered = last14.filter((m) => Number(m.recoveryScore) >= RECOVERY_GOOD_THRESHOLD).length;
  const subRecovered = last14.length - wellRecovered;

  return (
    <>
      <StatRow>
        <KpiTile label="HRV basal" value={last.hrvNocturno ?? '—'} unit={last.hrvNocturno != null ? 'ms' : undefined} typical={hrvTypical != null ? `${hrvTypical} ms` : undefined} />
        <KpiTile label="FC en reposo" value={last.fcReposo ?? '—'} unit={last.fcReposo != null ? 'bpm' : undefined} typical={fcTypical != null ? `${fcTypical} bpm` : undefined} />
        <KpiTile label="Recovery score" value={last.recoveryScore ?? '—'} />
      </StatRow>
      <ChartGrid>
        <ChartCard title="HRV basal — tendencia">
          <Trend points={hrvPoints} baseline={hrvTypical} unit=" ms" tip={tip} color="var(--eph-pillar-recovery)" emptyMessage="Sin suficientes datos." />
        </ChartCard>
        <ChartCard title="FC en reposo — tendencia">
          <Trend points={fcPoints} baseline={fcTypical} unit=" bpm" tip={tip} color="var(--eph-pillar-recovery)" emptyMessage="Sin suficientes datos." />
        </ChartCard>
      </ChartGrid>
      {last14.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <ChartCard title="Balance de recuperación — últimas 2 semanas">
            <Legend items={[{ label: 'Bien recuperado', color: 'var(--eph-good)' }, { label: 'Sub-recuperado', color: 'var(--eph-warn)' }]} />
            <ProportionBar
              segments={[
                { label: 'Bien recuperado', value: wellRecovered, color: 'var(--eph-good)' },
                { label: 'Sub-recuperado', value: subRecovered, color: 'var(--eph-warn)' },
              ]}
              tip={tip}
            />
          </ChartCard>
        </div>
      )}
    </>
  );
}
