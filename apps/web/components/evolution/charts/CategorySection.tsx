'use client';

import type { ReactNode } from 'react';

export type EvolutionCategory = { key: string; label: string; color: string };

// Filtro real por categoría (spec 29.3) — al hacer clic en un chip, el
// reporte de esa categoría es el único visible; las demás se desmontan por
// completo (CategorySection retorna null), no solo se atenúan con CSS.
export function CategoryFilterBar({
  cats,
  active,
  onChange,
}: {
  cats: EvolutionCategory[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 20 }}>
      {cats.map((c) => {
        const isActive = active === c.key;
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => onChange(c.key)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              border: `1px solid ${isActive ? c.color : 'var(--eph-line-2)'}`,
              background: isActive ? 'var(--eph-surface-2)' : 'transparent',
              color: isActive ? 'var(--eph-text)' : 'var(--eph-muted)',
              padding: '7px 14px 7px 10px',
              borderRadius: 999,
              fontSize: 11.5,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
            {c.label}
          </button>
        );
      })}
    </div>
  );
}

// Barra de acento a la izquierda + nombre en mayúsculas del color de la
// categoría (spec 29.3) — envuelve cada reporte, nuevo o ya existente, para
// que la agrupación sea consistente en todo el módulo.
export function CategorySection({
  catKey,
  active,
  color,
  label,
  children,
}: {
  catKey: string;
  active: string;
  color: string;
  label: string;
  children: ReactNode;
}) {
  if (active !== 'todas' && active !== catKey) return null;
  return (
    <section style={{ marginTop: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ width: 4, height: 16, borderRadius: 2, background: color, flexShrink: 0 }} />
        <span style={{ fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace', fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color }}>
          {label}
        </span>
      </div>
      {children}
    </section>
  );
}
