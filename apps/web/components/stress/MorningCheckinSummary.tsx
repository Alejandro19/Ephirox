'use client';

import Link from 'next/link';
import EmptyState from '@/components/ui/EmptyState';
import type { MorningCheckin } from '@/lib/stress-client';
import type { ModuleAccessState } from '@/lib/module-access';

// Reemplaza al viejo formulario de check-in matutino (MorningCheckinPrompt):
// el envío ahora vive únicamente en el Ritual Diario del Dashboard (exclusivo
// Mentoría) — Stress solo muestra un resumen de solo lectura de lo ya
// respondido, nunca un formulario que podría no funcionar para este cliente.

// Tonos semánticos ya existentes en tema.css (spec 26.3: "no inventar una
// paleta nueva"). No existe un token verde/positivo dedicado — Energía usa
// --eph-steel (el único tono distinto de dorado/terracota que ya tiene la
// app) en su lugar, dorado queda para Claridad y terracota para Tensión.
const CHECKIN_METRICS: { key: 'energia' | 'tension' | 'claridad'; label: string; color: string; caption: string }[] = [
  { key: 'energia', label: 'Energía', color: 'var(--eph-steel)', caption: 'Cómo te sentiste al despertar.' },
  { key: 'tension', label: 'Tensión', color: 'var(--eph-danger)', caption: 'Tensión física percibida hoy.' },
  { key: 'claridad', label: 'Claridad', color: 'var(--eph-accent)', caption: 'Qué tan clara sentiste la mente.' },
];

// Rediseño sobrio (feedback de Alejandro): el degradado + borde completo de
// color resultaba demasiado llamativo (sobre todo el de Tensión, en rojo) —
// ahora el color queda solo en una franja superior atenuada y en el label,
// el resto de la tarjeta es neutro. Texto centrado y número más grande para
// que no se lea apagada.
function checkinCardStyle(color: string): React.CSSProperties {
  return {
    background: 'var(--eph-surface-2)',
    border: '1px solid var(--eph-line)',
    borderTop: `3px solid color-mix(in srgb, ${color} 70%, var(--eph-surface-2))`,
    borderRadius: 10,
    padding: '20px 18px',
    textAlign: 'center',
  };
}

export function MorningCheckinSummary({
  morningCheckin,
  clientType,
  stressAccessState,
}: {
  morningCheckin: MorningCheckin;
  clientType?: string | null;
  stressAccessState: ModuleAccessState;
}) {
  const eligible = clientType === 'mentoring' && stressAccessState === 'ok';

  if (!eligible) {
    return (
      <div className="mb-5">
        <EmptyState message="El check-in matutino es parte del Ritual Diario, disponible para clientes Premium con Stress incluido." />
      </div>
    );
  }

  if (!morningCheckin) {
    return (
      <div className="mb-5 flex flex-col gap-2">
        <EmptyState message="Aún no respondiste tu check-in matutino de hoy." />
        <Link href="/" className="self-start font-mono text-[10px] uppercase tracking-[0.1em]" style={{ color: 'var(--eph-accent)' }}>
          Responder en tu Ritual Diario →
        </Link>
      </div>
    );
  }

  return (
    <div className="mb-5">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em]" style={{ color: 'var(--eph-muted)' }}>
        Check-in matutino de hoy
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {CHECKIN_METRICS.map((m) => (
          <div key={m.key} style={checkinCardStyle(m.color)}>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: m.color, margin: 0 }}>
              {m.label}
            </p>
            {/* .eph-num (spec §2.1): única forma correcta de escribir una cifra en
                Cormorant — sin esto, un "1" puede renderizar con la figura
                antigua de la fuente y leerse como una "I" mayúscula. */}
            <p className="eph-num" style={{ margin: '10px 0 0', fontFamily: 'var(--font-cormorant), Georgia, serif', fontWeight: 500, color: 'var(--eph-text)' }}>
              <span style={{ fontSize: 40 }}>{morningCheckin[m.key]}</span>
              <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--eph-muted)', marginLeft: 4 }}>/5</span>
            </p>
            <p className="mt-2 font-body text-sm" style={{ color: 'var(--eph-body)' }}>{m.caption}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MorningCheckinSummary;
