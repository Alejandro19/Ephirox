'use client';

import { useMounted } from './hooks';

// Anillo con stroke-dashoffset animado (spec 29.2 Stress cohorte) — value
// (0-1) y color como props, generalizado (el mockup lo tenía hardcodeado).
export function Donut({
  value,
  color = 'var(--eph-accent)',
  size = 120,
  strokeWidth = 12,
  label,
}: {
  value: number;
  color?: string;
  size?: number;
  strokeWidth?: number;
  label?: string;
}) {
  const mounted = useMounted();
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--eph-surface-2)" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circ}
        strokeDashoffset={mounted ? circ * (1 - clamped) : circ}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(.2,.8,.2,1)' }}
      />
      <text x={size / 2} y={size / 2 + size * 0.06} fontSize={size * 0.18} textAnchor="middle" fontWeight={700} fill="var(--eph-text)">
        {label ?? `${Math.round(clamped * 100)}%`}
      </text>
    </svg>
  );
}
