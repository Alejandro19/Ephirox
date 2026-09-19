'use client';

import { Fragment, useState } from 'react';
import useSWR from 'swr';
import {
  listMetrics,
  createMetric,
  updateMetric,
  deleteMetric,
  type MetricsCatalogEntry,
  type MetricCatalogInput,
} from '../../../lib/assignment-criteria-client';
import { METRIC_SOURCES, METRIC_AGGREGATIONS, type MetricSource, type MetricAggregation } from '@latribu/shared-types';
import { showToast } from '../../layout/AppShell';
import EmptyState from '../../ui/EmptyState';
import Badge from '../../ui/Badge';

const MODULE_LABEL: Record<string, string> = { stress: 'Stress', training: 'Workout', nutrition: 'Nutrition', rest: 'Sleep' };
const SOURCE_LABEL: Record<MetricSource, string> = {
  wearable: 'Wearable', lab_panel: 'Panel de laboratorio', cognitive_load: 'Carga Cognitiva', morning_checkin: 'Check-in matutino',
};
const AGGREGATION_LABEL: Record<MetricAggregation, string> = { latest: 'Más reciente', avg_7d: 'Promedio 7 días', avg_14d: 'Promedio 14 días' };

// Opciones cerradas de field_key para las fuentes con columnas fijas
// conocidas (ver metric-value-resolver.ts::resolveWearableField/
// resolveCognitiveLoadField) — esto es lo que evita el riesgo real de un
// typo camelCase/snake_case que rompería un criterio en silencio, sin
// bloquear por completo la creación de marcadores que pidió Alejandro.
// lab_panel/morning_checkin leen de un JSON sin columnas fijas que
// enumerar, así que ahí el campo sí es texto libre.
const WEARABLE_FIELD_KEYS = [
  { value: 'hrvNocturno', label: 'HRV nocturno' },
  { value: 'fcReposo', label: 'FC en reposo' },
  { value: 'suenoScore', label: 'Sleep score' },
  { value: 'recoveryScore', label: 'Recovery score' },
  { value: 'readinessScore', label: 'Readiness score' },
];
const COGNITIVE_LOAD_FIELD_KEYS = [{ value: 'score', label: 'Score (0-10)' }];

function fieldKeyOptions(source: MetricSource): { value: string; label: string }[] | null {
  if (source === 'wearable') return WEARABLE_FIELD_KEYS;
  if (source === 'cognitive_load') return COGNITIVE_LOAD_FIELD_KEYS;
  return null;
}

const cardStyle: React.CSSProperties = {
  background: 'var(--eph-surface)', border: '1px solid var(--eph-line)',
  borderRadius: 0, padding: '22px 24px', marginBottom: 20,
};
const cardTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: 18, fontWeight: 400, color: 'var(--eph-text)', margin: '0 0 16px',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace', fontSize: 10,
  textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 400, color: 'var(--eph-muted)', marginBottom: 6,
};
const inputStyle: React.CSSProperties = {
  width: '100%', height: 34, borderRadius: 0, border: '1px solid var(--eph-line-2)',
  padding: '0 10px', fontSize: 14, background: 'var(--eph-surface-2)', color: 'var(--eph-text)', outline: 'none', boxSizing: 'border-box',
};
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
const dangerButtonStyle: React.CSSProperties = {
  height: 28, padding: '0 10px', borderRadius: 0, border: '1px solid var(--eph-danger)',
  fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
  background: 'transparent', color: 'var(--eph-danger)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer',
};
const primaryButtonStyle: React.CSSProperties = {
  height: 36, padding: '0 18px', borderRadius: 0, border: 'none',
  fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
  background: 'var(--eph-accent)', color: 'var(--eph-ink)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', cursor: 'pointer',
};

