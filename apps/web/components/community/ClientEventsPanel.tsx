'use client';

import { useEffect, useState } from 'react';
import { listEvents, reserveEvent, cancelEventReservation, listMyEventReservations, type CommunityEvent } from '../../lib/events-client';

export function ClientEventsPanel({ clientId }: { clientId: string }) {
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [myReservations, setMyReservations] = useState<Array<{ eventId: string; status: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      const [eventsList, reservationsList] = await Promise.all([
        listEvents(),
        listMyEventReservations(clientId),
      ]);
      setEvents(eventsList);
      setMyReservations(reservationsList);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [clientId]);

  async function handleReserve(eventId: string) {
    try {
      await reserveEvent(eventId);
      await loadData(); // Refresh data
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleCancel(eventId: string) {
    try {
      await cancelEventReservation(eventId);
      await loadData(); // Refresh data
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (loading) return <p>Cargando eventos...</p>;
  if (error) return <p role="alert">{error}</p>;

  return (
    <div>
      {events.length === 0 ? (
        <p>Aún no hay eventos disponibles.</p>
      ) : (
        <ul>
          {events.map((event) => (
            <li key={event.id} style={{ padding: '1rem 0', borderBottom: '1px solid #eee' }}>
              <div>
                <strong>{event.title}</strong>
                {event.description && <p style={{ margin: '0.5rem 0' }}>{event.description}</p>}
                {event.location && <p><strong>Ubicación:</strong> {event.location}</p>}
                {event.eventDate && <p><strong>Fecha:</strong> {new Date(event.eventDate).toLocaleString()}</p>}
                {event.capacity !== null && <p><strong>Capacidad:</strong> {event.capacity} personas</p>}
                <p><strong>Confirmados:</strong> {event.confirmed_count}</p>
              </div>
              <div>
                {myReservations.some(r => r.eventId === event.id && r.status === 'confirmada') ? (
                  <button onClick={() => handleCancel(event.id)}>
                    Cancelar reserva
                  </button>
                ) : (
                  <button onClick={() => handleReserve(event.id)}>
                    Reservar
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}