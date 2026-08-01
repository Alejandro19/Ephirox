'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  type RestTool,
  listAllRestTools,
  createRestTool,
  updateRestTool,
  deleteRestTool,
  uploadRestToolAudio,
  removeRestToolAudio,
} from '../../lib/rest-tools-client';

export function RestToolsAdminPanel() {
  const [tools, setTools] = useState<RestTool[]>([]);
  const [newName, setNewName] = useState('');
  const [newMeta, setNewMeta] = useState('');
  const [newAction, setNewAction] = useState('play');
  const [newMinutes, setNewMinutes] = useState('');
  const [newSeconds, setNewSeconds] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editMeta, setEditMeta] = useState('');
  const [editAction, setEditAction] = useState('play');
  const [editMinutes, setEditMinutes] = useState('');
  const [editSeconds, setEditSeconds] = useState('');
  const [editAudioFile, setEditAudioFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    const list = await listAllRestTools();
    setTools(list);
  }, []);

  useEffect(() => {
    refetch().catch((e: Error) => setError(e.message));
  }, [refetch]);

  async function handleCreate() {
    if (!newName.trim()) return;
    try {
      await createRestTool({
        name: newName.trim(),
        meta: newMeta,
        action: newAction,
        minutes: newAction === 'play' ? (newMinutes ? Number(newMinutes) : null) : null,
        seconds: newAction === 'play' ? (newSeconds ? Number(newSeconds) : null) : null,
      });
      setNewName('');
      setNewMeta('');
      setNewMinutes('');
      setNewSeconds('');
      await refetch();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function startEdit(tool: RestTool) {
    setEditingId(tool.id);
    setEditName(tool.name);
    setEditMeta(tool.meta || '');
    setEditAction(tool.action);
    setEditMinutes(tool.minutes != null ? String(tool.minutes) : '');
    setEditSeconds(tool.seconds != null ? String(tool.seconds) : '');
    setEditAudioFile(null);
  }

  async function handleSaveEdit(id: string) {
    if (!editName.trim()) return;
    try {
      await updateRestTool(id, {
        name: editName.trim(),
        meta: editMeta,
        action: editAction,
        minutes: editAction === 'play' ? (editMinutes ? Number(editMinutes) : null) : null,
        seconds: editAction === 'play' ? (editSeconds ? Number(editSeconds) : null) : null,
      });
      setEditingId(null);
      await refetch();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteRestTool(id);
      await refetch();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleUploadAudio(id: string) {
    if (!editAudioFile) return;
    try {
      await uploadRestToolAudio(id, editAudioFile);
      setEditAudioFile(null);
      await refetch();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleRemoveAudio(id: string) {
    try {
      await removeRestToolAudio(id);
      await refetch();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <section>
      <h2>Herramientas para dormir</h2>
      {error && <p role="alert">{error}</p>}

      {editingId === null && (
        <>
          <label htmlFor="rt-new-name">Nombre</label>
          <input id="rt-new-name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <label htmlFor="rt-new-action">Tipo</label>
          <select id="rt-new-action" value={newAction} onChange={(e) => setNewAction(e.target.value)}>
            <option value="play">Reproducir (con temporizador)</option>
            <option value="write">Escribir (diario)</option>
          </select>
          {newAction === 'play' && (
            <>
              <label htmlFor="rt-new-minutes">Minutos</label>
              <input id="rt-new-minutes" type="number" value={newMinutes} onChange={(e) => setNewMinutes(e.target.value)} />
              <label htmlFor="rt-new-seconds">Segundos</label>
              <input id="rt-new-seconds" type="number" value={newSeconds} onChange={(e) => setNewSeconds(e.target.value)} />
            </>
          )}
          <label htmlFor="rt-new-meta">Descripción</label>
          <input id="rt-new-meta" value={newMeta} onChange={(e) => setNewMeta(e.target.value)} />
          <button type="button" onClick={handleCreate}>
            + Agregar herramienta
          </button>
        </>
      )}

      {tools.length === 0 && <p>Aún no hay herramientas.</p>}
      {tools.map((tool) =>
        editingId === tool.id ? (
          <div key={tool.id}>
            <label htmlFor="rt-edit-name">Nombre</label>
            <input id="rt-edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            <label htmlFor="rt-edit-action">Tipo</label>
            <select id="rt-edit-action" value={editAction} onChange={(e) => setEditAction(e.target.value)}>
              <option value="play">Reproducir (con temporizador)</option>
              <option value="write">Escribir (diario)</option>
            </select>
            {editAction === 'play' && (
              <>
                <label htmlFor="rt-edit-minutes">Minutos</label>
                <input id="rt-edit-minutes" type="number" value={editMinutes} onChange={(e) => setEditMinutes(e.target.value)} />
                <label htmlFor="rt-edit-seconds">Segundos</label>
                <input id="rt-edit-seconds" type="number" value={editSeconds} onChange={(e) => setEditSeconds(e.target.value)} />
              </>
            )}
            <label htmlFor="rt-edit-meta">Descripción</label>
            <input id="rt-edit-meta" value={editMeta} onChange={(e) => setEditMeta(e.target.value)} />

            <label htmlFor="rt-edit-audio">Audio propio</label>
            {tool.audioUrl && (
              <div>
                <audio controls src={tool.audioUrl} />
                <span>{tool.audioName}</span>
                <button type="button" onClick={() => handleRemoveAudio(tool.id)}>
                  Quitar audio
                </button>
              </div>
            )}
            <input
              id="rt-edit-audio"
              type="file"
              accept="audio/*"
              onChange={(e) => setEditAudioFile(e.target.files?.[0] ?? null)}
            />
            <button type="button" onClick={() => handleUploadAudio(tool.id)}>
              {tool.audioUrl ? 'Reemplazar audio' : 'Subir audio'}
            </button>

            <button type="button" onClick={() => handleSaveEdit(tool.id)}>
              Guardar
            </button>
            <button type="button" onClick={() => setEditingId(null)}>
              Cancelar
            </button>
          </div>
        ) : (
          <div key={tool.id}>
            <strong>{tool.name}</strong>
            <span>{tool.meta}</span>
            <button type="button" onClick={() => startEdit(tool)}>
              Editar
            </button>
            <button type="button" onClick={() => handleDelete(tool.id)}>
              Eliminar
            </button>
          </div>
        )
      )}
    </section>
  );
}
