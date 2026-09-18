'use client';

import { useEffect, useState } from 'react';
import { listMetrics, updateMetric, type MetricsCatalogEntry } from '../../../lib/assignment-criteria-client';
import { showToast } from '../../layout/AppShell';
import EmptyState from '../../ui/EmptyState';
import Badge from '../../ui/Badge';

const MODULE_LABEL: Record<string, string> = { stress: 'Stress', training: 'Workout', nutrition: 'Nutrition', rest: 'Sleep' };

const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '10px 12px', fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
  fontSize: 10, fontWeight: 400, color: 'var(--eph-muted)', textTransform: 'uppercase',
  letterSpacing: '0.1em', borderBottom: '1px solid var(--eph-line)',
};
const tdStyle: React.CSSProperties = { padding: '10px 12px', fontSize: 13, color: 'var(--eph-text)', verticalAlign: 'middle' };
const smallInputStyle: React.CSSProperties = {
  width: 64, height: 28, borderRadius: 0, border: '1px solid var(--eph-line-2)',
  padding: '0 6px', fontSize: 12, background: 'var(--eph-surface-2)', color: 'var(--eph-text)', outline: 'none',
};
const ghostButtonStyle: React.CSSProperties = {
  height: 28, padding: '0 10px', borderRadius: 0, border: '1px solid var(--eph-line-2)',
  fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
  background: 'transparent', color: 'var(--eph-body)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer',
};

// Catálogo de marcadores (spec 21.1) — se puebla por seed de código (ver
// metrics-catalog.service.ts::SEED_METRICS), NO desde acá: el admin solo
// activa/desactiva y ajusta reference_range. Crear un fieldKey arbitrario a
// mano rompería un criterio en silencio (typo camelCase/snake_case), así
// que esta UI no ofrece "+ Agregar marcador" todavía a propósito.
export function AdminMetricsCatalogPanel() {
  const [metrics, setMetrics] = useState<MetricsCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, { min: string; max: string }>>({});

  async function refetch() {
    const rows = await listMetrics();
    setMetrics(rows);
    setDrafts(
      Object.fromEntries(
        rows.map((m) => [m.id, { min: m.referenceRange?.min != null ? String(m.referenceRange.min) : '', max: m.referenceRange?.max != null ? String(m.referenceRange.max) : '' }])
      )
    );
  }

  useEffect(() => {
    refetch()
      .catch((e: Error) => showToast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  async function handleToggleActive(metric: MetricsCatalogEntry) {
    try {
      await updateMetric(metric.id, { active: !metric.active });
      await refetch();
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  }

  async function handleSaveRange(metricId: string) {
    const draft = drafts[metricId];
    try {
      await updateMetric(metricId, {
        reference_range: { min: draft.min ? Number(draft.min) : null, max: draft.max ? Number(draft.max) : null },
      });
      showToast('Rango de referencia actualizado.', 'success');
      await refetch();
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  }

  if (loading) return <p style={{ color: 'var(--eph-muted)', fontSize: 14 }}>Cargando catálogo de marcadores…</p>;
  if (metrics.length === 0) return <EmptyState message="Catálogo de marcadores vacío." />;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle}>Marcador</th>
            <th style={thStyle}>Unidad</th>
            <th style={thStyle}>Fuente</th>
            <th style={thStyle}>Rango de referencia</th>
            <th style={thStyle}>Módulos</th>
            <th style={thStyle}>Estado</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((m) => (
            <tr key={m.id} style={{ borderBottom: '1px solid var(--eph-line)' }}>
              <td style={tdStyle}>{m.name}</td>
              <td style={tdStyle}>{m.unit || '—'}</td>
              <td style={tdStyle}>{m.source}</td>
              <td style={tdStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    aria-label={`Mínimo de ${m.name}`}
                    style={smallInputStyle}
                    type="number"
                    value={drafts[m.id]?.min ?? ''}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [m.id]: { ...prev[m.id], min: e.target.value } }))}
                  />
                  <span style={{ color: 'var(--eph-muted)' }}>–</span>
                  <input
                    aria-label={`Máximo de ${m.name}`}
                    style={smallInputStyle}
                    type="number"
                    value={drafts[m.id]?.max ?? ''}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [m.id]: { ...prev[m.id], max: e.target.value } }))}
                  />
                  <button type="button" style={ghostButtonStyle} onClick={() => handleSaveRange(m.id)}>Guardar</button>
                </div>
              </td>
              <td style={tdStyle}>
                {m.modulesInUse.length === 0 ? (
                  <span style={{ color: 'var(--eph-faint)' }}>—</span>
                ) : (
                  m.modulesInUse.map((mod) => <Badge key={mod} label={MODULE_LABEL[mod] ?? mod} variant="success" />)
                )}
              </td>
              <td style={tdStyle}>
                <button type="button" style={{ ...ghostButtonStyle, cursor: 'pointer' }} onClick={() => handleToggleActive(m)}>
                  <Badge label={m.active ? 'Activo' : 'Inactivo'} variant={m.active ? 'success' : 'warn'} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
