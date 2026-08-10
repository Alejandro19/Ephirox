'use client';

import type { ReactElement, ReactNode } from 'react';
import type { CommunityEvent } from '../../lib/events-client';
import type { CommunityTherapy } from '../../lib/therapies-client';
import {
  formatEventDateTime,
  eventCategoryIcon,
  therapyCategoryIcon,
  type EventCategoryKey,
  type TherapyCategoryKey,
} from '../../lib/community-logic';
import {
  IconSnowflake,
  IconYoga,
  IconRun,
  IconFlame,
  IconHandshake,
  IconCalendar,
  IconMassage,
  IconStethoscope,
  IconSalad,
  IconBrain,
} from '../ui/icons';

const AVATAR_COLORS = ['#D9A441', '#5B7A4E', '#8A5FA0'];

const EVENT_CATEGORY_ICON: Record<EventCategoryKey, (props: { size?: number }) => ReactElement> = {
  ice: IconSnowflake,
  mindful: IconYoga,
  activity: IconRun,
  heat: IconFlame,
  social: IconHandshake,
  default: IconCalendar,
};

const THERAPY_CATEGORY_ICON: Record<TherapyCategoryKey, (props: { size?: number }) => ReactElement> = {
  massage: IconMassage,
  physio: IconStethoscope,
  nutrition: IconSalad,
  mental: IconBrain,
  default: IconCalendar,
};

export function AttendanceStrip({ count, capacity }: { count: number; capacity: number | null }) {
  const avatarCount = Math.min(count, 3);
  const spotsLeft = capacity ? Math.max(capacity - count, 0) : null;
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2.5 rounded-xl bg-[var(--page-bg)] px-3.5 py-2.5 text-xs text-[var(--ink-secondary)]">
      {avatarCount > 0 && (
        <div className="flex -space-x-2">
          {Array.from({ length: avatarCount }).map((_, i) => (
            <div key={i} className="h-6 w-6 rounded-full border-2 border-[var(--page-bg)]" style={{ background: AVATAR_COLORS[i] }} />
          ))}
        </div>
      )}
      <span>
        {count} persona{count === 1 ? '' : 's'} confirmada{count === 1 ? '' : 's'}
      </span>
      {spotsLeft !== null && (
        <span className="ml-auto whitespace-nowrap font-semibold text-[var(--hero-piedra-accent)]">
          Quedan {spotsLeft} lugar{spotsLeft === 1 ? '' : 'es'}
        </span>
      )}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--hero-piedra-accent)]">{label}</p>
      <p className="text-sm font-semibold text-[var(--ink)]">{value}</p>
    </div>
  );
}

export function EventCard({ event, action }: { event: CommunityEvent; action?: ReactNode }) {
  const EventIcon = EVENT_CATEGORY_ICON[eventCategoryIcon(event.title)];
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-hairline)] bg-[var(--paper)] p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[var(--page-bg)] text-[var(--hero-piedra-accent)]">
          <EventIcon size={20} />
        </div>
        <div className="flex-1">
          <p className="font-serif text-base font-bold text-[var(--ink)]">{event.title}</p>
          {event.description && <p className="mt-1 text-sm text-[var(--ink-secondary)]">{event.description}</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <InfoField label="Fecha" value={formatEventDateTime(event.eventDate)} />
        <InfoField label="Lugar" value={event.location || '-'} />
      </div>
      <AttendanceStrip count={event.confirmed_count || 0} capacity={event.capacity} />
      {action}
    </div>
  );
}

export function TherapyCard({ therapy, action }: { therapy: CommunityTherapy; action?: ReactNode }) {
  const TherapyIcon = THERAPY_CATEGORY_ICON[therapyCategoryIcon(therapy.title)];
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-hairline)] bg-[var(--paper)] p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[var(--page-bg)] text-[var(--hero-piedra-accent)]">
          <TherapyIcon size={20} />
        </div>
        <div className="flex-1">
          <p className="font-serif text-base font-bold text-[var(--ink)]">
            {therapy.title}
            {therapy.discountPct ? (
              <span
                className="ml-2 inline-block rounded-full px-2.5 py-1 align-middle text-[11px] font-bold"
                style={{ background: 'var(--hero-espresso)', color: 'var(--hero-espresso-accent)' }}
              >
                -{therapy.discountPct}%
              </span>
            ) : null}
          </p>
          {therapy.description && <p className="mt-1 text-sm text-[var(--ink-secondary)]">{therapy.description}</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <InfoField label="Proveedor" value={therapy.provider || '-'} />
        <InfoField label="Descuento" value={therapy.discountPct ? `-${therapy.discountPct}%` : '-'} />
      </div>
      <AttendanceStrip count={therapy.confirmed_count || 0} capacity={null} />
      {action}
    </div>
  );
}
