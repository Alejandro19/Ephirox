'use client';

import { useEffect, useState } from 'react';
import {
  listCasesDetailed,
  getCaseDetail,
  updateCheckpoint,
  exportCasesCsvUrl,
  type CaseListRow,
  type CaseDetailView,
  type CaseStatus,
} from '../../../lib/labeled-cases-client';
import { listProtocols, type StressProtocol } from '../../../lib/stress-protocols-client';
import { OUTCOME_RATINGS, type OutcomeRating } from '@latribu/shared-types';
import { showToast } from '../../layout/AppShell';
import EmptyState from '../../ui/EmptyState';
import Badge from '../../ui/Badge';

const cardStyle: React.CSSProperties = {
  background: 'var(--eph-surface)', border: '1px solid var(--eph-line)',
  borderRadius: 0, padding: '22px 24px', marginBottom: 20,
};
const cardTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: 18, fontWeight: 400, color: 'var(--eph-text)', margin: '0 0 16px',
};
const fieldStyle: React.CSSProperties = {
  height: 34, borderRadius: 0, border: '1px solid var(--eph-line-2)',
  padding: '0 10px', fontSize: 13, background: 'var(--eph-surface-2)', color: 'var(--eph-text)', outline: 'none',
};
const ghostButtonStyle: React.CSSProperties = {
  height: 34, padding: '0 14px', borderRadius: 0, border: '1px solid var(--eph-line-2)',
  fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
  background: 'transparent', color: 'var(--eph-body)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer',
};
const primaryButtonStyle: React.CSSProperties = {
  height: 32, padding: '0 14px', borderRadius: 0, border: 'none',
  fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
  background: 'var(--eph-accent)', color: 'var(--eph-ink)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace', fontSize: 10,
  textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 400, color: 'var(--eph-muted)', marginBottom: 6,
};
// Mismo tratamiento visual que las tiles de baseline en vivo
// (AdminStressProtocolCriteriaAndAssignment.tsx) — degradado cálido, label
// dorado (punto 25.5), acá para el snapshot CONGELADO del caso.
const tileStyle: React.CSSProperties = {
  background: 'linear-gradient(160deg, var(--eph-surface-2) 0%, var(--eph-surface) 100%)',
  border: '1px solid var(--eph-line-2)', padding: '14px 16px',
};
const tileLabelStyle: React.CSSProperties = { fontSize: 11, color: 'var(--eph-accent)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 };

// Título de sección dentro del detalle de un caso (spec 26.2) — mayúsculas,
// negrita, dorado, con una barra vertical de acento a la izquierda, para que
// funcione como separador real y no se confunda con un label de campo suelto
// (antes reutilizaba labelStyle, gris y sin protagonismo).
const sectionTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace', fontSize: 11, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--eph-accent)',
  margin: '22px 0 12px', borderLeft: '3px solid var(--eph-accent)', paddingLeft: 10,
};
// Mini-tarjeta para cada par etiqueta/valor del detalle (spec 26.2) — un
// tono más claro que el panel/fila que lo contiene (var(--eph-surface-2)),
// en vez de texto plano apilado sin ningún contenedor visual.
const miniTileStyle: React.CSSProperties = {
  background: 'color-mix(in srgb, var(--eph-surface-2) 82%, white 10%)',
  border: '1px solid var(--eph-line-2)', borderRadius: 10, padding: '12px 14px',
};
// Sombra sutil para reforzar el borde de cada fila de caso (spec 26.2
// "case-card"), mismo tratamiento que las filas de la librería de
// protocolos (AdminStressProtocolsPanel.tsx).
const rowShadow = '0 2px 10px -4px rgba(0,0,0,0.4)';

const STATUS_LABEL: Record<CaseStatus, string> = { activo: 'Activo', vencido: 'Checkpoint vencido', completado: 'Completado' };
const STATUS_VARIANT: Record<CaseStatus, 'success' | 'warn' | 'danger'> = { activo: 'success', vencido: 'danger', completado: 'warn' };
const RATING_LABEL: Record<OutcomeRating, string> = {
  mejora_significativa: 'Mejora significativa', mejora_leve: 'Mejora leve', sin_cambio: 'Sin cambio',
  empeora_leve: 'Empeora leve', empeora_significativa: 'Empeora significativa',
};
const IMPROVEMENT: OutcomeRating[] = ['mejora_significativa', 'mejora_leve'];
const WORSENING: OutcomeRating[] = ['empeora_leve', 'empeora_significativa'];