function MetricForm({ initial, onSave, onCancel, saveLabel }: {
  initial?: Partial<MetricCatalogInput>;
  onSave: (input: MetricCatalogInput) => Promise<void>;
  onCancel: () => void;
  saveLabel: string;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [unit, setUnit] = useState(initial?.unit ?? '');
  const [source, setSource] = useState<MetricSource>(initial?.source ?? 'wearable');
  const options = fieldKeyOptions(source);
  const [fieldKey, setFieldKey] = useState(initial?.field_key ?? options?.[0]?.value ?? '');
  const [aggregation, setAggregation] = useState<MetricAggregation>(initial?.aggregation ?? 'latest');
  const [saving, setSaving] = useState(false);

  function handleSourceChange(next: MetricSource) {
    setSource(next);
    const nextOptions = fieldKeyOptions(next);
    setFieldKey(nextOptions ? nextOptions[0].value : '');
  }

  async function handleSubmit() {
    if (!name.trim() || !fieldKey.trim()) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), unit: unit.trim() || null, source, field_key: fieldKey.trim(), aggregation });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ border: '1px dashed var(--eph-line-2)', padding: 14, marginBottom: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <div>
          <label style={labelStyle} htmlFor="mf-name">Nombre</label>
          <input id="mf-name" style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: VO2 max" />
        </div>
        <div>
          <label style={labelStyle} htmlFor="mf-unit">Unidad</label>
          <input id="mf-unit" style={inputStyle} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Ej: ml/kg/min" />
        </div>
        <div>
          <label style={labelStyle} htmlFor="mf-source">Fuente</label>
          <select id="mf-source" style={inputStyle} value={source} onChange={(e) => handleSourceChange(e.target.value as MetricSource)}>
            {METRIC_SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle} htmlFor="mf-field-key">Campo</label>
          {options ? (
            <select id="mf-field-key" style={inputStyle} value={fieldKey} onChange={(e) => setFieldKey(e.target.value)}>
              {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : (
            <input
              id="mf-field-key"
              style={inputStyle}
              value={fieldKey}
              onChange={(e) => setFieldKey(e.target.value)}
              placeholder="Ej: cortisol"
            />
          )}
        </div>
        <div>
          <label style={labelStyle} htmlFor="mf-aggregation">Agregación</label>
          <select id="mf-aggregation" style={inputStyle} value={aggregation} onChange={(e) => setAggregation(e.target.value as MetricAggregation)}>
            {METRIC_AGGREGATIONS.map((a) => <option key={a} value={a}>{AGGREGATION_LABEL[a]}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button type="button" style={primaryButtonStyle} onClick={handleSubmit} disabled={saving || !name.trim() || !fieldKey.trim()}>
          {saveLabel}
        </button>
        <button type="button" style={ghostButtonStyle} onClick={onCancel} disabled={saving}>Cancelar</button>
      </div>
    </div>
  );
}

export function AdminMetricsCatalogPanel() {
  const { data: metrics, mutate, isLoading } = useSWR('metrics-catalog', listMetrics);
  const [drafts, setDrafts] = useState<Record<string, { min: string; max: string }>>({});
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  function draftFor(m: MetricsCatalogEntry) {
    return drafts[m.id] ?? { min: m.referenceRange?.min != null ? String(m.referenceRange.min) : '', max: m.referenceRange?.max != null ? String(m.referenceRange.max) : '' };
  }

  async function handleCreate(input: MetricCatalogInput) {
    try {
      await createMetric(input);
      setCreating(false);
      await mutate();
      showToast('Marcador creado.', 'success');
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  }

  async function handleSaveEdit(metricId: string, input: MetricCatalogInput) {
    try {
      await updateMetric(metricId, input);
      setEditingId(null);
      await mutate();
      showToast('Marcador actualizado.', 'success');
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  }

  async function handleToggleActive(metric: MetricsCatalogEntry) {
    try {
      await updateMetric(metric.id, { active: !metric.active });
      await mutate();
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  }

  async function handleSaveRange(metricId: string) {
    const draft = drafts[metricId];
    try {
      await updateMetric(metricId, {
        reference_range: { min: draft?.min ? Number(draft.min) : null, max: draft?.max ? Number(draft.max) : null },
      });
      showToast('Rango de referencia actualizado.', 'success');
      await mutate();
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  }

  async function handleDelete(metricId: string) {
    try {
      await deleteMetric(metricId);
      await mutate();
      showToast('Marcador eliminado.', 'success');
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  }

  if (isLoading || !metrics) return <div style={cardStyle}><p style={{ color: 'var(--eph-muted)', fontSize: 14, margin: 0 }}>Cargando catálogo de marcadores…</p></div>;

  return (
    <div style={cardStyle}>
      <h3 style={cardTitleStyle}>Catálogo de marcadores</h3>

      {creating ? (
        <MetricForm onSave={handleCreate} onCancel={() => setCreating(false)} saveLabel="Guardar marcador" />
      ) : (
        <button type="button" style={{ ...ghostButtonStyle, marginBottom: 16 }} onClick={() => setCreating(true)}>
          + Agregar marcador
        </button>
      )}

      {metrics.length === 0 ? (
        <EmptyState message="Catálogo de marcadores vacío." />
      ) : (
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
                <th style={thStyle}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => (
                <Fragment key={m.id}>
                  <tr key={m.id} style={{ borderBottom: editingId === m.id ? 'none' : '1px solid var(--eph-line)' }}>
                    <td style={tdStyle}>{m.name}</td>
                    <td style={tdStyle}>{m.unit || '—'}</td>
                    <td style={tdStyle}>{SOURCE_LABEL[m.source]}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          aria-label={`Mínimo de ${m.name}`}
                          style={smallInputStyle}
                          type="number"
                          value={draftFor(m).min}
                          onChange={(e) => setDrafts((prev) => ({ ...prev, [m.id]: { ...draftFor(m), min: e.target.value } }))}
                        />
                        <span style={{ color: 'var(--eph-muted)' }}>–</span>
                        <input
                          aria-label={`Máximo de ${m.name}`}
                          style={smallInputStyle}
                          type="number"
                          value={draftFor(m).max}
                          onChange={(e) => setDrafts((prev) => ({ ...prev, [m.id]: { ...draftFor(m), max: e.target.value } }))}
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
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button type="button" style={ghostButtonStyle} onClick={() => setEditingId(editingId === m.id ? null : m.id)}>Editar</button>
                        <button type="button" style={dangerButtonStyle} onClick={() => handleDelete(m.id)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                  {editingId === m.id && (
                    <tr style={{ borderBottom: '1px solid var(--eph-line)' }}>
                      <td colSpan={7} style={{ padding: '0 0 12px' }}>
                        <MetricForm
                          initial={{ name: m.name, unit: m.unit, source: m.source, field_key: m.fieldKey, aggregation: m.aggregation }}
                          onSave={(input) => handleSaveEdit(m.id, input)}
                          onCancel={() => setEditingId(null)}
                          saveLabel="Guardar cambios"
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
