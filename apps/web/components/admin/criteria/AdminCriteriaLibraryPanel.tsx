'use client';

import { useEffect, useState } from 'react';
import {
  listCriteria,
  createCriteria,
  updateDraftCriteria,
  publishCriteria,
  deleteCriteria,
  listMetrics,
  type AssignmentCriteria,
  type MetricsCatalogEntry,
} from '../../../lib/assignment-criteria-client';
import { LABELED_CASE_MODULES_FOR_CRITERIA, type ConditionNode } from '@latribu/shared-types';
import { CriteriaRuleBuilder, type RuleBuilderValue, type FlatCondition } from './CriteriaRuleBuilder';
import { showToast } from '../../layout/AppShell';
import EmptyState from '../../ui/EmptyState';
import Badge from '../../ui/Badge';

const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace', fontSize: 10,
  textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 400, color: 'var(--eph-muted)', marginBottom: 6,
};
const fieldStyle: React.CSSProperties = {
  width: '100%', height: 34, borderRadius: 0, border: '1px solid var(--eph-line-2)',
  padding: '0 10px', fontSize: 14, background: 'var(--eph-surface-2)', color: 'var(--eph-text)', outline: 'none',
};
const primaryButtonStyle: React.CSSProperties = {
  height: 36, padding: '0 18px', borderRadius: 0, border: 'none',
  fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
  background: 'var(--eph-accent)', color: 'var(--eph-ink)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', cursor: 'pointer',
};
const ghostButtonStyle: React.CSSProperties = {
  height: 32, padding: '0 14px', borderRadius: 0, border: '1px solid var(--eph-line-2)',
  fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
  background: 'transparent', color: 'var(--eph-body)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer',
};
const dangerButtonStyle: React.CSSProperties = {
  height: 32, padding: '0 14px', borderRadius: 0, border: '1px solid var(--eph-danger)',
  fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
  background: 'transparent', color: 'var(--eph-danger)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer',
};

const STATUS_LABEL: Record<string, string> = { borrador: 'Borrador', publicado: 'Publicado', archivado: 'Archivado' };
const STATUS_VARIANT: Record<string, 'success' | 'warn' | 'danger'> = { borrador: 'warn', publicado: 'success', archivado: 'danger' };
const MODULE_LABEL: Record<string, string> = { stress: 'Stress', training: 'Workout', nutrition: 'Nutrition', rest: 'Sleep' };

function toRuleBuilderValue(node: ConditionNode): RuleBuilderValue {
  if ('metric_id' in node) return { op: 'AND', rules: [node] };
  return { op: node.op, rules: node.rules.filter((r): r is FlatCondition => 'metric_id' in r) };
}
function fromRuleBuilderValue(value: RuleBuilderValue): ConditionNode {
  if (value.rules.length === 1) return value.rules[0];
  return { op: value.op, rules: value.rules };
}

