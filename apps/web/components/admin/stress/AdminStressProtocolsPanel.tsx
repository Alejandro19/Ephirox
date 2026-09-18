'use client';

import { useEffect, useState } from 'react';
import {
  listProtocols,
  createProtocol,
  updateProtocolStatus,
  deleteProtocol,
  getProtocol,
  createResource,
  updateResource,
  deleteResource,
  uploadResourceAudio,
  type StressProtocol,
  type StressProtocolResource,
} from '../../../lib/stress-protocols-client';
import { STRESS_RESOURCE_TYPES, STRESS_PROTOCOL_STATUSES, type StressProtocolStatus, type StressResourceType } from '@latribu/shared-types';
import { AdminStressProtocolCriteriaAndAssignment } from '../../stress/AdminStressProtocolCriteriaAndAssignment';
import { showToast } from '../../layout/AppShell';
import EmptyState from '../../ui/EmptyState';
import Badge from '../../ui/Badge';
import FileField from '../../ui/FileField';

const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace', fontSize: 10,
  textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 400, color: 'var(--eph-muted)', marginBottom: 6,
};
const inputStyle: React.CSSProperties = {
  width: '100%', height: 36, borderRadius: 0, border: '1px solid var(--eph-line-2)',
  padding: '0 10px', fontSize: 15, fontWeight: 400, background: 'transparent', color: 'var(--eph-text)',
  outline: 'none', boxSizing: 'border-box',
};
const dangerButtonStyle: React.CSSProperties = {
  height: 32, padding: '0 14px', borderRadius: 0, border: '1px solid var(--eph-danger)',
  fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
  background: 'transparent', color: 'var(--eph-danger)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', flexShrink: 0,
};
const primaryButtonStyle: React.CSSProperties = {
  height: 36, padding: '0 18px', borderRadius: 0, border: 'none',
  fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
  background: 'var(--eph-accent)', color: 'var(--eph-ink)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', cursor: 'pointer',
};
const ghostButtonStyle: React.CSSProperties = {
  height: 32, padding: '0 14px', borderRadius: 0, border: '1px solid var(--eph-line-2)',
  fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
  background: 'transparent', color: 'var(--eph-body)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', flexShrink: 0,
};

const STATUS_LABEL: Record<StressProtocolStatus, string> = {
  borrador: 'Borrador',
  en_revision_clinica: 'En revisión clínica',
  publicado: 'Publicado',
};
const STATUS_BADGE_VARIANT: Record<StressProtocolStatus, 'success' | 'warn' | 'danger'> = {
  borrador: 'warn',
  en_revision_clinica: 'warn',
  publicado: 'success',
};

function ResourceForm({ protocolId, onCreated }: { protocolId: string; onCreated: (r: StressProtocolResource) => void }) {
  const [type, setType] = useState<StressResourceType>(STRESS_RESOURCE_TYPES[0]);
  const [title, setTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [instructions, setInstructions] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const resource = await createResource(protocolId, {
        type,
        title: title.trim(),
        duration_minutes: durationMinutes ? Number(durationMinutes) : null,
        instructions: instructions.trim() || null,
      });
      onCreated(resource);
      setTitle('');
      setDurationMinutes('');
      setInstructions('');
      showToast('Recurso agregado.', 'success');
    } catch (e) {
      showToast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ border: '1px dashed var(--eph-line-2)', padding: 14, marginTop: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <div>
          <label style={labelStyle} htmlFor="rf-type">Tipo</label>
          <select id="rf-type" style={inputStyle} value={type} onChange={(e) => setType(e.target.value as StressResourceType)}>
            {STRESS_RESOURCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle} htmlFor="rf-duration">Duración (min)</label>
          <input id="rf-duration" type="number" min={0} style={inputStyle} value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} />
        </div>
      </div>
      <div style={{ marginTop: 10 }}>
        <label style={labelStyle} htmlFor="rf-title">Título</label>
        <input id="rf-title" style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Respiración 4-7-8" />
      </div>
      <div style={{ marginTop: 10 }}>
        <label style={labelStyle} htmlFor="rf-instructions">Instrucciones / contenido</label>
        <textarea
          id="rf-instructions"
          style={{ ...inputStyle, height: 72, padding: 10, resize: 'vertical' }}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
        />
      </div>
      <button type="button" style={{ ...primaryButtonStyle, marginTop: 10 }} onClick={handleCreate} disabled={saving || !title.trim()}>
        + Agregar recurso
      </button>
    </div>
  );
}

