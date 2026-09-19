'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { updateProtocolCriteria } from '../../lib/stress-protocols-client';
import { listCriteria, listMetrics, getMatchingClients, type AssignmentCriteria, type MetricsCatalogEntry } from '../../lib/assignment-criteria-client';
import { listActiveClientsWithBaseline, type ActiveClientBaseline } from '../../lib/admin-client-baseline-client';
import { createCase, listRecentCases, type RecentCaseLogEntry } from '../../lib/labeled-cases-client';
import { OPERATOR_LABEL } from '../admin/criteria/CriteriaRuleBuilder';
import { STRESS_SUGGESTED_FREQUENCIES, type ConditionNode } from '@latribu/shared-types';
import { showToast } from '../layout/AppShell';
import SubCard from '../ui/SubCard';

// Duraciones de ciclo ofrecidas al admin — 6 y 12 coinciden con los
// checkpoints reales (FOLLOWUP_WEEKS en labeled-cases.service.ts); 8 y 16
// son opciones intermedias/largas razonables sin checkpoint propio. Mismo
// listado que AdminStressProtocolsPanel.tsx (duplicado a propósito, dato
// trivial — ver convención de cardStyle/cardTitleStyle en ese archivo).
const CYCLE_WEEKS_OPTIONS = [6, 8, 12, 16] as const;

const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace', fontSize: 10,
  textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 400, color: 'var(--eph-muted)', marginBottom: 6,
};
const fieldStyle: React.CSSProperties = {
  width: '100%', height: 34, borderRadius: 0, border: '1px solid var(--eph-line-2)',
  padding: '0 10px', fontSize: 14, background: 'var(--eph-surface-2)', color: 'var(--eph-text)', outline: 'none',
};
const chipStyle: React.CSSProperties = {
  fontSize: 12, color: 'var(--eph-text)', background: 'var(--eph-surface-2)', border: '1px solid var(--eph-line-2)',
  borderRadius: 999, padding: '5px 11px', display: 'inline-block',
};
const joinerChipStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--eph-accent)' };
// Más protagonismo visual (punto 25.5): degradado cálido + label dorado en
// todas las tiles, con borde+glow reservado para la destacada.
const tileStyle: React.CSSProperties = {
  background: 'linear-gradient(160deg, var(--eph-surface-2) 0%, var(--eph-surface) 100%)',
  border: '1px solid var(--eph-line-2)', padding: '14px 16px',
};
const tileHighlightStyle: React.CSSProperties = {
  ...tileStyle,
  background: 'linear-gradient(160deg, color-mix(in srgb, var(--eph-accent) 16%, var(--eph-surface-2)) 0%, var(--eph-surface-2) 100%)',
  border: '1.5px solid var(--eph-accent)',
  boxShadow: '0 0 0 1px color-mix(in srgb, var(--eph-accent) 30%, transparent), 0 12px 26px -10px color-mix(in srgb, var(--eph-accent) 45%, transparent)',
};
const tileLabelStyle: React.CSSProperties = { fontSize: 11, color: 'var(--eph-accent)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 };
const primaryButtonStyle: React.CSSProperties = {
  height: 36, padding: '0 18px', borderRadius: 0, border: 'none',
  fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
  background: 'var(--eph-accent)', color: 'var(--eph-ink)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', cursor: 'pointer',
};
const tagMatchStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--eph-accent)',
  background: 'rgba(132,160,110,.12)', border: '1px solid var(--eph-accent-edge)', borderRadius: 999, padding: '3px 9px', whiteSpace: 'nowrap',
};

