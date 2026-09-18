'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { updateProtocolCriteria } from '../../lib/stress-protocols-client';
import { listCriteria, listMetrics, getMatchingClients, type AssignmentCriteria, type MetricsCatalogEntry } from '../../lib/assignment-criteria-client';
import { listActiveClientsWithBaseline, type ActiveClientBaseline } from '../../lib/admin-client-baseline-client';
import { createCase } from '../../lib/labeled-cases-client';
import { OPERATOR_LABEL } from '../admin/criteria/CriteriaRuleBuilder';
import type { ConditionNode } from '@latribu/shared-types';
import { showToast } from '../layout/AppShell';

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
const tileStyle: React.CSSProperties = {
  background: 'var(--eph-surface-2)', border: '1px solid var(--eph-line-2)', padding: '12px 14px',
};
const tileHighlightStyle: React.CSSProperties = { ...tileStyle, borderColor: 'var(--eph-accent)', background: 'rgba(201,166,107,.10)' };
const primaryButtonStyle: React.CSSProperties = {
  height: 36, padding: '0 18px', borderRadius: 0, border: 'none',
  fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
  background: 'var(--eph-accent)', color: 'var(--eph-ink)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', cursor: 'pointer',
};
const tagMatchStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--eph-accent)',
  background: 'rgba(132,160,110,.12)', border: '1px solid var(--eph-accent-edge)', borderRadius: 999, padding: '3px 9px', whiteSpace: 'nowrap',
};

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
export function AdminStressProtocolCriteriaAndAssignment({
  protocolId,
  criteriaId,
  onCriteriaChange,
}: {
  protocolId: string;
  criteriaId: string | null;
  onCriteriaChange: (criteriaId: string | null) => void;
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

  async function refetch() {
    const [criteriaRows, metricRows, clientRows] = await Promise.all([listCriteria(), listMetrics(), listActiveClientsWithBaseline()]);
    setCriteriaList(criteriaRows.filter((c) => c.status === 'publicado' && c.applicableModules.includes('stress')));
    setMetrics(metricRows);
    setActiveClients(clientRows);
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
      <h3 style={{ margin: '18px 0 8px', fontSize: 14, fontWeight: 600, color: 'var(--eph-text)' }}>Criterios de asignación</h3>
      <label style={labelStyle} htmlFor="criteria-picker">Criterio guardado</label>
      <select id="criteria-picker" style={fieldStyle} value={criteriaId ?? ''} onChange={(e) => handleCriteriaSelect(e.target.value)}>
        <option value="">Sin criterio</option>
        {criteriaList.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      {selectedCriteria && (
        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          {renderConditionChips(selectedCriteria.conditions, metricsById)}
        </div>
      )}
      <p style={{ fontSize: 12, color: 'var(--eph-faint)', marginTop: 10, maxWidth: 560 }}>
        Los criterios se crean y versionan una sola vez en <strong style={{ color: 'var(--eph-text)' }}>Administración → Criterios y Marcadores</strong>, y se reutilizan aquí y en los protocolos de Workout, Nutrition y Sleep — este formulario solo selecciona cuál aplicar, no lo construye.{' '}
        <Link href="/admin/criteria" style={{ color: 'var(--eph-accent)' }}>Crear o editar criterios en Administración →</Link>
      </p>

      {focusedClient && (
        <>
          <h3 style={{ margin: '22px 0 8px', fontSize: 14, fontWeight: 600, color: 'var(--eph-text)' }}>
            Baseline relevante para Stress — {focusedClient.name}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
            {([
              ['HRV basal', focusedClient.hrvNocturno, 'ms', true],
              ['FC en reposo', focusedClient.fcReposo, 'bpm', false],
              ['Sleep score', focusedClient.suenoScore, '/100', false],
              ['Recovery score', focusedClient.recoveryScore, '/100', false],
            ] as const).map(([label, value, unit, highlight]) => (
              <div key={label} style={highlight ? tileHighlightStyle : tileStyle}>
                <div style={{ fontSize: 10, color: 'var(--eph-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
                <div style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 24, color: 'var(--eph-text)', marginTop: 4 }}>
                  {value != null ? `${value} ${unit}` : '—'}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <h3 style={{ margin: '22px 0 8px', fontSize: 14, fontWeight: 600, color: 'var(--eph-text)' }}>Asignar a clientes activos</h3>
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
              <span style={tagMatchStyle}>{matchingIds.has(c.id) ? 'Cumple criterio' : 'No cumple'}</span>
            )}
          </label>
        ))}
      </div>
      {matchingIds && (
        <p style={{ fontSize: 11, color: 'var(--eph-faint)', marginTop: 8 }}>
          Los marcados &quot;Cumple criterio&quot; se preseleccionan solos según el baseline — puedes agregar o quitar clientes manualmente antes de guardar.
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
    </div>
  );
}
