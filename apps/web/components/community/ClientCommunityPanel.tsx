'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { listEvents, reserveEvent, cancelEventReservation, listMyEventReservations } from '../../lib/events-client';
import { listTherapies, reserveTherapy, cancelTherapyReservation, listMyTherapyReservations } from '../../lib/therapies-client';
import { listRetreats, reserveRetreat, cancelRetreatReservation, listMyRetreatReservations } from '../../lib/retreats-client';
import { fetchClient } from '../../lib/clients-client';
import { PermissionDeniedError } from '../../lib/api-client';
import { pickMantra } from '../../lib/mantra-bank';
import { formatEventDateTime } from '../../lib/community-logic';
import IdentityHeader from '../ui/IdentityHeader';
import MantraCard from '../ui/MantraCard';
import LockedBenefit from '../ui/LockedBenefit';
import EmptyState from '../ui/EmptyState';
import { IconFlame } from '../ui/icons';
import { EventCard, TherapyCard, RetreatCard } from './CommunityVisuals';

function ReserveButton({ reserved, onReserve, onCancel }: { reserved: boolean; onReserve: () => void; onCancel: () => void }) {
  return reserved ? (
    <button
      type="button"
      onClick={onCancel}
      className="mt-4 h-11 w-full rounded-full border border-[var(--border-input)] text-sm font-semibold text-[var(--ink)]"
    >
      Cancelar reserva
    </button>
  ) : (
    <button type="button" onClick={onReserve} className="mt-4 h-11 w-full rounded-full bg-[var(--ink)] text-sm font-semibold text-white">
      Reservar mi lugar
    </button>
  );
}

async function fetchCommunityBundle(clientId: string) {
  const [eventsList, therapiesList, retreatsList, myEvents, myTherapies, myRetreats, client] = await Promise.all([
    listEvents(),
    listTherapies().catch(() => []),
    listRetreats().catch(() => []),
    listMyEventReservations(clientId).catch(() => []),
    listMyTherapyReservations(clientId).catch(() => []),
    listMyRetreatReservations(clientId).catch(() => []),
    fetchClient(clientId).catch(() => null),
  ]);
  return {
    events: eventsList,
    therapies: therapiesList,
    retreats: retreatsList,
    myEventReservations: myEvents,
    myTherapyReservations: myTherapies,
    myRetreatReservations: myRetreats,
    // Eventos nunca cambia por tipo de cliente; Terapias y Retiros (experiencia
    // premium/paga) se bloquean solo para lead_wellness — 1:1 y online se
    // comportan igual.
    therapiesUnlocked: client?.clientType !== 'lead_wellness',
    retreatsUnlocked: client?.clientType !== 'lead_wellness',
  };
}

