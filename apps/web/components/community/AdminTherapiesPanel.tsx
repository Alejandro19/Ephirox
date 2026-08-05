'use client';

import { useEffect, useState } from 'react';
import { listTherapies, createTherapy, deleteTherapy, type CommunityTherapy } from '../../lib/therapies-client';

export function AdminTherapiesPanel() {
  const [therapies, setTherapies] = useState<CommunityTherapy[]>([]);
  const [title, setTitle] = useState('');
  const [provider, setProvider] = useState('');
  const [discountPct, setDiscountPct] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refetch() {
    setTherapies(await listTherapies());
  }

  useEffect(() => {
    refetch()
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    if (!title.trim()) return;
    try {
      await createTherapy({ title: title.trim(), provider: provider || undefined, discount_pct: discountPct ? Number(discountPct) : undefined });
      setTitle('');
      setProvider('');
      setDiscountPct('');
      await refetch();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleDelete(therapyId: string) {
    try {
      await deleteTherapy(therapyId);
      await refetch();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (loading) return <p>Cargando terapias...</p>;

  return (
    <div>
      {error && <p role="alert">{error}</p>}

      <label htmlFor="therapy-title">Título de la terapia</label>
      <input id="therapy-title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <label htmlFor="therapy-provider">Aliado</label>
      <input id="therapy-provider" value={provider} onChange={(e) => setProvider(e.target.value)} />
      <label htmlFor="therapy-discount">Descuento (%)</label>
      <input id="therapy-discount" type="number" value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} />
      <button type="button" onClick={handleCreate}>
        + Agregar terapia
      </button>

      {therapies.length === 0 ? (
        <p>Aún no hay terapias.</p>
      ) : (
        <ul>
          {therapies.map((therapy) => (
            <li key={therapy.id}>
              {therapy.title} — {therapy.confirmed_count} confirmados
              <button type="button" onClick={() => handleDelete(therapy.id)}>
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}