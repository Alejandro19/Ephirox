'use client';

import { useEffect, useState } from 'react';
import { listTherapies, reserveTherapy, cancelTherapyReservation, listMyTherapyReservations, type CommunityTherapy } from '../../lib/therapies-client';

export function ClientTherapiesPanel({ clientId }: { clientId: string }) {
  const [therapies, setTherapies] = useState<CommunityTherapy[]>([]);
  const [myReservations, setMyReservations] = useState<Array<{ therapyId: string; status: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      const [therapiesList, reservationsList] = await Promise.all([
        listTherapies(),
        listMyTherapyReservations(clientId),
      ]);
      setTherapies(therapiesList);
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

  async function handleReserve(therapyId: string) {
    try {
      await reserveTherapy(therapyId);
      await loadData(); // Refresh data
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleCancel(therapyId: string) {
    try {
      await cancelTherapyReservation(therapyId);
      await loadData(); // Refresh data
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (loading) return <p>Cargando terapias...</p>;
  if (error) return <p role="alert">{error}</p>;

  return (
    <div>
      {therapies.length === 0 ? (
        <p>Aún no hay terapias disponibles.</p>
      ) : (
        <ul>
          {therapies.map((therapy) => (
            <li key={therapy.id} style={{ padding: '1rem 0', borderBottom: '1px solid #eee' }}>
              <div>
                <strong>{therapy.title}</strong>
                {therapy.description && <p style={{ margin: '0.5rem 0' }}>{therapy.description}</p>}
                {therapy.provider && <p><strong>Aliado:</strong> {therapy.provider}</p>}
                {therapy.discountPct !== null && therapy.discountPct > 0 && (
                  <p><strong>Descuento:</strong> {therapy.discountPct}%</p>
                )}
                <p><strong>Reservados:</strong> {therapy.confirmed_count}</p>
              </div>
              <div>
                {myReservations.some(r => r.therapyId === therapy.id && r.status === 'confirmada') ? (
                  <button onClick={() => handleCancel(therapy.id)}>
                    Cancelar reserva
                  </button>
                ) : (
                  <button onClick={() => handleReserve(therapy.id)}>
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