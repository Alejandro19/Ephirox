'use client';

import { useEffect, useState } from 'react';
import { getConfirmedReservations } from '../../lib/community-reservations-client';

export function AdminReservationsPanel() {
  const [eventReservations, setEventReservations] = useState<Array<any>>([]);
  const [therapyReservations, setTherapyReservations] = useState<Array<any>>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refetch() {
    try {
      const result = await getConfirmedReservations();
      setEventReservations(result.eventReservations);
      setTherapyReservations(result.therapyReservations);
    } catch (e) {
      setError((e as Error).message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refetch();
  }, []);

  if (loading) return <p>Cargando reservaciones...</p>;

  if (error) return <p role="alert">{error}</p>;

  if (eventReservations.length === 0 && therapyReservations.length === 0) {
    return <p>No hay reservaciones confirmadas.</p>;
  }

  return (
    <div>
      <h2>Reservaciones de Eventos</h2>
      {eventReservations.length === 0 ? (
        <p>No hay reservaciones de eventos confirmadas.</p>
      ) : (
        <ul>
          {eventReservations.map((res) => (
            <li key={res.id} style={{ padding: '1rem 0', borderBottom: '1px solid #eee' }}>
              <div>
                <strong>{res.clientName}</strong>{' '}
                {res.clientPhone && <span>({res.clientPhone})</span>}
              </div>
              <div>
                <strong>Evento:</strong> {res.eventTitle}
                {res.eventDate && <br /> }
                <small>Fecha: {new Date(res.eventDate).toLocaleString()}</small>
                {res.eventLocation && <br /> }
                <small>Ubicación: {res.eventLocation}</small>
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2>Reservaciones de Terapias</h2>
      {therapyReservations.length === 0 ? (
        <p>No hay reservaciones de terapias confirmadas.</p>
      ) : (
        <ul>
          {therapyReservations.map((res) => (
            <li key={res.id} style={{ padding: '1rem 0', borderBottom: '1px solid #eee' }}>
              <div>
                <strong>{res.clientName}</strong>{' '}
                {res.clientPhone && <span>({res.clientPhone})</span>}
              </div>
              <div>
                <strong>Terapia:</strong> {res.therapyTitle}
                {res.therapyProvider && <br /> }
                <small>Proveedor: {res.therapyProvider}</small>
                {res.therapyDiscountPct !== null && res.therapyDiscountPct > 0 && (
                  <>
                    <br />
                    <small>Descuento: {res.therapyDiscountPct}%</small>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}