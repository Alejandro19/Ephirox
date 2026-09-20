'use client';

import type { RefObject } from 'react';
import type { AnthropometricRecord, InbodyRecord } from '../../lib/evolution-client';
import { getKpiStatus, comparisonLabelByCadence } from '../../lib/evolution-logic';
import EmptyState from '../ui/EmptyState';
import { Trend, type TrendPoint } from './charts/Trend';
import { BarChart, type BarChartGroup } from './charts/BarChart';
import { Legend } from './charts/Legend';
import { ChartCard } from './charts/Layout';
import type { TooltipHandle } from './charts/Tooltip';

export { comparisonLabelByCadence };

// ─── "Evolución física" — 3 sparklines lado a lado (spec 27.3) ────

function EvoFisicaSparkCard({
  label, value, unit, deltaText, good, points, tip,
}: {
  label: string;
  value: number | string | null;
  unit: string;
  deltaText: string | null;
  good: boolean | null;
  points: TrendPoint[];
  tip?: RefObject<TooltipHandle | null>;
}) {
  return (
    <div style={{ background: 'var(--eph-surface)', border: '1px solid var(--eph-line)', borderRadius: 14, padding: '18px 20px' }}>
      <div style={{ fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace', fontSize: 11, color: 'var(--eph-faint)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>
        {label}
      </div>
      <div className="eph-num" style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 24, color: 'var(--eph-text)', marginTop: 8 }}>
        {value ?? '—'}
        {value != null && <span style={{ fontSize: 13, color: 'var(--eph-muted)' }}> {unit}</span>}
      </div>
      {deltaText && (
        <div style={{ fontSize: 11.5, fontWeight: 700, marginTop: 2, color: good ? 'var(--eph-good)' : 'var(--eph-warn)' }}>
          {good ? '▲' : '▼'} {deltaText}
        </div>
      )}
      <div style={{ marginTop: 10 }}>
        <Trend points={points} width={160} height={50} color="var(--eph-accent)" padTop={8} padBottom={6} padX={6} tip={tip} unit={unit} emptyMessage="Sin historial" />
      </div>
    </div>
  );
}

export function EvolucionFisicaSection({
  anthropometrics,
  inbody,
  objetivos,
  inbodyCadenceType,
  tip,
}: {
  anthropometrics: AnthropometricRecord[];
  inbody: InbodyRecord[];
  objetivos: Record<string, string> | undefined;
  inbodyCadenceType: string | undefined;
  tip?: RefObject<TooltipHandle | null>;
}) {
  const lastAnthro = anthropometrics[anthropometrics.length - 1] ?? null;
  const prevAnthro = anthropometrics.length >= 2 ? anthropometrics[anthropometrics.length - 2] : null;
  const lastInbody = inbody[inbody.length - 1] ?? null;
  const prevInbody = inbody.length >= 2 ? inbody[inbody.length - 2] : null;

  const pesoVal = lastInbody?.pesoTotal ?? lastAnthro?.peso ?? null;
  const pesoPrev = lastInbody?.pesoTotal != null ? prevInbody?.pesoTotal ?? null : prevAnthro?.peso ?? null;
  const pesoDelta = pesoVal != null && pesoPrev != null ? Number(pesoVal) - Number(pesoPrev) : null;
  const grasaDelta = lastInbody?.grasaPct != null && prevInbody?.grasaPct != null ? Number(lastInbody.grasaPct) - Number(prevInbody.grasaPct) : null;
  const smmDelta = lastInbody?.smm != null && prevInbody?.smm != null ? Number(lastInbody.smm) - Number(prevInbody.smm) : null;

  const comparisonLabel = comparisonLabelByCadence[inbodyCadenceType || 'mensual'];

  const pesoPoints: TrendPoint[] = inbody.filter((r) => r.mesNum != null && r.pesoTotal != null).map((r) => ({ label: `M${r.mesNum}`, value: Number(r.pesoTotal) }));
  const smmPoints: TrendPoint[] = inbody.filter((r) => r.mesNum != null && r.smm != null).map((r) => ({ label: `M${r.mesNum}`, value: Number(r.smm) }));
  const grasaPoints: TrendPoint[] = inbody.filter((r) => r.mesNum != null && r.grasaPct != null).map((r) => ({ label: `M${r.mesNum}`, value: Number(r.grasaPct) }));

  if (!pesoVal && smmPoints.length === 0 && grasaPoints.length === 0) {
    return <EmptyState message="Aún no hay mediciones registradas." />;
  }

  const pesoGood = pesoDelta != null ? getKpiStatus(pesoDelta, 'peso', objetivos) === 'good' : null;
  const grasaGood = grasaDelta != null ? getKpiStatus(grasaDelta, 'grasa_corporal', objetivos) === 'good' : null;
  const smmGood = smmDelta != null ? getKpiStatus(smmDelta, 'masa_muscular', objetivos) === 'good' : null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
      <EvoFisicaSparkCard
        label="Peso" value={pesoVal} unit="kg" tip={tip} points={pesoPoints}
        deltaText={pesoDelta != null ? `${pesoDelta > 0 ? '+' : ''}${pesoDelta.toFixed(1)} kg ${comparisonLabel}` : null}
        good={pesoGood}
      />
      <EvoFisicaSparkCard
        label="Masa muscular" value={lastInbody?.smm ?? null} unit="kg" tip={tip} points={smmPoints}
        deltaText={smmDelta != null ? `${smmDelta > 0 ? '+' : ''}${smmDelta.toFixed(1)} kg ${comparisonLabel}` : null}
        good={smmGood}
      />
      <EvoFisicaSparkCard
        label="Porcentaje de grasa" value={lastInbody?.grasaPct ?? null} unit="%" tip={tip} points={grasaPoints}
        deltaText={grasaDelta != null ? `${grasaDelta > 0 ? '+' : ''}${grasaDelta.toFixed(1)}% ${comparisonLabel}` : null}
        good={grasaGood}
      />
    </div>
  );
}

