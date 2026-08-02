'use client';

import { useEffect, useState } from 'react';
import { listTechniques, createTechnique, deleteTechnique, uploadTechniqueVideo, uploadTechniqueAudio, type CortisolTechnique } from '../../lib/cortisol-client';

export function AdminCortisolPanel({ clientId }: { clientId: string }) {
  const [techniques, setTechniques] = useState<CortisolTechnique[]>([]);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refetch() {
    setTechniques(await listTechniques(clientId));
  }

  useEffect(() => {
    refetch()
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [clientId]);

  async function handleCreate() {
    if (!title.trim()) return;
    try {
      await createTechnique(clientId, {
        title: title.trim(),
        type: type || undefined,
        duration_minutes: durationMinutes ? Number(durationMinutes) : undefined,
      });
      setTitle('');
      setType('');
      setDurationMinutes('');
      await refetch();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleDelete(techId: string) {
    try {
      await deleteTechnique(clientId, techId);
      await refetch();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleUploadVideo(techId: string, file: File) {
    try {
      await uploadTechniqueVideo(clientId, techId, file);
      await refetch();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleUploadAudio(techId: string, file: File) {
    try {
      await uploadTechniqueAudio(clientId, techId, file);
      await refetch();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (loading) return <p>Cargando técnicas...</p>;

  return (
    <div>
      {error && <p role="alert">{error}</p>}

      <label htmlFor="cortisol-title">Título</label>
      <input id="cortisol-title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <label htmlFor="cortisol-type">Tipo</label>
      <select id="cortisol-type" value={type} onChange={(e) => setType(e.target.value)}>
        <option value="">Sin tipo</option>
        <option value="Respiración">Respiración</option>
        <option value="Breathwork">Breathwork</option>
        <option value="Meditación">Meditación</option>
        <option value="Mindfulness">Mindfulness</option>
      </select>
      <label htmlFor="cortisol-duration">Duración (min)</label>
      <input id="cortisol-duration" type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} />
      <button type="button" onClick={handleCreate}>
        Asignar técnica
      </button>

      {techniques.length === 0 ? (
        <p>Sin técnicas asignadas.</p>
      ) : (
        <ul>
          {techniques.map((technique) => (
            <li key={technique.id}>
              <span>{technique.title}</span> {technique.type ? <span>({technique.type})</span> : null}
              <button type="button" onClick={() => handleDelete(technique.id)}>
                Eliminar
              </button>
              <label htmlFor={`cortisol-video-${technique.id}`}>Video</label>
              <input
                id={`cortisol-video-${technique.id}`}
                type="file"
                accept="video/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadVideo(technique.id, file);
                }}
              />
              <label htmlFor={`cortisol-audio-${technique.id}`}>Audio</label>
              <input
                id={`cortisol-audio-${technique.id}`}
                type="file"
                accept="audio/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadAudio(technique.id, file);
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
