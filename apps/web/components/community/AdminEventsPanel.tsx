'use client';

import { useEffect, useState } from 'react';
import { listEvents, createEvent, deleteEvent, type CommunityEvent } from '../../lib/events-client';

export function AdminEventsPanel() {
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refetch() {
    setEvents(await listEvents());
  }

  useEffect(() => {
    refetch()
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    if (!title.trim()) return;
    try {
      await createEvent({ title: title.trim(), location: location || undefined, capacity: capacity ? Number(capacity) : undefined });
      setTitle('');
      setLocation('');
      setCapacity('');
      await refetch();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleDelete(eventId: string) {
    try {
      await deleteEvent(eventId);
      await refetch();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (loading) return <p>Cargando eventos...</p>;

  return (
    <div>
      {error && <p role="alert">{error}</p>}

      <label htmlFor="event-title">Título del evento</label>
      <input id="event-title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <label htmlFor="event-location">Ubicación</label>
      <input id="event-location" value={location} onChange={(e) => setLocation(e.target.value)} />
      <label htmlFor="event-capacity">Capacidad</label>
      <input id="event-capacity" type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
      <button type="button" onClick={handleCreate}>
        + Agregar evento
      </button>

      {events.length === 0 ? (
        <p>Aún no hay eventos.</p>
      ) : (
        <ul>
          {events.map((event) => (
            <li key={event.id}>
              {event.title} — {event.confirmed_count} confirmados
              <button type="button" onClick={() => handleDelete(event.id)}>
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}