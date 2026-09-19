'use client';

import Link from 'next/link';
import EmptyState from '@/components/ui/EmptyState';
import MetricValue from '@/components/ui/MetricValue';
import type { MorningCheckin } from '@/lib/stress-client';
import type { ModuleAccessState } from '@/lib/module-access';

// Reemplaza al viejo formulario de check-in matutino (MorningCheckinPrompt):
// el envío ahora vive únicamente en el Ritual Diario del Dashboard (exclusivo
// Mentoría) — Stress solo muestra un resumen de solo lectura de lo ya
// respondido, nunca un formulario que podría no funcionar para este cliente.

const CHECKIN_METRICS: { key: 'energia' | 'tension' | 'claridad'; label: string; caption: string }[] = [
  { key: 'energia', label: 'Energía', caption: 'Cómo te sentiste al despertar.' },
  { key: 'tension', label: 'Tensión', caption: 'Tensión física percibida hoy.' },
  { key: 'claridad', label: 'Claridad', caption: 'Qué tan clara sentiste la mente.' },
];

// Intercambio de diseño pedido con "Tus protocolos" (StressProtocolLibrary):
// el check-in toma el tratamiento que antes tenía esa librería para su
// estado "Activo ahora" — borde dorado fino + degradado cálido + texto
// alineado a la izquierda. Un solo color dorado uniforme en las 3 cards
// (no un tono distinto por métrica): con 3 bordes de color distinto se veían
// "salteadas" — corregido a pedido explícito, con el mismo tratamiento
// visual en todas, igual que las cards de Tus protocolos.
const checkinCardStyle: React.CSSProperties = {
  background: 'linear-gradient(160deg, color-mix(in srgb, var(--eph-accent) 14%, var(--eph-surface-2)) 0%, var(--eph-surface-2) 100%)',
  border: '1px solid var(--eph-accent)',
  padding: '14px 14px',
};

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
      {/* 3 columnas fijas, también en mobile (mismo criterio que el grid de
          macros de Nutrition) — cards más chicas para que quepan cómodas. */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {CHECKIN_METRICS.map((m) => (
          <div key={m.key} style={checkinCardStyle}>
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--eph-accent)', margin: 0 }}>
              {m.label}
            </p>
            <div className="mt-1.5">
              {/* MetricValue (spec §2.1): única forma correcta de escribir una
                  cifra en Cormorant — mismo componente que usan Nutrition/
                  Sleep/Ejercicio, así los números quedan igual de legibles. */}
              <MetricValue value={morningCheckin[m.key]} unit="/5" size="secondary" />
            </div>
            <p className="mt-1 font-body text-[11px] leading-snug" style={{ color: 'var(--eph-body)' }}>{m.caption}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MorningCheckinSummary;