function CriteriaForm({
  metrics,
  initialName = '',
  initialModules = [],
  initialConditions = { op: 'AND', rules: [{ metric_id: metrics[0]?.id ?? '', operator: 'menor_que', value: 0 }] },
  onSave,
  onCancel,
  saveLabel,
}: {
  metrics: MetricsCatalogEntry[];
  initialName?: string;
  initialModules?: string[];
  initialConditions?: RuleBuilderValue;
  onSave: (input: { name: string; conditions: ConditionNode; applicable_modules: string[] }) => void;
  onCancel: () => void;
  saveLabel: string;
}) {
  const [name, setName] = useState(initialName);
  const [modules, setModules] = useState<string[]>(initialModules);
  const [rules, setRules] = useState<RuleBuilderValue>(initialConditions);

  function toggleModule(mod: string) {
    setModules((prev) => (prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]));
  }

  return (
    <div style={{ border: '1px dashed var(--eph-line-2)', padding: 16, marginTop: 12 }}>
      <label style={labelStyle} htmlFor="crit-name">Nombre del criterio</label>
      <input id="crit-name" style={fieldStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Recuperación Vagal — criterio estándar" />

      <label style={{ ...labelStyle, marginTop: 14 }}>Módulos donde aplica</label>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {LABELED_CASE_MODULES_FOR_CRITERIA.map((mod) => (
          <label key={mod} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--eph-text)', cursor: 'pointer' }}>
            <input type="checkbox" checked={modules.includes(mod)} onChange={() => toggleModule(mod)} />
            {MODULE_LABEL[mod]}
          </label>
        ))}
      </div>

      <label style={{ ...labelStyle, marginTop: 14 }}>Condiciones</label>
      <CriteriaRuleBuilder metrics={metrics} value={rules} onChange={setRules} />

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button
          type="button"
          style={primaryButtonStyle}
          disabled={!name.trim() || modules.length === 0 || rules.rules.length === 0}
          onClick={() => onSave({ name: name.trim(), conditions: fromRuleBuilderValue(rules), applicable_modules: modules })}
        >
          {saveLabel}
        </button>
        <button type="button" style={ghostButtonStyle} onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

// Módulo compartido "Administración → Criterios y Marcadores" (spec 22) — el
// armador de reglas vive acá desde el principio, no se reubica desde ningún
// form de módulo. Stress (y luego Workout/Nutrition/Sleep) solo seleccionan
// un criterio guardado + link acá — ver Fase 4 del plan.
export function AdminCriteriaLibraryPanel() {
  const [criteria, setCriteria] = useState<AssignmentCriteria[]>([]);
  const [metrics, setMetrics] = useState<MetricsCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function refetch() {
    const [criteriaRows, metricRows] = await Promise.all([listCriteria(), listMetrics()]);
    setCriteria(criteriaRows);
    setMetrics(metricRows.filter((m) => m.active));
  }

  useEffect(() => {
    refetch()
      .catch((e: Error) => showToast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(input: { name: string; conditions: ConditionNode; applicable_modules: string[] }) {
    try {
      await createCriteria(input);
      setCreating(false);
      await refetch();
      showToast('Criterio guardado en borrador.', 'success');
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  }

  async function handleSaveEdit(criterion: AssignmentCriteria, input: { name: string; conditions: ConditionNode; applicable_modules: string[] }) {
    try {
      if (criterion.status === 'publicado') {
        await publishCriteria(criterion.id, input);
        showToast('Se creó una nueva versión publicada — la anterior quedó archivada.', 'success');
      } else {
        await updateDraftCriteria(criterion.id, input);
        showToast('Criterio actualizado.', 'success');
      }
      setEditingId(null);
      await refetch();
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  }

  async function handlePublish(criteriaId: string) {
    try {
      await publishCriteria(criteriaId);
      await refetch();
      showToast('Criterio publicado — ya está disponible para seleccionar en protocolos.', 'success');
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  }

  async function handleDelete(criteriaId: string) {
    try {
      await deleteCriteria(criteriaId);
      await refetch();
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  }

  if (loading) return <p style={{ color: 'var(--eph-muted)', fontSize: 14 }}>Cargando criterios…</p>;

  return (
    <div>
      {criteria.length === 0 ? (
        <EmptyState message="Aún no hay criterios de asignación guardados." />
      ) : (
        criteria.map((c) => (
          <div key={c.id} style={{ borderBottom: '1px solid var(--eph-line)', padding: '14px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <strong style={{ color: 'var(--eph-text)', fontSize: 14 }}>{c.name}</strong>
              <Badge label={STATUS_LABEL[c.status]} variant={STATUS_VARIANT[c.status]} />
              <span style={{ fontSize: 11, color: 'var(--eph-muted)' }}>v{c.version}</span>
              {c.applicableModules.map((m) => <Badge key={m} label={MODULE_LABEL[m] ?? m} variant="success" />)}
            </div>
            {editingId === c.id ? (
              <CriteriaForm
                metrics={metrics}
                initialName={c.name}
                initialModules={c.applicableModules}
                initialConditions={toRuleBuilderValue(c.conditions)}
                onSave={(input) => handleSaveEdit(c, input)}
                onCancel={() => setEditingId(null)}
                saveLabel={c.status === 'publicado' ? 'Guardar como nueva versión' : 'Guardar'}
              />
            ) : (
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button type="button" style={ghostButtonStyle} onClick={() => setEditingId(c.id)}>Editar</button>
                {c.status === 'borrador' && (
                  <button type="button" style={ghostButtonStyle} onClick={() => handlePublish(c.id)}>Publicar</button>
                )}
                <button type="button" style={dangerButtonStyle} onClick={() => handleDelete(c.id)}>Eliminar</button>
              </div>
            )}
          </div>
        ))
      )}

      {creating ? (
        <CriteriaForm metrics={metrics} onSave={handleCreate} onCancel={() => setCreating(false)} saveLabel="Guardar criterio en la librería" />
      ) : (
        <button type="button" style={{ ...ghostButtonStyle, marginTop: 16 }} onClick={() => setCreating(true)} disabled={metrics.length === 0}>
          + Crear nuevo criterio
        </button>
      )}
    </div>
  );
}