export function ClientCommunityPanel({ clientId }: { clientId: string }) {
  const [tab, setTab] = useState<'events' | 'therapies' | 'retreats'>('events');
  const [mantra] = useState(() => pickMantra('community'));
  const [actionError, setActionError] = useState<string | null>(null);
  const { data, error: loadError, isLoading, mutate } = useSWR(['community-bundle', clientId], () =>
    fetchCommunityBundle(clientId),
  );

  async function handleReserveEvent(id: string) {
    try {
      await reserveEvent(id);
      await mutate();
    } catch (e) {
      setActionError((e as Error).message);
    }
  }
  async function handleCancelEvent(id: string) {
    try {
      await cancelEventReservation(id);
      await mutate();
    } catch (e) {
      setActionError((e as Error).message);
    }
  }
  async function handleReserveTherapy(id: string) {
    try {
      await reserveTherapy(id);
      await mutate();
    } catch (e) {
      setActionError((e as Error).message);
    }
  }
  async function handleCancelTherapy(id: string) {
    try {
      await cancelTherapyReservation(id);
      await mutate();
    } catch (e) {
      setActionError((e as Error).message);
    }
  }
  async function handleReserveRetreat(id: string) {
    try {
      await reserveRetreat(id);
      await mutate();
    } catch (e) {
      setActionError((e as Error).message);
    }
  }
  async function handleCancelRetreat(id: string) {
    try {
      await cancelRetreatReservation(id);
      await mutate();
    } catch (e) {
      setActionError((e as Error).message);
    }
  }

  const header = (
    <>
      <IdentityHeader title="La tribu esta semana" subtitle="Presencia, no competencia." />
      {mantra && <MantraCard mantra={mantra} />}
    </>
  );

  if (isLoading) {
    return (
      <div>
        {header}
        <p className="text-sm text-[var(--ink-secondary)]">Cargando el Club…</p>
      </div>
    );
  }
  if (loadError && loadError instanceof PermissionDeniedError) {
    return (
      <div>
        {header}
        <LockedBenefit variant="upgrade" benefit="la comunidad y sus beneficios" />
      </div>
    );
  }
  const error = actionError || (loadError ? (loadError as Error).message : null);
  if (error) {
    return (
      <div>
        {header}
        <p role="alert" className="text-[var(--danger)]">
          {error}
        </p>
      </div>
    );
  }
  if (!data) return null;

  const { events, therapies, retreats, myEventReservations, myTherapyReservations, myRetreatReservations, therapiesUnlocked, retreatsUnlocked } = data;
  const nextEvent = events[0];
  const nextEventConfirmed = nextEvent?.confirmed_count || 0;

  const eventsBody =
    events.length > 0 ? (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {events.map((ev) => (
          <EventCard
            key={ev.id}
            event={ev}
            action={
              <ReserveButton
                reserved={myEventReservations.some((r) => r.eventId === ev.id && r.status === 'confirmada')}
                onReserve={() => handleReserveEvent(ev.id)}
                onCancel={() => handleCancelEvent(ev.id)}
              />
            }
          />
        ))}
      </div>
    ) : (
      <EmptyState message="No hay eventos disponibles por ahora." />
    );

  const therapiesBody =
    therapies.length > 0 ? (
      <div className="space-y-4">
        {therapies.map((t) => (
          <TherapyCard
            key={t.id}
            therapy={t}
            action={
              <ReserveButton
                reserved={myTherapyReservations.some((r) => r.therapyId === t.id && r.status === 'confirmada')}
                onReserve={() => handleReserveTherapy(t.id)}
                onCancel={() => handleCancelTherapy(t.id)}
              />
            }
          />
        ))}
      </div>
    ) : (
      <EmptyState message="No hay terapias disponibles por ahora." />
    );

  const retreatsBody =
    retreats.length > 0 ? (
      <div className="space-y-4">
        {retreats.map((r) => (
          <RetreatCard
            key={r.id}
            retreat={r}
            action={
              <ReserveButton
                reserved={myRetreatReservations.some((res) => res.retreatId === r.id && res.status === 'confirmada')}
                onReserve={() => handleReserveRetreat(r.id)}
                onCancel={() => handleCancelRetreat(r.id)}
              />
            }
          />
        ))}
      </div>
    ) : (
      <EmptyState message="No hay retiros disponibles por ahora." />
    );

  return (
    <div>
      {header}

      <div
        className="relative mt-8 mb-6 overflow-hidden rounded-[var(--radius-hero)] p-7"
        style={{ background: 'var(--hero-espresso)', color: 'var(--hero-espresso-text)' }}
      >
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-[180px] w-[180px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(217,183,126,.18) 0%, transparent 70%)' }}
        />
        <p className="relative z-10 mb-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--hero-espresso-accent)' }}>{nextEvent ? 'Próximo evento' : 'Club Wellness'}</p>
        <p className="relative z-10 mb-1 font-serif text-2xl font-bold">{nextEvent ? nextEvent.title : 'Aún no hay eventos programados'}</p>
        <p className="relative z-10 text-sm" style={{ color: 'var(--hero-espresso-text-muted)' }}>
          {nextEvent
            ? `${formatEventDateTime(nextEvent.eventDate)}${nextEvent.location ? ' · ' + nextEvent.location : ''}`
            : 'Tu coach publicará el próximo evento pronto.'}
        </p>
        {nextEventConfirmed > 0 && (
          <p className="relative z-10 mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: 'var(--hero-espresso-accent)' }}>
            <IconFlame size={12} /> {nextEventConfirmed} persona{nextEventConfirmed === 1 ? '' : 's'} ya confirmaron su lugar
          </p>
        )}
      </div>

      <div className="mb-5 flex gap-2.5">
        <button
          type="button"
          onClick={() => setTab('events')}
          className="h-10 rounded-full px-5 text-sm font-semibold transition-colors"
          style={tab === 'events'
            ? { background: 'var(--hero-piedra-accent)', color: '#fff' }
            : { border: '1px solid var(--border-input)', color: 'var(--ink-secondary)' }}
        >
          Eventos
        </button>
        <button
          type="button"
          onClick={() => setTab('therapies')}
          className="h-10 rounded-full px-5 text-sm font-semibold transition-colors"
          style={tab === 'therapies'
            ? { background: 'var(--hero-piedra-accent)', color: '#fff' }
            : { border: '1px solid var(--border-input)', color: 'var(--ink-secondary)' }}
        >
          Terapias
        </button>
        <button
          type="button"
          onClick={() => setTab('retreats')}
          className="h-10 rounded-full px-5 text-sm font-semibold transition-colors"
          style={tab === 'retreats'
            ? { background: 'var(--hero-piedra-accent)', color: '#fff' }
            : { border: '1px solid var(--border-input)', color: 'var(--ink-secondary)' }}
        >
          Retiros
        </button>
      </div>

      {tab === 'events' ? (
        eventsBody
      ) : tab === 'therapies' ? (
        therapiesUnlocked ? (
          therapiesBody
        ) : (
          <LockedBenefit variant="upgrade" benefit="descuentos reales en spa, terapia, fisioterapia">
            {therapies.length > 0 ? (
              <div className="space-y-4">
                {therapies.slice(0, 3).map((t) => (
                  <TherapyCard key={t.id} therapy={t} />
                ))}
              </div>
            ) : (
              <EmptyState message="No hay terapias disponibles por ahora." />
            )}
          </LockedBenefit>
        )
      ) : retreatsUnlocked ? (
        retreatsBody
      ) : (
        <LockedBenefit variant="upgrade" benefit="reservar retiros">
          {retreats.length > 0 ? (
            <div className="space-y-4">
              {retreats.slice(0, 3).map((r) => (
                <RetreatCard key={r.id} retreat={r} />
              ))}
            </div>
          ) : (
            <EmptyState message="No hay retiros disponibles por ahora." />
          )}
        </LockedBenefit>
      )}
    </div>
  );
}
