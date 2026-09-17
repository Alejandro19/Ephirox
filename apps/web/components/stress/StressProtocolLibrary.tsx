'use client';

import type { StressTechnique } from '../../lib/stress-client';

// "Tus protocolos" (spec 16.5, renombrado de "Tus técnicas") — grid con
// mínimo 3 ítems para que nunca se vea vacía. Sin suficientes protocolos
// reales asignados todavía, se completa con los 3 ejemplos exactos del spec
// (marcados "Ejemplo", sin acción — no tienen contenido real detrás hasta
// que existan como protocolos de la librería, ver Fase 2 del plan).
const EXAMPLE_PROTOCOLS = [
  { title: 'Respiración 4-7-8', duration: '3 min' },
  { title: 'Reset del Sistema Nervioso', duration: '4 min' },
  { title: 'Escaneo corporal breve', duration: '6 min' },
];
const MIN_ITEMS = 3;

export function StressProtocolLibrary({
  techniques,
  onSelect,
}: {
  techniques: StressTechnique[];
  onSelect: (id: string) => void;
}) {
  const examplesNeeded = Math.max(0, MIN_ITEMS - techniques.length);
  const examples = EXAMPLE_PROTOCOLS.slice(0, examplesNeeded);

  return (
    <section className="border p-6 mb-5" style={{ borderColor: 'var(--eph-line)', background: 'var(--eph-surface)' }}>
      <h2 className="mb-4 font-display text-lg" style={{ color: 'var(--eph-text)' }}>Tus protocolos</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {techniques.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.id)}
            className="border p-4 text-left"
            style={{ borderColor: 'var(--eph-line)', background: 'var(--eph-surface-2)' }}
          >
            <div className="font-body text-sm font-medium" style={{ color: 'var(--eph-text)' }}>{t.title}</div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em]" style={{ color: 'var(--eph-muted)' }}>{t.duration}</div>
          </button>
        ))}
        {examples.map((e) => (
          <div
            key={e.title}
            className="border p-4"
            style={{ borderColor: 'var(--eph-line)', background: 'var(--eph-hatch)', opacity: 0.7 }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="font-body text-sm font-medium" style={{ color: 'var(--eph-muted)' }}>{e.title}</div>
              <span className="font-mono text-[9px] uppercase tracking-[0.1em]" style={{ color: 'var(--eph-faint)' }}>Ejemplo</span>
            </div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em]" style={{ color: 'var(--eph-faint)' }}>{e.duration}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
