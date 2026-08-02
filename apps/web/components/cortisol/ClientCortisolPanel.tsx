'use client';

import { useEffect, useState } from 'react';
import { listTechniques, markCompletion, getTodayCheckin, postCheckin, getTipOfTheDay, type CortisolTechnique, type CortisolTip, type CortisolCheckin } from '../../lib/cortisol-client';

const EMOTIONS = ['ansioso', 'irritable', 'cansado', 'abrumado', 'tranquilo', 'energia'];

export function ClientCortisolPanel({ clientId }: { clientId: string }) {
  const [techniques, setTechniques] = useState<CortisolTechnique[]>([]);
  const [tip, setTip] = useState<CortisolTip>(null);
  const [checkin, setCheckin] = useState<CortisolCheckin>(null);
  const [emotion, setEmotion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listTechniques(clientId), getTipOfTheDay(clientId), getTodayCheckin(clientId)])
      .then(([techniqueList, tipOfDay, todayCheckin]) => {
        setTechniques(techniqueList);
        setTip(tipOfDay);
        setCheckin(todayCheckin);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [clientId]);

  async function handleComplete() {
    try {
      await markCompletion(clientId);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleCheckin() {
    if (!emotion) return;
    try {
      const saved = await postCheckin(clientId, emotion);
      setCheckin(saved);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (loading) return <p>Cargando técnicas de cortisol...</p>;
  if (error) return <p role="alert">{error}</p>;

  return (
    <div>
      {tip && <p>{tip.content}</p>}

      <label htmlFor="cortisol-emotion">¿Cómo te sientes ahora mismo?</label>
      <select id="cortisol-emotion" value={emotion || checkin?.emotion || ''} onChange={(e) => setEmotion(e.target.value)}>
        <option value="">Selecciona</option>
        {EMOTIONS.map((e) => (
          <option key={e} value={e}>
            {e}
          </option>
        ))}
      </select>
      <button type="button" onClick={handleCheckin}>
        Guardar check-in
      </button>

      {techniques.length === 0 ? (
        <p>Todavía no tienes técnicas asignadas.</p>
      ) : (
        <ul>
          {techniques.map((technique) => (
            <li key={technique.id}>
              {technique.title}
              <button type="button" onClick={handleComplete}>
                Marcar como completado hoy
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
