'use client';

import { useMemo, type RefObject } from 'react';
import { useMounted } from './hooks';
import type { TooltipHandle } from './Tooltip';

export type BarChartBar = { value: number; color: string; name?: string };
export type BarChartGroup = { label: string; bars: BarChartBar[] };

// Barras agrupadas o simples (spec 27.4 Composición corporal, 28.2 riesgo
// por miembro/pilar) — a diferencia del mockup, que reescribe la lógica de
// escala/eje a mano en cada uso, acá se resuelve una sola vez.
export function BarChart({
  groups,
  width = 300,
  height = 150,
  unit = '',
  tip,
  highlightLastLabel = false,
}: {
  groups: BarChartGroup[];
  width?: number;
  height?: number;
  unit?: string;
  tip?: RefObject<TooltipHandle | null>;
  highlightLastLabel?: boolean;
}) {
  const mounted = useMounted();
  const padTop = 10;
  const padBottom = 20;
  const padX = 4;
  const innerH = height - padTop - padBottom;

  const maxValue = useMemo(() => {
    const all = groups.flatMap((g) => g.bars.map((b) => b.value));
    return Math.max(1, ...all);
  }, [groups]);

  if (groups.length === 0) return null;

  const groupW = (width - padX * 2) / groups.length;
  const barGap = 4;
  const barsPerGroup = groups[0]?.bars.length ?? 1;
  const barW = Math.max(6, (groupW - barGap * (barsPerGroup + 1)) / barsPerGroup);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ overflow: 'visible', display: 'block' }}>
      {groups.map((g, gi) => {
        const gx = padX + gi * groupW;
        return (
          <g key={g.label}>
            {g.bars.map((b, bi) => {
              // Sliver plano en vez de barra de altura 0 — más claro
              // visualmente que "no hay dato" (mismo detalle del mockup).
              const isZero = b.value === 0;
              const rawH = maxValue > 0 ? (b.value / maxValue) * innerH : 0;
              const barH = isZero ? 3 : rawH;
              const barColor = isZero ? 'var(--eph-line-2)' : b.color;
              const bx = gx + barGap + bi * (barW + barGap);
              const animatedH = mounted ? barH : 0;
              const by = padTop + innerH - animatedH;
              return (
                <rect
                  key={bi}
                  x={bx}
                  y={by}
                  width={barW}
                  height={animatedH}
                  rx={Math.min(4, barW / 4)}
                  fill={barColor}
                  style={{
                    transition: `height 700ms cubic-bezier(.2,.8,.2,1) ${bi * 60}ms, y 700ms cubic-bezier(.2,.8,.2,1) ${bi * 60}ms`,
                    cursor: tip ? 'pointer' : 'default',
                  }}
                  onMouseEnter={(e) => tip?.current?.show(e.clientX, e.clientY, b.name ?? g.label, `${b.value}${unit}`)}
                  onMouseMove={(e) => tip?.current?.show(e.clientX, e.clientY, b.name ?? g.label, `${b.value}${unit}`)}
                  onMouseLeave={() => tip?.current?.hide()}
                />
              );
            })}
            <text
              x={gx + groupW / 2}
              y={height - 4}
              fontSize={9}
              textAnchor="middle"
              fill={highlightLastLabel && gi === groups.length - 1 ? 'var(--eph-accent-hi)' : 'var(--eph-faint)'}
            >
              {g.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
