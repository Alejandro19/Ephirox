'use client';

import type { RefObject } from 'react';
import { useMounted } from './hooks';
import type { TooltipHandle } from './Tooltip';

export type RangeZone = { min: number; max: number; color: string; label: string };

// Barra de rango con zonas de referencia coloreadas + punto marcador (spec
// 27.6 Laboratorios) — reemplaza la tabla de texto plano: se lee de un
// vistazo sin comparar números contra un rango escrito.
export function RangeBar({
  name,
  value,
  unit,
  zones,
  domainMin,
  domainMax,
  trend,
  tip,
}: {
  name: string;
  value: number;
  unit: string;
  zones: RangeZone[];
  domainMin: number;
  domainMax: number;
  trend?: { direction: 'up' | 'down'; deltaText: string } | null;
  tip?: RefObject<TooltipHandle | null>;
}) {
  const mounted = useMounted();
  const span = domainMax - domainMin || 1;
  const markerPct = Math.max(0, Math.min(100, ((value - domainMin) / span) * 100));

  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid var(--eph-line)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: 'var(--eph-text)', fontWeight: 600 }}>{name}</span>
        <span style={{ fontSize: 12, color: 'var(--eph-muted)' }}>
          {value}{unit}
          {trend && (
            <span style={{ marginLeft: 6, color: trend.direction === 'up' ? 'var(--eph-good)' : 'var(--eph-warn)' }}>
              {trend.direction === 'up' ? '▲' : '▼'} {trend.deltaText}
            </span>
          )}
        </span>
      </div>
      <div style={{ position: 'relative', height: 10, borderRadius: 6, marginTop: 10, display: 'flex' }}>
        {zones.map((z, i) => (
          <div
            key={i}
            style={{
              height: '100%',
              width: `${(Math.max(0, z.max - z.min) / span) * 100}%`,
              background: z.color,
              borderRadius: i === 0 ? '6px 0 0 6px' : i === zones.length - 1 ? '0 6px 6px 0' : 0,
            }}
          />
        ))}
        <div
          style={{
            position: 'absolute',
            top: -3,
            width: 16,
            height: 16,
            borderRadius: '50%',
            left: `${mounted ? markerPct : 0}%`,
            transform: 'translateX(-50%)',
            background: 'var(--eph-text)',
            border: '3px solid var(--eph-ink)',
            boxShadow: '0 0 0 1px var(--eph-line-2)',
            transition: 'left 700ms cubic-bezier(.2,.8,.2,1)',
            cursor: tip ? 'pointer' : 'default',
          }}
          onMouseEnter={(e) => tip?.current?.show(e.clientX, e.clientY, name, `${value}${unit}`)}
          onMouseMove={(e) => tip?.current?.show(e.clientX, e.clientY, name, `${value}${unit}`)}
          onMouseLeave={() => tip?.current?.hide()}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        {zones.map((z, i) => (
          <span key={i} style={{ fontSize: 10, color: 'var(--eph-faint)' }}>{z.label}</span>
        ))}
      </div>
    </div>
  );
}