// "Flag de estado" bajo cada tarjeta de baseline (spec 19.1/20.1): contra el
// rango de referencia real del catálogo (lab/wearable/médico), nunca contra
// un percentil de cohorte. Sin rango definido para ese marcador todavía
// (Sleep score y Recovery score no tienen uno sembrado — ver SEED_METRICS,
// metrics-catalog.service.ts), no se inventa un umbral: simplemente no se
// muestra flag para ese caso.
function referenceFlag(metricNamePrefix: string, value: number | null, metrics: MetricsCatalogEntry[]): string | null {
  if (value == null) return null;
  const metric = metrics.find((m) => m.name.startsWith(metricNamePrefix));
  const range = metric?.referenceRange;
  if (!range || (range.min == null && range.max == null)) return null;
  const rangeLabel = `${range.min ?? '0'}–${range.max ?? '∞'} ${metric?.unit ?? ''}`.trim();
  if (range.min != null && value < range.min) return `Bajo rango de referencia (${rangeLabel})`;
  if (range.max != null && value > range.max) return `Sobre rango de referencia (${rangeLabel})`;
  return `Dentro de rango (${rangeLabel})`;
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays <= 0) return 'hoy';
  if (diffDays === 1) return 'hace 1 día';
  if (diffDays < 30) return `hace ${diffDays} días`;
  const diffMonths = Math.floor(diffDays / 30);
  return diffMonths === 1 ? 'hace 1 mes' : `hace ${diffMonths} meses`;
}

function renderConditionChips(node: ConditionNode, metricsById: Map<string, MetricsCatalogEntry>): React.ReactNode {
  if ('metric_id' in node) {
    const metric = metricsById.get(node.metric_id);
    const value = node.operator === 'fuera_de_rango' ? `${node.value}–${node.value_max ?? node.value}` : String(node.value);
    return <span style={chipStyle}>{metric?.name ?? node.metric_id} <b>{OPERATOR_LABEL[node.operator]}</b> {value}{metric?.unit ? ` ${metric.unit}` : ''}</span>;
  }
  return (
    <>
      {node.rules.map((r, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {i > 0 && <span style={joinerChipStyle}>{node.op === 'AND' ? 'Y' : 'O'}</span>}
          {renderConditionChips(r, metricsById)}
        </span>
      ))}
    </>
  );
}

