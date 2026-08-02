'use client';

import { useEffect, useState } from 'react';
import { listTips, createTip, deleteTip, type CortisolTip } from '../../lib/cortisol-tips-client';

export function CortisolTipsPanel() {
  const [tips, setTips] = useState<CortisolTip[]>([]);
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refetch() {
    setTips(await listTips());
  }

  useEffect(() => {
    refetch()
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    if (!content.trim()) return;
    try {
      await createTip(content.trim());
      setContent('');
      await refetch();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleDelete(tipId: string) {
    try {
      await deleteTip(tipId);
      await refetch();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (loading) return <p>Cargando tips...</p>;

  return (
    <div>
      {error && <p role="alert">{error}</p>}

      <label htmlFor="tip-content">Contenido</label>
      <textarea id="tip-content" value={content} onChange={(e) => setContent(e.target.value)} />
      <button type="button" onClick={handleCreate}>
        + Agregar tip
      </button>

      {tips.length === 0 ? (
        <p>Aún no hay tips.</p>
      ) : (
        <ul>
          {tips.map((tip) => (
            <li key={tip.id}>
              {tip.content}
              <button type="button" onClick={() => handleDelete(tip.id)}>
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