function ResourceEditForm({ protocolId, resource, onSaved, onCancel }: {
  protocolId: string;
  resource: StressProtocolResource;
  onSaved: (r: StressProtocolResource) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<StressResourceType>(resource.type);
  const [title, setTitle] = useState(resource.title);
  const [durationMinutes, setDurationMinutes] = useState(resource.durationMinutes != null ? String(resource.durationMinutes) : '');
  const [instructions, setInstructions] = useState(resource.instructions ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const updated = await updateResource(protocolId, resource.id, {
        type,
        title: title.trim(),
        duration_minutes: durationMinutes ? Number(durationMinutes) : null,
        instructions: instructions.trim() || null,
      });
      onSaved(updated);
      showToast('Recurso actualizado.', 'success');
    } catch (e) {
      showToast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ border: '1px dashed var(--eph-line-2)', padding: 14, marginTop: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <div>
          <label style={labelStyle} htmlFor={`re-type-${resource.id}`}>Tipo</label>
          <select id={`re-type-${resource.id}`} style={inputStyle} value={type} onChange={(e) => setType(e.target.value as StressResourceType)}>
            {STRESS_RESOURCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle} htmlFor={`re-duration-${resource.id}`}>Duración (min)</label>
          <input id={`re-duration-${resource.id}`} type="number" min={0} style={inputStyle} value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} />
        </div>
      </div>
      <div style={{ marginTop: 10 }}>
        <label style={labelStyle} htmlFor={`re-title-${resource.id}`}>Título</label>
        <input id={`re-title-${resource.id}`} style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div style={{ marginTop: 10 }}>
        <label style={labelStyle} htmlFor={`re-instructions-${resource.id}`}>Instrucciones / contenido</label>
        <textarea
          id={`re-instructions-${resource.id}`}
          style={{ ...inputStyle, height: 72, padding: 10, resize: 'vertical' }}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
        />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button type="button" style={primaryButtonStyle} onClick={handleSave} disabled={saving || !title.trim()}>Guardar</button>
        <button type="button" style={ghostButtonStyle} onClick={onCancel} disabled={saving}>Cancelar</button>
      </div>
    </div>
  );
}

