'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  therapistListCases,
  therapistGetCase,
  therapistCreateTask,
  therapistUpdateTask,
  therapistCreateSession,
  therapistRaiseCrisis,
  type TherapistCaseListItem,
  type TherapistCaseClient,
  type BlindspotCase,
  type BlindspotTask,
  type BlindspotSessionLog,
  type BlindspotProgressMarker,
} from '@/lib/blindspot-client';
import IdentityHeader from '@/components/ui/IdentityHeader';

const cardStyle: React.CSSProperties = {
  background: 'var(--paper)', border: '1px solid var(--line)',
  borderRadius: 'var(--radius)', padding: '22px 24px', marginBottom: 18,
};
const trackedLabelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)',
  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
};
const fieldStyle: React.CSSProperties = {
  width: '100%', height: 40, borderRadius: 10, border: '1px solid var(--line)',
  padding: '0 10px', fontSize: 13, background: 'var(--paper)', color: 'var(--ink)',
  outline: 'none', boxSizing: 'border-box',
};
const textareaStyle: React.CSSProperties = { ...fieldStyle, height: 'auto', minHeight: 72, padding: 10, resize: 'vertical', fontFamily: 'inherit' };
const primaryButtonStyle: React.CSSProperties = {
  height: 40, padding: '0 20px', borderRadius: 9999, border: 'none',
  color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
};
function tabButtonStyle(active: boolean): React.CSSProperties {
  return {
    height: 38, padding: '0 18px', borderRadius: 9999, fontSize: 13, fontWeight: 700, cursor: 'pointer',
    border: active ? 'none' : '1px solid var(--line)',
    background: active ? 'var(--gold)' : 'transparent',
    color: active ? '#fff' : 'var(--ink-soft)',
  };
}

const STATUS_LABEL: Record<BlindspotCase['status'], string> = {
  evaluando: 'Evaluando', referido: 'Referido', en_proceso: 'En proceso', cerrado: 'Cerrado',
};

function initials(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Sin sesiones aún';
  const date = new Date(`${dateStr}T00:00:00`);
  const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Última sesión: hoy';
  if (days === 1) return 'Última sesión: hace 1 día';
  if (days < 7) return `Última sesión: hace ${days} días`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return 'Última sesión: hace 1 semana';
  if (weeks < 5) return `Última sesión: hace ${weeks} semanas`;
  const months = Math.floor(days / 30);
  return months <= 1 ? 'Última sesión: hace 1 mes' : `Última sesión: hace ${months} meses`;
}

function caseBadge(c: TherapistCaseListItem): { label: string; bg: string; color: string } {
  if (c.crisisFlag) return { label: 'En crisis', bg: 'var(--danger)', color: '#fff' };
  if (c.status === 'cerrado') return { label: 'Cerrado', bg: 'var(--line)', color: 'var(--ink-soft)' };
  return { label: STATUS_LABEL[c.status], bg: '#F6E6C8', color: '#8A5A12' };
}

function AlertIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export function TherapistCasesModule() {
  const [cases, setCases] = useState<TherapistCaseListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<'activos' | 'crisis' | 'cerrados'>('activos');

  const refetch = useCallback(async () => {
    try {
      const list = await therapistListCases();
      setCases(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar tus casos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  if (loading) return <p style={{ color: 'var(--ink-soft)', fontSize: 13 }}>Cargando...</p>;

  const crisisCases = cases.filter((c) => c.crisisFlag);
  const closedCases = cases.filter((c) => !c.crisisFlag && c.status === 'cerrado');
  const activeCases = cases.filter((c) => !c.crisisFlag && c.status !== 'cerrado');
  const tabCases = statusTab === 'activos' ? activeCases : statusTab === 'crisis' ? crisisCases : closedCases;

  const filteredCases = tabCases.filter((c) => {
    const q = search.trim().toLowerCase().replace(/^#/, '');
    if (!q) return true;
    return `${c.clientName} #${c.caseNumber} ${c.caseNumber} ${c.initialAssessment.motivoConsulta}`.toLowerCase().includes(q);
  });

  const selected = cases.find((c) => c.id === selectedId) ?? null;

  return (
    <div>
      <IdentityHeader title="Mis casos" subtitle="Evaluación, referidos y seguimiento — exclusivo mentoría." />

      {error && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        <button style={tabButtonStyle(statusTab === 'activos')} onClick={() => setStatusTab('activos')}>
          Activos · {activeCases.length}
        </button>
        <button style={tabButtonStyle(statusTab === 'crisis')} onClick={() => setStatusTab('crisis')}>
          En crisis · {crisisCases.length}
        </button>
        <button style={tabButtonStyle(statusTab === 'cerrados')} onClick={() => setStatusTab('cerrados')}>
          Cerrados · {closedCases.length}
        </button>
      </div>

      {cases.length > 0 && (
        <div style={{ ...cardStyle, marginBottom: 12 }}>
          <input
            style={fieldStyle}
            placeholder="Buscar por cliente, #caso o motivo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      <div style={cardStyle}>
        {cases.length === 0 ? (
          <p style={{ color: 'var(--ink-soft)', fontSize: 13, margin: 0 }}>Aún no tienes casos asignados.</p>
        ) : filteredCases.length === 0 ? (
          <p style={{ color: 'var(--ink-soft)', fontSize: 13, margin: 0 }}>Ningún caso coincide en esta pestaña.</p>
        ) : (
          filteredCases.map((c) => {
            const badge = caseBadge(c);
            return (
              <div
                key={c.id}
                onClick={() => setSelectedId(c.id === selectedId ? null : c.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 4px', borderBottom: '1px solid var(--line)', cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--sage-soft)', color: 'var(--sage)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, fontWeight: 700,
                  }}
                >
                  {initials(c.clientName)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>
                    {c.clientName} · #{c.caseNumber}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.initialAssessment.motivoConsulta} · {relativeTime(c.lastSessionAt)}
                  </p>
                </div>
                <span style={{ background: badge.bg, color: badge.color, fontSize: 10.5, fontWeight: 700, padding: '4px 10px', borderRadius: 9999, flexShrink: 0 }}>
                  {badge.label}
                </span>
              </div>
            );
          })
        )}
      </div>

      {selected && <CaseDetail blindspotCase={selected} onRefetch={refetch} />}
    </div>
  );
}

function CaseDetail({ blindspotCase, onRefetch }: { blindspotCase: TherapistCaseListItem; onRefetch: () => Promise<void> }) {
  const [tasks, setTasks] = useState<BlindspotTask[]>([]);
  const [sessionLogs, setSessionLogs] = useState<BlindspotSessionLog[]>([]);
  const [client, setClient] = useState<TherapistCaseClient | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [progressMarker, setProgressMarker] = useState<BlindspotProgressMarker>('avance');
  const [internalSummary, setInternalSummary] = useState('');
  const [clientNote, setClientNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await therapistGetCase(blindspotCase.id);
    setTasks(res.tasks);
    setSessionLogs(res.sessionLogs);
    setClient(res.client);
  }, [blindspotCase.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAddTask() {
    if (!newTaskTitle.trim()) return;
    await therapistCreateTask(blindspotCase.id, { title: newTaskTitle.trim() });
    setNewTaskTitle('');
    await load();
  }

  async function handleTaskStatus(taskId: string, status: 'completada' | 'omitida') {
    await therapistUpdateTask(blindspotCase.id, taskId, status);
    await load();
  }

  async function handleLogSession() {
    setSaving(true);
    try {
      await therapistCreateSession(blindspotCase.id, {
        sessionDate,
        progressMarker,
        internalSummary: internalSummary || undefined,
        clientNote: clientNote || undefined,
      });
      setInternalSummary('');
      setClientNote('');
      await load();
      await onRefetch();
    } finally {
      setSaving(false);
    }
  }

  async function handleCrisis() {
    if (!window.confirm('¿Confirmas que quieres marcar este caso como crisis? Se avisará a Alejandro de inmediato.')) return;
    await therapistRaiseCrisis(blindspotCase.id);
    await onRefetch();
  }

  const personalFields: [string, string | null][] = [
    ['Nombre', client?.name ?? null],
    ['Cédula', client?.cedula ?? null],
    ['País', client?.country ?? null],
    ['Ciudad', client?.city ?? null],
    ['Email', client?.email ?? null],
    ['Celular', client?.phone ?? null],
  ];

  return (
    <div style={cardStyle}>
      <p style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>Caso #{blindspotCase.caseNumber}</p>

      {/* a. Datos personales */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ ...trackedLabelStyle, fontSize: 12.5, marginBottom: 12 }}>Datos personales</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {personalFields.map(([label, value]) => (
            <div key={label}>
              <span style={trackedLabelStyle}>{label}</span>
              <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink)' }}>{value ?? '—'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* b. Motivo de consulta / Área percibida */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div>
          <span style={trackedLabelStyle}>Motivo de consulta</span>
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink)' }}>{blindspotCase.initialAssessment.motivoConsulta}</p>
        </div>
        <div>
          <span style={trackedLabelStyle}>Área percibida</span>
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink)' }}>{blindspotCase.initialAssessment.areaPercibida}</p>
        </div>
      </div>

      {/* c. Marcar caso en crisis */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={handleCrisis}
          disabled={blindspotCase.crisisFlag}
          style={{
            ...primaryButtonStyle,
            background: 'var(--danger)',
            display: 'inline-flex', alignItems: 'center', gap: 8,
            opacity: blindspotCase.crisisFlag ? 0.6 : 1,
            cursor: blindspotCase.crisisFlag ? 'not-allowed' : 'pointer',
          }}
        >
          <AlertIcon />
          {blindspotCase.crisisFlag ? 'Caso en crisis' : 'Marcar caso en crisis'}
        </button>
      </div>

      {/* d. Tareas */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>Tareas</p>
        {tasks.map((t) => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0' }}>
            <span
              style={{
                width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                border: t.status === 'pendiente' ? '2px solid var(--line)' : 'none',
                background: t.status === 'pendiente' ? 'transparent' : t.status === 'completada' ? 'var(--sage)' : 'var(--line)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {t.status === 'completada' && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </span>
            <span style={{ flex: 1, fontSize: 12.5, color: 'var(--ink)', textDecoration: t.status !== 'pendiente' ? 'line-through' : 'none' }}>
              {t.title}
            </span>
            {t.status === 'pendiente' && (
              <span style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => handleTaskStatus(t.id, 'completada')} style={{ fontSize: 11, border: '1px solid var(--line)', borderRadius: 9999, padding: '3px 10px', background: 'transparent', cursor: 'pointer' }}>Completada</button>
                <button onClick={() => handleTaskStatus(t.id, 'omitida')} style={{ fontSize: 11, border: '1px solid var(--line)', borderRadius: 9999, padding: '3px 10px', background: 'transparent', cursor: 'pointer' }}>Omitir</button>
              </span>
            )}
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input style={fieldStyle} placeholder="Nueva tarea" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} />
          <button
            onClick={handleAddTask}
            style={{ ...primaryButtonStyle, height: 40, flexShrink: 0, background: '#F6E6C8', color: '#8A5A12' }}
          >
            Agregar
          </button>
        </div>
      </div>

      {/* e. Registrar sesión */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>Registrar sesión</p>
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <span style={trackedLabelStyle}>Fecha</span>
              <input type="date" style={fieldStyle} value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
            </div>
            <div>
              <span style={trackedLabelStyle}>Progreso</span>
              <select style={fieldStyle} value={progressMarker} onChange={(e) => setProgressMarker(e.target.value as BlindspotProgressMarker)}>
                <option value="avance">Avance</option>
                <option value="estable">Estable</option>
                <option value="retroceso">Retroceso</option>
              </select>
            </div>
          </div>
          <div>
            <span style={trackedLabelStyle}>
              Resumen interno (solo tú y Alejandro lo ven — sin detalle clínico sensible)
            </span>
            <textarea style={textareaStyle} maxLength={500} value={internalSummary} onChange={(e) => setInternalSummary(e.target.value)} />
          </div>
          <div>
            <span style={trackedLabelStyle}>Nota para el cliente (opcional, corta)</span>
            <textarea style={textareaStyle} maxLength={500} value={clientNote} onChange={(e) => setClientNote(e.target.value)} />
          </div>
          <button
            onClick={handleLogSession}
            disabled={saving}
            style={{ ...primaryButtonStyle, background: 'var(--ink)', alignSelf: 'flex-start' }}
          >
            {saving ? 'Guardando...' : 'Guardar sesión'}
          </button>
        </div>
      </div>

      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>Historial de sesiones</p>
        {sessionLogs.length === 0 ? (
          <p style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>Sin sesiones registradas todavía.</p>
        ) : (
          sessionLogs.map((log) => (
            <div key={log.id} style={{ borderLeft: '2px solid var(--line)', paddingLeft: 12, marginBottom: 8 }}>
              <p style={{ margin: 0, fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase' }}>
                {log.sessionDate} · {log.progressMarker}
              </p>
              {log.internalSummary && <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--ink)' }}>{log.internalSummary}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
