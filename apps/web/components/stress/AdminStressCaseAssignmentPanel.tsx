'use client';

import { useEffect, useState } from 'react';
import { listProtocols, type StressProtocol } from '../../lib/stress-protocols-client';
import { listMentors, type Mentor } from '../../lib/mentors-client';
import { createCase, closeCase, getActiveCase, type ActiveCaseView } from '../../lib/labeled-cases-client';
import { showToast } from '../layout/AppShell';
import Badge from '../ui/Badge';

const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace', fontSize: 10,
  textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 400, color: 'var(--eph-muted)', marginBottom: 6,
};
const fieldStyle: React.CSSProperties = {
  width: '100%', height: 32, borderRadius: 0, border: 'none', borderBottom: '1px solid var(--eph-line-2)',
  padding: '0 2px 6px', fontSize: 15, fontWeight: 400, background: 'transparent', color: 'var(--eph-text)',
  outline: 'none', boxSizing: 'border-box',
};
const primaryButtonStyle: React.CSSProperties = {
  height: 40, padding: '0 22px', borderRadius: 0, border: 'none',
  fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
  background: 'var(--eph-accent)', color: 'var(--eph-ink)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', cursor: 'pointer',
};
const dangerButtonStyle: React.CSSProperties = {
  height: 32, padding: '0 14px', borderRadius: 0, border: '1px solid var(--eph-danger)',
  fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
  background: 'transparent', color: 'var(--eph-danger)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer',
};
const cardStyle: React.CSSProperties = {
  background: 'var(--eph-surface)', border: '1px solid var(--eph-line)',
  borderRadius: '0', padding: '22px 24px', marginBottom: 20,
};
const cardTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: 18, fontWeight: 400, color: 'var(--eph-text)', margin: '0 0 16px',
};

// Superficie 2 del spec punto 17 (vista del admin/mentor) — versión inicial:
// asignar un protocolo publicado + mentor a este cliente, creando el caso
// etiquetado. La versión completa (baseline curado, checklist de varios
// clientes a la vez, preselección por criterio) llega en la Fase 4 del plan;
// esto cubre un cliente a la vez, que es lo mínimo para cerrar el ciclo del
// spec 17 (vista cliente ↔ vista mentor).
export function AdminStressCaseAssignmentPanel({ clientId }: { clientId: string }) {
  const [publishedProtocols, setPublishedProtocols] = useState<StressProtocol[]>([]);
  const [activeMentors, setActiveMentors] = useState<Mentor[]>([]);
  const [activeCase, setActiveCase] = useState<ActiveCaseView | null>(null);
  const [loading, setLoading] = useState(true);
  const [protocolId, setProtocolId] = useState('');
  const [mentorId, setMentorId] = useState('');
  const [cycleWeeks, setCycleWeeks] = useState('12');
  const [saving, setSaving] = useState(false);

  async function refetch() {
    const [protocols, mentors, current] = await Promise.all([
      listProtocols(),
      listMentors(),
      getActiveCase(clientId, 'stress'),
    ]);
    setPublishedProtocols(protocols.filter((p) => p.status === 'publicado'));
    setActiveMentors(mentors.filter((m) => m.active));
    setActiveCase(current);
  }

  useEffect(() => {
    refetch()
      .catch((e: Error) => showToast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, [clientId]);

  async function handleAssign() {
    if (!protocolId) return;
    setSaving(true);
    try {
      await createCase(clientId, {
        module: 'stress',
        protocol_id: protocolId,
        mentor_id: mentorId || null,
        cycle_weeks: cycleWeeks ? Number(cycleWeeks) : undefined,
      });
      setProtocolId('');
      setMentorId('');
      await refetch();
      showToast('Protocolo asignado — caso etiquetado creado.', 'success');
    } catch (e) {
      showToast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleClose() {
    if (!activeCase) return;
    try {
      await closeCase(activeCase.labeledCase.id, 'cerrado');
      await refetch();
      showToast('Caso cerrado.', 'success');
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  }

  if (loading) return <p style={{ color: 'var(--eph-body)', fontSize: 14 }}>Cargando protocolos y mentores…</p>;

  return (
    <div style={cardStyle}>
      <h3 style={cardTitleStyle}>Protocolo asignado (Caso Etiquetado)</h3>

      {activeCase ? (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Badge label={`Caso #${activeCase.labeledCase.caseNumber}`} variant="success" />
            <strong style={{ color: 'var(--eph-text)' }}>{activeCase.protocol?.name}</strong>
            {activeCase.mentor && <span style={{ fontSize: 13, color: 'var(--eph-muted)' }}>— mentor: {activeCase.mentor.name}</span>}
          </div>
          <p style={{ fontSize: 12, color: 'var(--eph-muted)', marginTop: 6 }}>
            Ciclo de {activeCase.labeledCase.cycleWeeks} semanas · asignado el {new Date(activeCase.labeledCase.assignedAt).toLocaleDateString('es-CO')}
          </p>
          <button type="button" style={{ ...dangerButtonStyle, marginTop: 10 }} onClick={handleClose}>
            Cerrar caso
          </button>
        </div>
      ) : (
        <>
          {publishedProtocols.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--eph-muted)' }}>
              No hay protocolos publicados todavía — publica uno en Administración → Protocolos de Stress.
            </p>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                <div>
                  <label style={labelStyle} htmlFor="asc-protocol">Protocolo publicado</label>
                  <select id="asc-protocol" style={fieldStyle} value={protocolId} onChange={(e) => setProtocolId(e.target.value)}>
                    <option value="">Selecciona uno…</option>
                    {publishedProtocols.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle} htmlFor="asc-mentor">Mentor (opcional)</label>
                  <select id="asc-mentor" style={fieldStyle} value={mentorId} onChange={(e) => setMentorId(e.target.value)}>
                    <option value="">Sin asignar todavía</option>
                    {activeMentors.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle} htmlFor="asc-weeks">Duración del ciclo (semanas)</label>
                  <input id="asc-weeks" type="number" min={1} style={fieldStyle} value={cycleWeeks} onChange={(e) => setCycleWeeks(e.target.value)} />
                </div>
              </div>
              <button type="button" style={{ ...primaryButtonStyle, marginTop: 16 }} onClick={handleAssign} disabled={saving || !protocolId}>
                Asignar protocolo
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
