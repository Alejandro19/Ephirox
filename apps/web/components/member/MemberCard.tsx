'use client';

import useSWR from 'swr';
import { fetchClient } from '../../lib/clients-client';
import { MEMBERSHIP_LABELS } from '../../lib/constants';
import BrandRing from '../ui/BrandRing';

function formatMemberNumber(n: number): string {
  return String(n).padStart(5, '0');
}

function formatJoinDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatPlanDate(isoDate: string): string {
  return new Date(isoDate + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function MemberCard({ clientId }: { clientId: string }) {
  const { data: client } = useSWR(['client-detail-for-member-card', clientId], () => fetchClient(clientId));

  // Sin card mientras carga, si la membresía todavía no fue activada, o si
  // por algún motivo aún no tiene número asignado (activación en curso).
  if (!client || client.status !== 'active' || client.memberNumber == null) return null;

  return (
    <div
      className="relative mb-8 overflow-hidden rounded-[var(--radius-hero)] p-7"
      style={{ background: 'var(--hero-espresso)', color: 'var(--hero-espresso-text)' }}
    >
      <div className="flex items-center gap-2.5">
        <BrandRing size={24} background="var(--hero-espresso)" />
        <span className="font-serif text-base font-bold">La Tribu</span>
      </div>

      <p className="mt-6 font-serif text-xl font-semibold">{client.name}</p>
      <p className="mt-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--hero-espresso-accent)' }}>
        Miembro N.° {formatMemberNumber(client.memberNumber)}
      </p>

      <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2">
        <div>
          <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--hero-espresso-text-muted)' }}>Membresía</p>
          <p className="text-[13px] font-semibold">{MEMBERSHIP_LABELS[client.clientType] || client.clientType}</p>
        </div>
        {client.activatedAt && (
          <div>
            <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--hero-espresso-text-muted)' }}>Miembro desde</p>
            <p className="text-[13px] font-semibold">{formatJoinDate(client.activatedAt)}</p>
          </div>
        )}
        {client.clientType === 'coaching_1_1' && client.sessionsTotal != null && client.sessionsRemaining != null && (
          <div>
            <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--hero-espresso-text-muted)' }}>Clases</p>
            <p className="text-[13px] font-semibold">
              Quedan {client.sessionsRemaining} de {client.sessionsTotal}
            </p>
          </div>
        )}
        {client.planEndDate && (() => {
          // Pago único por periodo, no suscripción — al vencer, vuelve a
          // pagar en /configuracion/membresias. Mismo acento dorado que ya
          // usa esta card (Miembro N.°) para la fecha vencida — la card no
          // tiene ningún color de alerta hoy, y el dorado ya es el acento
          // de atención en el resto de la app.
          const expired = new Date().toISOString().slice(0, 10) > client.planEndDate!;
          return (
            <div>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--hero-espresso-text-muted)' }}>
                {expired ? 'Venció' : 'Vence'}
              </p>
              <p
                className="text-[13px] font-semibold"
                style={expired ? { color: 'var(--hero-espresso-accent)' } : undefined}
              >
                {formatPlanDate(client.planEndDate)}
              </p>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
