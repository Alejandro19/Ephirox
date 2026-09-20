'use client';

import { forwardRef, useImperativeHandle, useState } from 'react';

export type TooltipHandle = {
  show: (x: number, y: number, label: string, value: string) => void;
  hide: () => void;
};

// Tooltip flotante compartido por todas las gráficas del módulo — una sola
// instancia por pantalla, controlada de forma imperativa vía ref para que
// cada gráfica no tenga que manejar su propio estado de hover/posición.
const Tooltip = forwardRef<TooltipHandle>((_props, ref) => {
  const [state, setState] = useState<{ x: number; y: number; label: string; value: string } | null>(null);

  useImperativeHandle(ref, () => ({
    show: (x, y, label, value) => setState({ x, y, label, value }),
    hide: () => setState(null),
  }));

  if (!state) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: state.x,
        top: state.y - 12,
        transform: 'translate(-50%, -100%)',
        pointerEvents: 'none',
        zIndex: 1000,
        background: 'var(--eph-ink)',
        color: 'var(--eph-text)',
        border: '1px solid var(--eph-line-2)',
        borderRadius: 8,
        padding: '6px 10px',
        fontSize: 11,
        whiteSpace: 'nowrap',
        boxShadow: '0 10px 28px rgba(0,0,0,0.45)',
      }}
    >
      <span style={{ color: 'var(--eph-muted)' }}>{state.label}</span>{' '}
      <strong style={{ fontFamily: 'var(--font-cormorant), serif' }}>{state.value}</strong>
    </div>
  );
});
Tooltip.displayName = 'ChartTooltip';

export default Tooltip;