// ─── "Composición corporal" — barras agrupadas por corte (spec 27.4) ──

export function ComposicionCorporalSection({ inbody, tip }: { inbody: InbodyRecord[]; tip?: RefObject<TooltipHandle | null> }) {
  const withData = inbody.filter((r) => r.pesoTotal != null);
  if (withData.length === 0) return <EmptyState message="Aún no hay datos de composición corporal." />;

  const recent = withData.slice(-6);
  const groups: BarChartGroup[] = recent.map((r, i) => {
    const peso = Number(r.pesoTotal);
    const muscularKg = r.smm != null ? Number(r.smm) : 0;
    const grasaKg = r.grasaPct != null ? Math.round(((peso * Number(r.grasaPct)) / 100) * 10) / 10 : 0;
    return {
      label: r.mesNum != null ? `M${r.mesNum}` : `#${i + 1}`,
      bars: [
        { value: Math.round(muscularKg * 10) / 10, color: 'var(--eph-pillar-nutrition)', name: 'Masa muscular' },
        { value: grasaKg, color: 'var(--eph-pillar-workout)', name: 'Masa grasa' },
      ],
    };
  });

  const last = recent[recent.length - 1];
  const prev = recent.length >= 2 ? recent[recent.length - 2] : null;
  let caption: string | undefined;
  if (prev) {
    const parts: string[] = [];
    if (last.smm != null && prev.smm != null) {
      const d = Number(last.smm) - Number(prev.smm);
      parts.push(`${d > 0 ? '+' : ''}${d.toFixed(1)} kg de masa muscular`);
    }
    const lastGrasaKg = last.grasaPct != null ? (Number(last.pesoTotal) * Number(last.grasaPct)) / 100 : null;
    const prevGrasaKg = prev.grasaPct != null ? (Number(prev.pesoTotal) * Number(prev.grasaPct)) / 100 : null;
    if (lastGrasaKg != null && prevGrasaKg != null) {
      const d = lastGrasaKg - prevGrasaKg;
      parts.push(`${d > 0 ? '+' : ''}${d.toFixed(1)} kg de masa grasa`);
    }
    if (parts.length) caption = `${parts.join(', ')} desde tu última medición.`;
  }

  return (
    <ChartCard title="Composición corporal por corte" caption={caption}>
      <Legend items={[{ label: 'Masa muscular', color: 'var(--eph-pillar-nutrition)' }, { label: 'Masa grasa', color: 'var(--eph-pillar-workout)' }]} />
      <BarChart groups={groups} unit=" kg" tip={tip} highlightLastLabel />
    </ChartCard>
  );
}

// ─── "Índice de rendimiento" — cifra + tendencia con línea base (spec 27.2) ──

const COMPONENT_LABELS: Record<string, string> = {
  training: 'tu adherencia a Workout',
  sleep: 'tu Sleep score',
  evolution: 'tu evolución física',
};

function buildIndiceCaption(componentsUsed: Record<string, number> | undefined): string | undefined {
  if (!componentsUsed) return undefined;
  const labels = Object.keys(componentsUsed).map((k) => COMPONENT_LABELS[k]).filter(Boolean);
  if (!labels.length) return undefined;
  return `Impulsado por ${labels.join(' y ')}.`;
}

export function IndiceRendimientoSection({
  value,
  typical,
  points,
  componentsUsed,
  tip,
}: {
  value: number | null;
  typical: number | null;
  points: TrendPoint[];
  componentsUsed?: Record<string, number>;
  tip?: RefObject<TooltipHandle | null>;
}) {
  if (value == null) {
    return <EmptyState message="Aún no hay suficientes datos de tus módulos activos para calcular tu Índice de rendimiento." />;
  }
  return (
    <ChartCard title="Tendencia" caption={buildIndiceCaption(componentsUsed)}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
        <span className="eph-num" style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 28, color: 'var(--eph-text)' }}>{value}</span>
        {typical != null && <span style={{ fontSize: 11.5, color: 'var(--eph-faint)' }}>Tu típico: <b style={{ color: 'var(--eph-muted)' }}>{typical}</b></span>}
      </div>
      <Trend points={points} baseline={typical} tip={tip} emptyMessage="Necesitas más semanas de historial para ver tu tendencia." />
    </ChartCard>
  );
}
