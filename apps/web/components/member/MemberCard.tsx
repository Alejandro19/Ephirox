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
      className="relative mb-8 overflow-hidden rounded-[0] p-7"
      style={{ background: 'var(--eph-surface)', color: 'var(--eph-text)' }}
    >
      <div className="flex items-center gap-2.5">
        <BrandRing size={24} />
        <span className="font-display text-base font-normal uppercase tracking-[0.1em]">Ephirox</span>
      </div>

      <p className="mt-6 font-display text-xl font-normal">{client.name}</p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: 'var(--eph-accent)' }}>
        Miembro N.° {formatMemberNumber(client.memberNumber)}
      </p>

      <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2">
        <div>
          <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--eph-muted)' }}>Membresía</p>
          <p className="text-[13px] font-semibold">{MEMBERSHIP_LABELS[client.clientType] || client.clientType}</p>
        </div>
        {client.activatedAt && (
          <div>
            <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--eph-muted)' }}>Miembro desde</p>
            <p className="text-[13px] font-semibold">{formatJoinDate(client.activatedAt)}</p>
          </div>
        )}
        {client.clientType === 'coaching_1_1' && client.sessionsTotal != null && client.sessionsRemaining != null && (
          <div>
            <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--eph-muted)' }}>Clases</p>
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
              <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--eph-muted)' }}>
                {expired ? 'Venció' : 'Vence'}
              </p>
              <p
                className="text-[13px] font-semibold"
                style={expired ? { color: 'var(--eph-accent)' } : undefined}
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
