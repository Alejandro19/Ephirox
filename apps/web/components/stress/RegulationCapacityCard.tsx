'use client';

import MetricValue from '../ui/MetricValue';
import Badge from '../ui/Badge';
import type { CognitiveLoadOverview, RegulationCapacityOverview } from '../../lib/stress-client';

// "Capacidad de regulación" (spec punto 16.2 / 21.2) — usa el índice propio
// (Fase 7: HRV/sueño/FC-reposo contra línea base de 7 días) cuando
// `regulationCapacity.enabled` es true (aprobado clínicamente); mientras
// esté apagado, se deriva de Carga Cognitiva (0-10, más alto = más carga),
// invirtiéndola a "bienestar" (10 - carga) y escalando a 0-100 — misma UI en
// ambos casos, solo cambia la fuente del número.
const PLACEHOLDER_CAPTION =
  'Estimado con tu HRV, sueño y recuperación de los últimos días — versión preliminar mientras calibramos tu índice definitivo.';
const REAL_INDEX_CAPTION =
  'Tu índice de regulación — calculado con tu HRV, sueño y frecuencia cardíaca en reposo contra tu línea base personal, registrada en tu semana de referencia inicial.';

function toCapacity(cargaCognitiva: number): number {
  return Math.round((10 - cargaCognitiva) * 10);
}

function qualitativeLabel(score: number): { label: string; variant: 'success' | 'warn' | 'danger' } {
  if (score >= 80) return { label: 'Óptima', variant: 'success' };
  if (score >= 50) return { label: 'Moderada', variant: 'warn' };
  return { label: 'Baja', variant: 'danger' };
}

function average(values: number[]): number {
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const width = 160;
  const height = 44;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = width / (points.length - 1);
  const coords = points.map((p, i) => {
    const x = i * step;
    const y = height - ((p - min) / range) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const [lastX, lastY] = coords[coords.length - 1].split(',');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Tendencia de capacidad de regulación, últimos días">
      <polyline
        points={coords.join(' ')}
        fill="none"
        stroke="var(--eph-accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r="3" fill="var(--eph-accent)" />
    </svg>
  );
}

export function RegulationCapacityCard({
  overview,
  regulationCapacity,
}: {
  overview: CognitiveLoadOverview;
  regulationCapacity?: RegulationCapacityOverview | null;
}) {
  const usingRealIndex = regulationCapacity?.enabled === true;

  const todayScore = usingRealIndex
    ? regulationCapacity!.today
    : overview.today != null
      ? toCapacity(overview.today)
      : null;

  if (todayScore == null) {
    return (
      <div className="mb-5 border p-7" style={{ borderColor: 'var(--eph-accent-edge)', background: 'var(--eph-panel)' }}>
        <span className="font-mono" style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--eph-muted)' }}>
          Capacidad de regulación
        </span>
        <p className="mt-3 font-body text-sm" style={{ color: 'var(--eph-muted)' }}>
          Aún no hay suficientes datos de hoy (wearable o check-in matutino) para calcular tu capacidad de regulación.
        </p>
      </div>
    );
  }

  const { label, variant } = qualitativeLabel(todayScore);
  const history = usingRealIndex
    ? regulationCapacity!.trend.map((d) => d.score)
    : overview.trend.filter((d) => d.score != null).map((d) => toCapacity(d.score));

  const historyExcludingToday = history.slice(0, -1);
  const baseline = historyExcludingToday.length >= 3 ? average(historyExcludingToday) : null;
  const delta = baseline != null ? Math.round(todayScore - baseline) : null;
  const sparklinePoints = history.slice(-7);

  return (
    <div className="mb-5 border p-7" style={{ borderColor: 'var(--eph-accent-edge)', background: 'var(--eph-panel)' }}>
      <span className="font-mono" style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--eph-muted)' }}>
        Capacidad de regulación
      </span>
      <div className="mt-3 flex flex-wrap items-baseline gap-3">
        <MetricValue value={todayScore} size="index" />
        <Badge label={label} variant={variant} />
      </div>
      {delta != null && (
        <p className="mt-2 font-body text-sm font-medium" style={{ color: delta < 0 ? 'var(--eph-danger)' : 'var(--eph-accent)' }}>
          {delta < 0 ? '▼' : '▲'} {Math.abs(delta)} pts vs. tu línea base
        </p>
      )}
      {sparklinePoints.length >= 2 && (
        <div className="mt-4 flex items-end gap-4">
          <Sparkline points={sparklinePoints} />
          <p className="font-body text-xs leading-relaxed" style={{ color: 'var(--eph-faint)' }}>
            Últimos {sparklinePoints.length} días
          </p>
        </div>
      )}
      <p className="mt-4 border-t font-body text-xs leading-relaxed" style={{ borderColor: 'var(--eph-line-2)', paddingTop: 14, color: 'var(--eph-faint)' }}>
        {usingRealIndex ? REAL_INDEX_CAPTION : PLACEHOLDER_CAPTION}
      </p>
    </div>
  );
}
