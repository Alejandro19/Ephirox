'use client';

import { useEffect, useState } from 'react';
import { listMentors, createMentor, updateMentor, deleteMentor, type Mentor } from '../../lib/mentors-client';
import { showToast } from '../layout/AppShell';
import EmptyState from '../ui/EmptyState';
import Badge from '../ui/Badge';

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
const secondaryButtonStyle: React.CSSProperties = {
  height: 32, padding: '0 14px', borderRadius: 0, border: '1px solid var(--eph-line-2)',
  fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
  background: 'transparent', color: 'var(--eph-text)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', flexShrink: 0,
};
const primaryButtonStyle: React.CSSProperties = {
  height: 36, padding: '0 18px', borderRadius: 0, border: 'none',
  fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
  background: 'var(--eph-accent)', color: 'var(--eph-ink)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', cursor: 'pointer',
};

export function AdminMentorList() {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [saving, setSaving] = useState(false);

  async function refetch() {
    setMentors(await listMentors());
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
      await createMentor(name.trim(), specialty.trim() || null);
      setName('');
      setSpecialty('');
      await refetch();
      showToast('Mentor agregado.', 'success');
    } catch (e) {
      showToast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(mentor: Mentor) {
    try {
      await updateMentor(mentor.id, { active: !mentor.active });
      await refetch();
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  }

  async function handleDelete(mentorId: string) {
    try {
      await deleteMentor(mentorId);
      await refetch();
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  }

  if (loading) return <p style={{ color: 'var(--eph-muted)', fontSize: 14 }}>Cargando mentores…</p>;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={labelStyle} htmlFor="aml-name">Nombre</label>
          <input id="aml-name" style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Sofía Duarte" />
        </div>
        <div>
          <label style={labelStyle} htmlFor="aml-specialty">Especialidad (opcional)</label>
          <input id="aml-specialty" style={inputStyle} value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="Ej: Regulación del sistema nervioso" />
        </div>
      </div>
      <button type="button" style={primaryButtonStyle} onClick={handleCreate} disabled={saving || !name.trim()}>
        + Agregar mentor
      </button>

      <div style={{ marginTop: 20 }}>
        {mentors.length === 0 ? (
          <EmptyState message="Aún no hay mentores en el catálogo." />
        ) : (
          mentors.map((mentor) => (
            <div key={mentor.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderBottom: '0.5px solid var(--eph-line)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--eph-text)' }}>{mentor.name}</p>
                {mentor.specialty && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--eph-muted)' }}>{mentor.specialty}</p>}
              </div>
              <Badge label={mentor.active ? 'Activo' : 'Inactivo'} variant={mentor.active ? 'success' : 'warn'} />
              <button type="button" style={secondaryButtonStyle} onClick={() => handleToggleActive(mentor)}>
                {mentor.active ? 'Desactivar' : 'Activar'}
              </button>
              <button type="button" style={dangerButtonStyle} onClick={() => handleDelete(mentor.id)}>Eliminar</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
