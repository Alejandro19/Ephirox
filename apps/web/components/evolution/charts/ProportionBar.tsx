'use client';

import type { RefObject } from 'react';
import { useMounted } from './hooks';
import type { TooltipHandle } from './Tooltip';

export type ProportionSegment = { label: string; value: number; color: string };

// Barra de proporción/parte-del-todo (spec 27.6/28.2/29.1) — segmentos
// apilados, ancho animado desde 0 al montar.
export function ProportionBar({ segments, tip }: { segments: ProportionSegment[]; tip?: RefObject<TooltipHandle | null> }) {
  const mounted = useMounted();
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div style={{ display: 'flex', width: '100%', height: 22, borderRadius: 8, overflow: 'hidden', marginTop: 14, background: 'var(--eph-surface-2)' }}>
      {segments.map((s, i) => (
        <div
          key={i}
          style={{
            width: `${mounted ? (s.value / total) * 100 : 0}%`,
            height: '100%',
            background: s.color,
            cursor: tip ? 'pointer' : 'default',
            transition: 'width 700ms cubic-bezier(.2,.8,.2,1)',
          }}
          onMouseEnter={(e) => tip?.current?.show(e.clientX, e.clientY, s.label, `${Math.round((s.value / total) * 100)}%`)}
          onMouseMove={(e) => tip?.current?.show(e.clientX, e.clientY, s.label, `${Math.round((s.value / total) * 100)}%`)}
          onMouseLeave={() => tip?.current?.hide()}
        />
      ))}
    </div>
  );
}
