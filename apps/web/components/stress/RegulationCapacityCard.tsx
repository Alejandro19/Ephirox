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

// Línea punteada de referencia (mismo comportamiento que el mockup, punto
// 23.3): marca dónde cae tu línea base habitual dentro de la misma escala
// del sparkline, para poder ver de un vistazo si hoy quedó por encima o por
// debajo sin tener que leer el delta en texto.
function Sparkline({ points, baseline }: { points: number[]; baseline: number | null }) {
  if (points.length < 2) return null;
  const width = 160;
  const height = 44;
  const allValues = baseline != null ? [...points, baseline] : points;
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;
  const step = width / (points.length - 1);
  const toY = (v: number) => height - ((v - min) / range) * height;
  const coords = points.map((p, i) => `${(i * step).toFixed(1)},${toY(p).toFixed(1)}`);
  const [lastX, lastY] = coords[coords.length - 1].split(',');
  const baselineY = baseline != null ? toY(baseline) : null;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Tendencia de capacidad de regulación, últimos días, con tu línea base habitual marcada">
      {baselineY != null && (
        <line x1="0" y1={baselineY.toFixed(1)} x2={width} y2={baselineY.toFixed(1)} stroke="var(--eph-faint)" strokeWidth="1" strokeDasharray="2 3" opacity="0.6" />
      )}
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
      // Neutro (antes var(--eph-panel) + borde dorado) — pedido explícito:
      // junto al check-in matutino, que también quedó con borde/degradado
      // dorado, se veía sobrecargado. Esta card ya no compite por atención.
      <div className="mb-5 border p-7" style={{ borderColor: 'var(--eph-line)', background: 'var(--eph-surface)' }}>
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
    <div className="mb-5 border p-7" style={{ borderColor: 'var(--eph-line)', background: 'var(--eph-surface)' }}>
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
          <Sparkline points={sparklinePoints} baseline={baseline} />
          <p className="font-body text-xs leading-relaxed" style={{ color: 'var(--eph-faint)' }}>
            Últimos {sparklinePoints.length} días
            {baseline != null && <><br />Línea punteada = tu línea base habitual</>}
          </p>
        </div>
      )}
      <p className="mt-4 border-t font-body text-xs leading-relaxed" style={{ borderColor: 'var(--eph-line-2)', paddingTop: 14, color: 'var(--eph-faint)' }}>
        {usingRealIndex ? REAL_INDEX_CAPTION : PLACEHOLDER_CAPTION}
      </p>
    </div>
  );
}
