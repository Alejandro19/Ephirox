'use client';

import type { StressTechnique } from '../../lib/stress-client';
import Button from '../ui/Button';

// "Recomendado para ti ahora" (spec 16.3) — reemplaza la vieja recomendación
// genérica emparejada por emoción de check-in (ya no existe esa feature).
// Por ahora, la primera técnica asignada por el admin (sortOrder); cuando
// exista un protocolo real asignado (Fase 2-3 del plan), esta card se
// reapunta a ese protocolo sin cambiar su UI.
export function RecommendedProtocolCard({ protocol, onStart }: { protocol: StressTechnique; onStart: (id: string) => void }) {
  return (
    <div
      className="relative mt-8 mb-5 overflow-hidden rounded-[0] p-7 text-center"
      style={{ background: 'var(--eph-surface)', color: 'var(--eph-text)' }}
    >
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-[180px] w-[180px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(217,183,126,.18) 0%, transparent 70%)' }}
      />
      <p className="relative z-10 mb-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--eph-accent)' }}>
        Recomendado para ti ahora
      </p>
      <h3 className="eph-num relative z-10 mb-2 font-display text-2xl" style={{ color: 'var(--eph-text)' }}>{protocol.title}</h3>
      <p className="relative z-10 mb-4 font-body text-sm" style={{ color: 'var(--eph-body)' }}>
        {protocol.description || 'Tu protocolo de regulación recomendado para hoy.'}
      </p>
      <span className="relative z-10 inline-block">
        <Button type="button" variant="primary" onClick={() => onStart(protocol.id)}>
          Empezar protocolo
        </Button>
      </span>
    </div>
  );
}