function ResourceRow({ protocolId, resource, onChanged, onDeleted }: {
  protocolId: string;
  resource: StressProtocolResource;
  onChanged: (r: StressProtocolResource) => void;
  onDeleted: (id: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);

  async function handleAudioUpload(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const updated = await uploadResourceAudio(protocolId, resource.id, file);
      onChanged(updated);
      showToast('Audio subido.', 'success');
    } catch (e) {
      showToast((e as Error).message, 'error');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteResource(protocolId, resource.id);
      onDeleted(resource.id);
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  }

  if (editing) {
    return (
      <div style={{ padding: '12px 0', borderBottom: '0.5px solid var(--eph-line)' }}>
        <ResourceEditForm
          protocolId={protocolId}
          resource={resource}
          onSaved={(updated) => {
            onChanged(updated);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '12px 0', borderBottom: '0.5px solid var(--eph-line)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--eph-text)' }}>{resource.title}</p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--eph-muted)' }}>
            {[resource.type, resource.durationMinutes != null ? `${resource.durationMinutes} min` : null].filter(Boolean).join(' · ')}
          </p>
        </div>
        <button type="button" style={ghostButtonStyle} onClick={() => setEditing(true)}>Editar</button>
        <button type="button" style={dangerButtonStyle} onClick={handleDelete}>Eliminar</button>
      </div>
      {/* Campo de audio solo para "Meditación guiada" (spec 19.2) — aparece/desaparece según el tipo. */}
      {resource.type === 'Meditación guiada' && (
        <div style={{ marginTop: 8 }}>
          <FileField
            id={`rf-audio-${resource.id}`}
            label={resource.audioName ? `Audio: ${resource.audioName}` : 'Adjuntar audio (.mp3, .wav)'}
            accept="audio/*"
            uploading={uploading}
            onFileChange={handleAudioUpload}
          />
        </div>
      )}
    </div>
  );
}

function ProtocolDetail({ protocolId, onDeleted }: { protocolId: string; onDeleted: () => void }) {
  const [protocol, setProtocol] = useState<StressProtocol | null>(null);
  const [resources, setResources] = useState<StressProtocolResource[]>([]);
  const [loading, setLoading] = useState(true);

  async function refetch() {
    const data = await getProtocol(protocolId);
    setProtocol(data.protocol);
    setResources(data.resources);
  }

  useEffect(() => {
    setLoading(true);
    refetch()
      .catch((e: Error) => showToast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, [protocolId]);

  async function handleStatusChange(status: StressProtocolStatus) {
    try {
      const updated = await updateProtocolStatus(protocolId, status);
      setProtocol(updated);
      showToast(status === 'publicado' ? 'Protocolo publicado — ya entra al selector de criterios.' : 'Estado actualizado.', 'success');
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  }

  async function handleDeleteProtocol() {
    try {
      await deleteProtocol(protocolId);
      onDeleted();
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  }

  if (loading || !protocol) return <p style={{ color: 'var(--eph-muted)', fontSize: 14 }}>Cargando protocolo…</p>;

  return (
    <div style={{ borderTop: '1px solid var(--eph-line-2)', marginTop: 16, paddingTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <label style={{ ...labelStyle, marginBottom: 0 }} htmlFor="pd-status">Estado del protocolo</label>
        <select
          id="pd-status"
          style={{ ...inputStyle, width: 'auto', minWidth: 180 }}
          value={protocol.status}
          onChange={(e) => handleStatusChange(e.target.value as StressProtocolStatus)}
        >
          {STRESS_PROTOCOL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <span style={{ fontSize: 11, color: 'var(--eph-muted)' }}>
          Solo un protocolo &quot;Publicado&quot; entra al selector de criterios de asignación.
        </span>
      </div>

      <h3 style={{ margin: '18px 0 8px', fontSize: 14, fontWeight: 600, color: 'var(--eph-text)' }}>Recursos del protocolo</h3>
      {resources.length === 0 ? (
        <EmptyState message="Este protocolo todavía no tiene recursos." />
      ) : (
        resources.map((r) => (
          <ResourceRow
            key={r.id}
            protocolId={protocolId}
            resource={r}
            onChanged={(updated) => setResources((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))}
            onDeleted={(id) => setResources((prev) => prev.filter((p) => p.id !== id))}
          />
        ))
      )}
      <ResourceForm protocolId={protocolId} onCreated={(r) => setResources((prev) => [...prev, r])} />

      <div style={{ borderTop: '1px solid var(--eph-line-2)', marginTop: 22, paddingTop: 4 }}>
        <AdminStressProtocolCriteriaAndAssignment
          protocolId={protocolId}
          criteriaId={protocol.criteriaId}
          onCriteriaChange={(criteriaId) => setProtocol((prev) => (prev ? { ...prev, criteriaId } : prev))}
        />
      </div>

      <button type="button" style={{ ...dangerButtonStyle, marginTop: 18 }} onClick={handleDeleteProtocol}>
        Eliminar protocolo completo
      </button>
    </div>
  );
}

export function AdminStressProtocolsPanel() {
  const [protocols, setProtocols] = useState<StressProtocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [mechanism, setMechanism] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function refetch() {
    setProtocols(await listProtocols());
  }

  useEffect(() => {
    refetch()
      .catch((e: Error) => showToast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const protocol = await createProtocol(name.trim(), mechanism.trim() || null);
      setName('');
      setMechanism('');
      await refetch();
      setSelectedId(protocol.id);
      showToast('Protocolo creado en borrador.', 'success');
    } catch (e) {
      showToast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p style={{ color: 'var(--eph-muted)', fontSize: 14 }}>Cargando protocolos…</p>;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={labelStyle} htmlFor="app-name">Nombre del protocolo</label>
          <input id="app-name" style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Recuperación Vagal — Nivel 1" />
        </div>
        <div>
          <label style={labelStyle} htmlFor="app-mechanism">Mecanismo</label>
          <input id="app-mechanism" style={inputStyle} value={mechanism} onChange={(e) => setMechanism(e.target.value)} placeholder="Ej: Respiración" />
        </div>
      </div>
      <button type="button" style={primaryButtonStyle} onClick={handleCreate} disabled={saving || !name.trim()}>
        + Crear protocolo
      </button>

      <div style={{ marginTop: 20 }}>
        {protocols.length === 0 ? (
          <EmptyState message="Aún no hay protocolos en la librería." />
        ) : (
          protocols.map((p) => (
            <div key={p.id}>
              <button
                type="button"
                onClick={() => setSelectedId((prev) => (prev === p.id ? null : p.id))}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
                  padding: '12px 0', borderBottom: '0.5px solid var(--eph-line)', background: 'transparent', border: 'none',
                  borderBottomWidth: '0.5px', borderBottomColor: 'var(--eph-line)', borderBottomStyle: 'solid', cursor: 'pointer',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--eph-text)' }}>{p.name}</p>
                  {p.mechanism && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--eph-muted)' }}>{p.mechanism}</p>}
                </div>
                <Badge label={STATUS_LABEL[p.status]} variant={STATUS_BADGE_VARIANT[p.status]} />
              </button>
              {selectedId === p.id && (
                <ProtocolDetail
                  protocolId={p.id}
                  onDeleted={() => {
                    setSelectedId(null);
                    refetch().catch((e: Error) => showToast(e.message, 'error'));
                  }}
                />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
