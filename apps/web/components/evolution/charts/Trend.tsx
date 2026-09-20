'use client';

import { useMemo, type RefObject } from 'react';
import { useDrawIn } from './hooks';
import type { TooltipHandle } from './Tooltip';

export type TrendPoint = { label: string; value: number };

// Línea de tendencia con línea base punteada opcional (spec 27.2) — el
// componente de gráfica más reutilizado del módulo Evolution (índice de
// rendimiento, sparklines de evolución física, Stress/Sleep/Recuperación).
export function Trend({
  points,
  width = 300,
  height = 150,
  color = 'var(--eph-accent)',
  baseline,
  baselineLabel = 'Tu típico',
  unit = '',
  tip,
  padTop = 22,
  padBottom = 20,
  padX = 4,
}: {
  points: TrendPoint[];
  width?: number;
  height?: number;
  color?: string;
  baseline?: number | null;
  baselineLabel?: string;
  unit?: string;
  tip?: RefObject<TooltipHandle | null>;
  padTop?: number;
  padBottom?: number;
  padX?: number;
}) {
  const pathRef = useDrawIn<SVGPolylineElement>(points.map((p) => p.value).join(','));

  const { coords, baselineY, lastValue } = useMemo(() => {
    const values = points.map((p) => p.value);
    const all = baseline != null ? [...values, baseline] : values;
    const lo = Math.min(...all);
    const hi = Math.max(...all);
    const span = hi - lo || 1;
    const innerW = width - padX * 2;
    const innerH = height - padTop - padBottom;
    const xFor = (i: number) => padX + (points.length > 1 ? (innerW * i) / (points.length - 1) : innerW / 2);
    const yFor = (v: number) => height - padBottom - ((v - lo) / span) * innerH;
    return {
      coords: points.map((p, i) => ({ x: xFor(i), y: yFor(p.value), ...p })),
      baselineY: baseline != null ? yFor(baseline) : null,
      lastValue: points.length ? points[points.length - 1].value : null,
    };
  }, [points, baseline, width, height, padTop, padBottom, padX]);

  if (points.length === 0) return null;

  const polyPoints = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const areaPoints = `${padX.toFixed(1)},${(height - padBottom).toFixed(1)} ${polyPoints} ${(width - padX).toFixed(1)},${(height - padBottom).toFixed(1)}`;
  const lastCoord = coords[coords.length - 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ overflow: 'visible', display: 'block' }}>
      {baselineY != null && (
        <>
          <line x1={padX} y1={baselineY} x2={width - padX} y2={baselineY} stroke="var(--eph-faint)" strokeWidth={1} strokeDasharray="2 4" opacity={0.55} />
          <text x={width - padX} y={baselineY - 4} fontSize={9} textAnchor="end" fill="var(--eph-faint)">{baselineLabel}</text>
        </>
      )}
      <polygon points={areaPoints} fill={color} opacity={0.09} />
      <polyline ref={pathRef} points={polyPoints} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {coords.map((c, i) => (
        <circle
          key={i}
          cx={c.x}
          cy={c.y}
          r={6}
          fill="transparent"
          style={{ cursor: tip ? 'pointer' : 'default' }}
          onMouseEnter={(e) => tip?.current?.show(e.clientX, e.clientY, c.label, `${c.value}${unit}`)}
          onMouseMove={(e) => tip?.current?.show(e.clientX, e.clientY, c.label, `${c.value}${unit}`)}
          onMouseLeave={() => tip?.current?.hide()}
        />
      ))}
      {lastValue != null && (
        <text x={lastCoord.x} y={lastCoord.y - 10} fontSize={16} fontFamily="var(--font-cormorant), serif" textAnchor="end" fill="var(--eph-text)">
          {lastValue}{unit}
        </text>
      )}
    </svg>
  );
}