// Bloque "Criterios de asignación" + "Asignar a clientes activos" del
// formulario de protocolo (spec 19.1/19.3/22) — el armador de reglas NO vive
// acá (eso quedó en Administración → Criterios y Marcadores, Fase 6); este
// bloque solo selecciona un criterio ya publicado y muestra su resumen de
// solo lectura, con link para crear/editar uno nuevo.
//
// Frecuencia/Duración de ciclo (suggestedFrequency/defaultCycleWeeks/
// onScheduleChange) se pasan desde ProtocolDetail y se renderizan DENTRO de
// la misma sub-card "Reglas de asignación" que el selector de Regla (spec
// 26.2: van agrupados, no repartidos entre dos cards distintas). Recursos
// del protocolo sigue viviendo en AdminStressProtocolsPanel.tsx — se inyecta
// acá vía `afterCriteriaCard` para mantener el orden de cards que pide el
// spec (Datos → Reglas → Recursos → Asignar a clientes) sin mover esa lógica
// de archivo.
export function AdminStressProtocolCriteriaAndAssignment({
  protocolId,
  criteriaId,
  onCriteriaChange,
  suggestedFrequency = null,
  defaultCycleWeeks = 12,
  onScheduleChange = () => {},
  afterCriteriaCard = null,
}: {
  protocolId: string;
  criteriaId: string | null;
  onCriteriaChange: (criteriaId: string | null) => void;
  suggestedFrequency?: string | null;
  defaultCycleWeeks?: number;
  onScheduleChange?: (patch: { suggested_frequency?: string | null; default_cycle_weeks?: number }) => void;
  afterCriteriaCard?: React.ReactNode;
}) {
  const [criteriaList, setCriteriaList] = useState<AssignmentCriteria[]>([]);
  const [metrics, setMetrics] = useState<MetricsCatalogEntry[]>([]);
  const [activeClients, setActiveClients] = useState<ActiveClientBaseline[]>([]);
  const [matchingIds, setMatchingIds] = useState<Set<string> | null>(null);
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [assignedCount, setAssignedCount] = useState<number | null>(null);
  const [recentCases, setRecentCases] = useState<RecentCaseLogEntry[]>([]);

  async function refetch() {
    const [criteriaRows, metricRows, clientRows, recentRows] = await Promise.all([
      listCriteria(),
      listMetrics(),
      listActiveClientsWithBaseline(),
      listRecentCases('stress'),
    ]);
    setCriteriaList(criteriaRows.filter((c) => c.status === 'publicado' && c.applicableModules.includes('stress')));
    setMetrics(metricRows);
    setActiveClients(clientRows);
    setRecentCases(recentRows);
  }

  useEffect(() => {
    refetch()
      .catch((e: Error) => showToast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!criteriaId) {
      setMatchingIds(null);
      return;
    }
    getMatchingClients(criteriaId)
      .then((rows) => {
        const ids = new Set(rows.map((r) => r.id));
        setMatchingIds(ids);
        setSelectedClientIds(new Set(ids));
      })
      .catch((e: Error) => showToast(e.message, 'error'));
  }, [criteriaId]);

  async function handleCriteriaSelect(newId: string) {
    const value = newId || null;
    try {
      await updateProtocolCriteria(protocolId, value);
      onCriteriaChange(value);
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  }

  function toggleClient(clientId: string) {
    setSelectedClientIds((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  }

  async function handleAssign() {
    setAssigning(true);
    setAssignedCount(null);
    try {
      let count = 0;
      for (const clientId of selectedClientIds) {
        await createCase(clientId, { module: 'stress', protocol_id: protocolId, mentor_id: null });
        count += 1;
      }
      setAssignedCount(count);
      showToast(`Protocolo asignado a ${count} cliente(s) — caso etiquetado creado por cada uno.`, 'success');
      listRecentCases('stress').then(setRecentCases).catch(() => {});
    } catch (e) {
      showToast((e as Error).message, 'error');
    } finally {
      setAssigning(false);
    }
  }

  if (loading) return <p style={{ color: 'var(--eph-muted)', fontSize: 14 }}>Cargando criterios y clientes…</p>;

  const selectedCriteria = criteriaList.find((c) => c.id === criteriaId);
  const metricsById = new Map(metrics.map((m) => [m.id, m]));
  const filteredClients = activeClients.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  const focusedClient = activeClients.find((c) => selectedClientIds.has(c.id)) ?? filteredClients[0] ?? null;

  return (
    <div>
      <SubCard kicker="Reglas de asignación">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 18 }}>
          <div>
            <label style={labelStyle} htmlFor="pd-frequency">Frecuencia sugerida</label>
            <select
              id="pd-frequency"
              style={fieldStyle}
              value={suggestedFrequency ?? ''}
              onChange={(e) => onScheduleChange({ suggested_frequency: e.target.value || null })}
            >
              <option value="">Sin definir</option>
              {STRESS_SUGGESTED_FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle} htmlFor="pd-cycle-weeks">Duración del ciclo</label>
            <select
              id="pd-cycle-weeks"
              style={fieldStyle}
              value={defaultCycleWeeks}
              onChange={(e) => onScheduleChange({ default_cycle_weeks: Number(e.target.value) })}
            >
              {CYCLE_WEEKS_OPTIONS.map((w) => <option key={w} value={w}>{w} semanas</option>)}
            </select>
          </div>
        </div>

        <label style={labelStyle} htmlFor="criteria-picker">Regla guardada</label>
        <select id="criteria-picker" style={fieldStyle} value={criteriaId ?? ''} onChange={(e) => handleCriteriaSelect(e.target.value)}>
          <option value="">Sin regla</option>
          {criteriaList.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {selectedCriteria && (
          <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            {renderConditionChips(selectedCriteria.conditions, metricsById)}
          </div>
        )}
        <p style={{ fontSize: 12, color: 'var(--eph-faint)', marginTop: 10, maxWidth: 560 }}>
          Las reglas se crean y versionan una sola vez en <strong style={{ color: 'var(--eph-text)' }}>Administración → Reglas y Marcadores</strong>, y se reutilizan aquí y en los protocolos de Workout, Nutrition y Sleep — este formulario solo selecciona cuál aplicar, no la construye.{' '}
          <Link href="/admin/criteria" style={{ color: 'var(--eph-accent)' }}>Crear o editar reglas en Administración →</Link>
        </p>

        {focusedClient && (
          <>
            <h4 style={{ margin: '22px 0 8px', fontSize: 14, fontWeight: 600, color: 'var(--eph-text)' }}>
              Baseline relevante para Stress — {focusedClient.name}
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
              {([
                ['HRV basal', focusedClient.hrvNocturno, 'ms', true],
                ['FC en reposo', focusedClient.fcReposo, 'bpm', false],
                ['Sleep score', focusedClient.suenoScore, '/100', false],
                ['Recovery score', focusedClient.recoveryScore, '/100', false],
              ] as const).map(([label, value, unit, highlight]) => {
                const flag = referenceFlag(label, value, metrics);
                return (
                  <div key={label} style={highlight ? tileHighlightStyle : tileStyle}>
                    <div style={highlight ? tileLabelStyle : { ...tileLabelStyle, color: 'var(--eph-muted)' }}>{label}</div>
                    <div style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 30, fontWeight: 600, color: 'var(--eph-text)', marginTop: 6 }}>
                      {value != null ? `${value} ${unit}` : '—'}
                    </div>
                    {flag && (
                      <div style={{ fontSize: 11, marginTop: 6, fontWeight: 600, color: flag.startsWith('Dentro') ? 'var(--eph-accent)' : 'var(--eph-danger)' }}>
                        {flag}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </SubCard>

      {afterCriteriaCard}

      <SubCard kicker="Asignar a clientes activos">
        <input
          type="text"
          style={fieldStyle}
          placeholder="Buscar cliente activo…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Buscar cliente activo"
        />
        <div style={{ marginTop: 10 }}>
          {filteredClients.map((c) => (
            <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '0.5px solid var(--eph-line)', cursor: 'pointer' }}>
              <input type="checkbox" checked={selectedClientIds.has(c.id)} onChange={() => toggleClient(c.id)} />
              <span style={{ flex: 1, fontSize: 13, color: 'var(--eph-text)' }}>{c.name}</span>
              <span style={{ fontSize: 11, color: 'var(--eph-muted)' }}>{c.hrvNocturno != null ? `HRV ${c.hrvNocturno} ms` : 'sin wearable'}</span>
              {matchingIds && (
                <span style={tagMatchStyle}>{matchingIds.has(c.id) ? 'Cumple regla' : 'No cumple'}</span>
              )}
            </label>
          ))}
        </div>
        {matchingIds && (
          <p style={{ fontSize: 11, color: 'var(--eph-faint)', marginTop: 8 }}>
            Los marcados &quot;Cumple regla&quot; se preseleccionan solos según el baseline — puedes agregar o quitar clientes manualmente antes de guardar.
          </p>
        )}
        <button type="button" style={{ ...primaryButtonStyle, marginTop: 14 }} onClick={handleAssign} disabled={assigning || selectedClientIds.size === 0}>
          {assigning ? 'Asignando…' : `Asignar protocolo a ${selectedClientIds.size} cliente(s)`}
        </button>
        {assignedCount != null && (
          <p style={{ fontSize: 12, color: 'var(--eph-accent)', marginTop: 8 }}>
            Protocolo asignado — {assignedCount} caso(s) etiquetado(s) creado(s), cada uno con su propio snapshot de baseline.
          </p>
        )}
      </SubCard>

      <SubCard kicker="Asignaciones recientes">
        {recentCases.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--eph-faint)' }}>Todavía no hay protocolos asignados en Stress.</p>
        ) : (
          <div>
            {recentCases.map((rc, i) => (
              <div
                key={rc.id}
                style={{ padding: '8px 0', borderBottom: i === recentCases.length - 1 ? 'none' : '0.5px solid var(--eph-line)', fontSize: 12, color: 'var(--eph-text)', display: 'flex', justifyContent: 'space-between', gap: 10 }}
              >
                <span>
                  <strong>{rc.clientName}</strong>
                  <span style={{ color: 'var(--eph-muted)' }}> — {rc.clientType}</span> → {rc.protocolName} · <span style={{ color: 'var(--eph-muted)' }}>Caso #{rc.caseNumber}</span>
                </span>
                <span style={{ color: 'var(--eph-faint)', whiteSpace: 'nowrap' }}>{relativeTime(rc.assignedAt)}</span>
              </div>
            ))}
          </div>
        )}
      </SubCard>
    </div>
  );
}
