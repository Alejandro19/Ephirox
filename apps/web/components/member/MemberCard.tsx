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
      </div>
    </div>
  );
}
