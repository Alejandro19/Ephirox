'use client';

import { useCallback, useEffect, useState } from 'react';
import { listEvents, reserveEvent, cancelEventReservation, listMyEventReservations, type CommunityEvent } from '../../lib/events-client';
import { listTherapies, reserveTherapy, cancelTherapyReservation, listMyTherapyReservations, type CommunityTherapy } from '../../lib/therapies-client';
import { fetchClient } from '../../lib/clients-client';
import { PermissionDeniedError } from '../../lib/api-client';
import { pickMantra } from '../../lib/mantra-bank';
import { COACH_WHATSAPP_NUMBER } from '../../lib/constants';
import { formatEventDateTime } from '../../lib/community-logic';
import IdentityHeader from '../ui/IdentityHeader';
import MantraCard from '../ui/MantraCard';
import LockedOverlay from '../ui/LockedOverlay';
import EmptyState from '../ui/EmptyState';
import { IconFlame } from '../ui/icons';
import { EventCard, TherapyCard } from './CommunityVisuals';

type MyReservation = { eventId?: string; therapyId?: string; status: string };

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

export function ClientCommunityPanel({ clientId }: { clientId: string }) {
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [therapies, setTherapies] = useState<CommunityTherapy[]>([]);
  const [myEventReservations, setMyEventReservations] = useState<MyReservation[]>([]);
  const [myTherapyReservations, setMyTherapyReservations] = useState<MyReservation[]>([]);
  const [therapiesUnlocked, setTherapiesUnlocked] = useState(true);
  const [tab, setTab] = useState<'events' | 'therapies'>('events');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionLocked, setPermissionLocked] = useState(false);
  const [mantra] = useState(() => pickMantra('community'));

  const loadAll = useCallback(async () => {
    const [eventsList, therapiesList, myEvents, myTherapies, client] = await Promise.all([
      listEvents(),
      listTherapies().catch(() => []),
      listMyEventReservations(clientId).catch(() => []),
      listMyTherapyReservations(clientId).catch(() => []),
      fetchClient(clientId).catch(() => null),
    ]);
    setEvents(eventsList);
    setTherapies(therapiesList);
    setMyEventReservations(myEvents);
    setMyTherapyReservations(myTherapies);
    // Eventos nunca cambia por tipo de cliente; Terapias solo se bloquea para
    // lead_wellness (index.html:5034-5037) — 1:1 y online se comportan igual.
    setTherapiesUnlocked(client?.clientType !== 'lead_wellness');
  }, [clientId]);

  useEffect(() => {
    loadAll()
      .catch((e: Error) => {
        if (e instanceof PermissionDeniedError) setPermissionLocked(true);
        else setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [loadAll]);

  async function handleReserveEvent(id: string) {
    try {
      await reserveEvent(id);
      await loadAll();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function handleCancelEvent(id: string) {
    try {
      await cancelEventReservation(id);
      await loadAll();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function handleReserveTherapy(id: string) {
    try {
      await reserveTherapy(id);
      await loadAll();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function handleCancelTherapy(id: string) {
    try {
      await cancelTherapyReservation(id);
      await loadAll();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const header = (
    <>
      <IdentityHeader title="La tribu esta semana" subtitle="Presencia, no competencia." />
      {mantra && <MantraCard mantra={mantra} />}
    </>
  );

  if (loading) {
    return (
      <div>
        {header}
        <p className="text-sm text-[var(--ink-secondary)]">Cargando comunidad…</p>
      </div>
    );
  }
  if (permissionLocked) {
    return (
      <div>
        {header}
        <LockedOverlay title="Módulo no disponible" subtitle="Este módulo ya no está disponible para tu tipo de cuenta.">
          <div style={{ minHeight: 200 }} />
        </LockedOverlay>
      </div>
    );
  }
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

  return (
    <div>
      {header}

      <div
        className="relative mt-8 mb-6 overflow-hidden rounded-[var(--radius-hero)] p-7"
        style={{ background: 'linear-gradient(135deg, var(--hero-piedra-start), var(--hero-piedra-end))', color: 'var(--hero-piedra-text)' }}
      >
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--hero-piedra-accent)' }}>{nextEvent ? 'Próximo evento' : 'Comunidad Wellness'}</p>
        <p className="mb-1 font-serif text-2xl font-bold">{nextEvent ? nextEvent.title : 'Aún no hay eventos programados'}</p>
        <p className="text-sm" style={{ color: 'var(--hero-piedra-text-muted)' }}>
          {nextEvent
            ? `${formatEventDateTime(nextEvent.eventDate)}${nextEvent.location ? ' · ' + nextEvent.location : ''}`
            : 'Tu coach publicará el próximo evento pronto.'}
        </p>
        {nextEventConfirmed > 0 && (
          <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: 'var(--hero-piedra-accent)' }}>
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
      </div>

      {tab === 'events' ? (
        eventsBody
      ) : therapiesUnlocked ? (
        therapiesBody
      ) : (
        <LockedOverlay
          title="Beneficios solo para clientes activos"
          subtitle="Activa un plan de Coaching con tu mentor para desbloquear descuentos reales en spa, terapia, fisioterapia y más."
          ctaLabel="Hablar con un coach"
          onCta={() => window.open(`https://wa.me/${COACH_WHATSAPP_NUMBER}`, '_blank')}
        >
          {therapies.length > 0 ? (
            <div className="space-y-4">
              {therapies.slice(0, 3).map((t) => (
                <TherapyCard key={t.id} therapy={t} />
              ))}
            </div>
          ) : (
            <EmptyState message="No hay terapias disponibles por ahora." />
          )}
        </LockedOverlay>
      )}
    </div>
  );
}