function ratingVariant(rating: OutcomeRating): 'success' | 'warn' | 'danger' {
  if (IMPROVEMENT.includes(rating)) return 'success';
  if (WORSENING.includes(rating)) return 'danger';
  return 'warn';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysOverdue(dueDate: string): number {
  return Math.floor((Date.now() - new Date(dueDate).getTime()) / (24 * 60 * 60 * 1000));
}

function CheckpointForm({ caseId, weekNumber, onSaved }: { caseId: string; weekNumber: number; onSaved: () => void }) {
  const [valoracion, setValoracion] = useState<OutcomeRating | ''>('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!valoracion) return;
    setSaving(true);
    try {
      await updateCheckpoint(caseId, weekNumber, { status: 'completado', valoracion, notes: notes.trim() || null });
      showToast('Checkpoint registrado.', 'success');
      onSaved();
    } catch (e) {
      showToast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--eph-line)' }}>
      <div>
        <label style={labelStyle} htmlFor={`cp-val-${caseId}-${weekNumber}`}>Valoración estándar</label>
        <select
          id={`cp-val-${caseId}-${weekNumber}`}
          style={{ ...fieldStyle, minWidth: 200 }}
          value={valoracion}
          onChange={(e) => setValoracion(e.target.value as OutcomeRating)}
        >
          <option value="">Selecciona una valoración…</option>
          {OUTCOME_RATINGS.map((r) => <option key={r} value={r}>{RATING_LABEL[r]}</option>)}
        </select>
      </div>
      <div style={{ flex: 1, minWidth: 180 }}>
        <label style={labelStyle} htmlFor={`cp-notes-${caseId}-${weekNumber}`}>Nota corta (opcional)</label>
        <input
          id={`cp-notes-${caseId}-${weekNumber}`}
          style={{ ...fieldStyle, width: '100%' }}
          value={notes}
          maxLength={140}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <button type="button" style={primaryButtonStyle} onClick={handleSave} disabled={saving || !valoracion}>
        Guardar checkpoint
      </button>
    </div>
  );
}

function CaseDetail({ caseId, onChanged }: { caseId: string; onChanged: () => void }) {
  const [detail, setDetail] = useState<CaseDetailView | null>(null);
  const [loading, setLoading] = useState(true);

  async function refetch() {
    setDetail(await getCaseDetail(caseId));
  }

  useEffect(() => {
    setLoading(true);
    refetch()
      .catch((e: Error) => showToast(e.message, 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  if (loading || !detail) return <p style={{ color: 'var(--eph-muted)', fontSize: 13 }}>Cargando detalle…</p>;

  const consentLabel = detail.dataResearchConsent === true
    ? '✓ Autorizado'
    : detail.dataResearchConsent === false
      ? 'No autorizado'
      : '⚠ Pendiente — cuenta registrada antes de incluir esta autorización';
  const consentColor = detail.dataResearchConsent === true ? 'var(--eph-accent)' : 'var(--eph-danger)';

  const finalRating = detail.labeledCase.outcome as OutcomeRating | null;

  return (
    <div style={{ borderTop: '1px solid var(--eph-line-2)', marginTop: 10, paddingTop: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div style={miniTileStyle}>
          <div style={labelStyle}>Caso</div>
          <div style={{ fontSize: 13, color: 'var(--eph-text)' }}>#{detail.labeledCase.caseNumber} — {detail.labeledCase.module}</div>
        </div>
        <div style={miniTileStyle}>
          <div style={labelStyle}>Mentor asignador</div>
          <div style={{ fontSize: 13, color: 'var(--eph-text)' }}>{detail.mentor?.name ?? '—'}</div>
        </div>
        <div style={miniTileStyle}>
          <div style={labelStyle}>Regla que lo activó</div>
          <div style={{ fontSize: 13, color: 'var(--eph-text)' }}>
            {detail.criteriaName ?? '—'}{detail.criteriaVersion != null && <span style={{ color: 'var(--eph-muted)' }}> v{detail.criteriaVersion}</span>}
          </div>
        </div>
        <div style={miniTileStyle}>
          <div style={labelStyle}>Día 0 (inicio)</div>
          <div style={{ fontSize: 13, color: 'var(--eph-text)' }}>{formatDate(detail.labeledCase.assignedAt)}</div>
        </div>
        <div style={miniTileStyle}>
          <div style={labelStyle}>Duración del ciclo</div>
          <div style={{ fontSize: 13, color: 'var(--eph-text)' }}>{detail.labeledCase.cycleWeeks} semanas</div>
        </div>
        <div style={miniTileStyle}>
          <div style={labelStyle}>Consentimiento de datos (perfil del cliente)</div>
          <div style={{ fontSize: 13, color: consentColor, fontWeight: 600 }}>{consentLabel}</div>
        </div>
      </div>

      <p style={sectionTitleStyle}>Snapshot del baseline al momento de asignar</p>
      <p style={{ fontSize: 11, color: 'var(--eph-faint)', marginTop: -4, marginBottom: 10 }}>
        Congelado — no cambia aunque el baseline actual del cliente cambie.
      </p>
      {(() => {
        const b = detail.labeledCase.baselineSnapshot ?? {};
        const tiles: { label: string; value: number | null; unit: string }[] = [
          { label: 'HRV basal', value: b.hrvNocturno ?? null, unit: 'ms' },
          { label: 'FC en reposo', value: b.fcReposo ?? null, unit: 'bpm' },
          { label: 'Sleep score', value: b.suenoScore ?? null, unit: '/100' },
          { label: 'Recovery score', value: b.recoveryScore ?? null, unit: '/100' },
          { label: 'Carga Cognitiva', value: b.cognitiveLoadScore ?? null, unit: '/10' },
        ];
        if (tiles.every((t) => t.value == null)) {
          return <p style={{ fontSize: 12, color: 'var(--eph-faint)' }}>Sin datos de wearable/carga cognitiva disponibles al momento de asignar.</p>;
        }
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
            {tiles.map((t) => (
              <div key={t.label} style={tileStyle}>
                <div style={tileLabelStyle}>{t.label}</div>
                <div style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 24, fontWeight: 600, color: 'var(--eph-text)', marginTop: 6 }}>
                  {t.value != null ? `${t.value} ${t.unit}` : '—'}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      <p style={sectionTitleStyle}>Checkpoints de seguimiento</p>
      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {detail.checkpoints.map((c) => (
          <div key={c.id} style={{ padding: '10px 12px', border: '1px solid var(--eph-line)', background: 'var(--eph-surface-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <strong style={{ fontSize: 13, color: 'var(--eph-text)' }}>Semana {c.weekNumber}</strong>
              <span style={{ fontSize: 12, color: 'var(--eph-muted)' }}>{formatDate(c.dueDate)}</span>
              {c.overdue ? (
                <Badge label={`Vencido hace ${daysOverdue(c.dueDate)} días`} variant="danger" />
              ) : c.status === 'completado' ? (
                <Badge label="Registrado" variant="success" />
              ) : (
                <Badge label={new Date(c.dueDate).getTime() > Date.now() ? 'Próximamente' : 'Pendiente'} variant="warn" />
              )}
              {c.valoracion && <Badge label={RATING_LABEL[c.valoracion]} variant={ratingVariant(c.valoracion)} />}
            </div>
            {c.notes && <p style={{ fontSize: 12, color: 'var(--eph-muted)', marginTop: 6 }}>Nota: {c.notes}</p>}
            {c.status === 'pendiente' && (
              <CheckpointForm caseId={caseId} weekNumber={c.weekNumber} onSaved={() => { refetch(); onChanged(); }} />
            )}
          </div>
        ))}
      </div>

      <p style={sectionTitleStyle}>Etiqueta final de resultado</p>
      {finalRating ? (
        <Badge label={RATING_LABEL[finalRating]} variant={ratingVariant(finalRating)} />
      ) : detail.checkpoints.some((c) => c.overdue) ? (
        <p style={{ fontSize: 12, color: 'var(--eph-danger)', marginTop: 6 }}>
          No se puede etiquetar el caso mientras haya un checkpoint vencido sin registrar — este caso queda fuera del dataset hasta resolverse.
        </p>
      ) : (
        <p style={{ fontSize: 12, color: 'var(--eph-faint)', marginTop: 6 }}>Se define al completar el último checkpoint.</p>
      )}
    </div>
  );
}

export function AdminStressCasesPanel() {
  const [cases, setCases] = useState<CaseListRow[]>([]);
  const [protocols, setProtocols] = useState<StressProtocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<CaseStatus | ''>('');
  const [protocolId, setProtocolId] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function refetch() {
    const [caseRows, protocolRows] = await Promise.all([
      listCasesDetailed('stress', { search: search || undefined, status: status || undefined, protocolId: protocolId || undefined }),
      listProtocols(),
    ]);
    setCases(caseRows);
    setProtocols(protocolRows);
  }

  useEffect(() => {
    setLoading(true);
    refetch()
      .catch((e: Error) => showToast(e.message, 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, protocolId]);

  if (loading) return <div style={cardStyle}><p style={{ color: 'var(--eph-muted)', fontSize: 14, margin: 0 }}>Cargando casos etiquetados…</p></div>;

  return (
    <div style={cardStyle}>
      <h3 style={cardTitleStyle}>Casos etiquetados — Stress</h3>
      <p style={{ fontSize: 13, color: 'var(--eph-muted)', marginTop: -10, marginBottom: 16, maxWidth: 640 }}>
        Cada fila es el objeto que alimenta el dataset propietario: cliente + snapshot de baseline congelado + protocolo + resultado medido en cada checkpoint.
      </p>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <input
          type="text"
          style={{ ...fieldStyle, flex: 1, minWidth: 180 }}
          placeholder="Buscar cliente o protocolo…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Buscar cliente o protocolo"
        />
        <select style={fieldStyle} value={status} onChange={(e) => setStatus(e.target.value as CaseStatus | '')} aria-label="Filtrar por estado">
          <option value="">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="vencido">Checkpoint vencido</option>
          <option value="completado">Completados</option>
        </select>
        <select style={fieldStyle} value={protocolId} onChange={(e) => setProtocolId(e.target.value)} aria-label="Filtrar por protocolo">
          <option value="">Todos los protocolos</option>
          {protocols.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {cases.length === 0 ? (
        <EmptyState message="No hay casos etiquetados con estos filtros." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {cases.map((c) => (
            <div key={c.id} style={{ border: '1px solid var(--eph-line)', background: 'var(--eph-surface-2)', borderRadius: 8, padding: '12px 14px', boxShadow: rowShadow }}>
              <button
                type="button"
                onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', flexWrap: 'wrap' }}
              >
                <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--eph-text)' }}>{c.clientName}</div>
                  <div style={{ fontSize: 11, color: 'var(--eph-muted)' }}>{c.protocolName}</div>
                </div>
                <Badge label={STATUS_LABEL[c.status]} variant={STATUS_VARIANT[c.status]} />
                <span style={{ fontSize: 12, color: 'var(--eph-muted)' }}>Semana {c.currentWeek} de {c.cycleWeeks}</span>
                <span style={{ fontSize: 12, color: c.nextCheckpoint?.overdue ? 'var(--eph-danger)' : 'var(--eph-muted)' }}>
                  {c.nextCheckpoint
                    ? `${c.nextCheckpoint.overdue ? 'Venció hace' : 'Próximo checkpoint:'} ${c.nextCheckpoint.overdue ? `${daysOverdue(c.nextCheckpoint.dueDate)} días` : formatDate(c.nextCheckpoint.dueDate)}`
                    : '—'}
                </span>
                {c.outcome ? (
                  <Badge label={RATING_LABEL[c.outcome]} variant={ratingVariant(c.outcome)} />
                ) : (
                  <Badge label="Pendiente" variant="warn" />
                )}
                <span style={{ marginLeft: 'auto', color: 'var(--eph-muted)' }}>{expandedId === c.id ? '▴' : '▾'}</span>
              </button>
              {expandedId === c.id && <CaseDetail caseId={c.id} onChanged={refetch} />}
            </div>
          ))}
        </div>
      )}

      <p style={{ fontSize: 12, color: 'var(--eph-faint)', marginTop: 16, maxWidth: 640 }}>
        Un caso solo queda disponible para el dataset agregado cuando el cliente autorizó el uso de sus datos para investigación y no tiene checkpoints vencidos sin registrar.
      </p>

      <a
        href={exportCasesCsvUrl('stress')}
        target="_blank"
        rel="noreferrer"
        style={{ ...ghostButtonStyle, display: 'inline-flex', alignItems: 'center', textDecoration: 'none', marginTop: 10 }}
      >
        Exportar CSV (Stress)
      </a>
    </div>
  );
}
