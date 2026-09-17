'use client';

import { ASSIGNMENT_CRITERIA_OPERATORS, type AssignmentCriteriaOperator } from '@latribu/shared-types';
import type { MetricsCatalogEntry } from '../../../lib/assignment-criteria-client';

export type FlatCondition = { metric_id: string; operator: AssignmentCriteriaOperator; value: number; value_max?: number };
export type RuleBuilderValue = { op: 'AND' | 'OR'; rules: FlatCondition[] };

const OPERATOR_LABEL: Record<AssignmentCriteriaOperator, string> = {
  menor_que: 'menor que',
  mayor_que: 'mayor que',
  fuera_de_rango: 'fuera del rango',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace', fontSize: 10,
  textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 400, color: 'var(--eph-muted)', marginBottom: 6,
};
const fieldStyle: React.CSSProperties = {
  width: '100%', height: 32, borderRadius: 0, border: '1px solid var(--eph-line-2)',
  padding: '0 8px', fontSize: 13, fontWeight: 400, background: 'var(--eph-surface-2)', color: 'var(--eph-text)',
  outline: 'none',
};
const rowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'flex-end', gap: 8, flexWrap: 'wrap', padding: '10px 12px',
  border: '1px solid var(--eph-line)', background: 'var(--eph-surface)', marginTop: 8,
};
const removeButtonStyle: React.CSSProperties = {
  height: 32, width: 32, borderRadius: 0, border: '1px solid var(--eph-line-2)',
  background: 'transparent', color: 'var(--eph-muted)', cursor: 'pointer', flexShrink: 0,
};
const ghostButtonStyle: React.CSSProperties = {
  height: 32, padding: '0 14px', borderRadius: 0, border: '1px solid var(--eph-line-2)',
  fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
  background: 'transparent', color: 'var(--eph-body)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', marginTop: 10,
};
const joinerStyle: React.CSSProperties = {
  height: 26, borderRadius: 999, border: '1px solid var(--eph-accent)', background: 'transparent',
  color: 'var(--eph-accent)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
  padding: '0 12px', cursor: 'pointer',
};

function emptyRule(metrics: MetricsCatalogEntry[]): FlatCondition {
  return { metric_id: metrics[0]?.id ?? '', operator: 'menor_que', value: 0 };
}

// Armador de reglas AND/OR (spec 21.1) — vive en Administración desde el
// principio (Fase 6), no se reubica desde ningún form de módulo. Modelo
// simplificado a propósito: un único operador (Y u O) aplica a TODAS las
// condiciones del criterio, no un árbol anidado — el backend (ConditionNode)
// sí soporta anidar grupos a futuro, pero la UI no lo expone todavía porque
// el spec no lo pide (el mockup de referencia muestra un solo joiner
// compartido, no operadores distintos entre pares).
export function CriteriaRuleBuilder({
  metrics,
  value,
  onChange,
}: {
  metrics: MetricsCatalogEntry[];
  value: RuleBuilderValue;
  onChange: (next: RuleBuilderValue) => void;
}) {
  function updateRule(index: number, patch: Partial<FlatCondition>) {
    const rules = value.rules.map((r, i) => (i === index ? { ...r, ...patch } : r));
    onChange({ ...value, rules });
  }
  function removeRule(index: number) {
    onChange({ ...value, rules: value.rules.filter((_, i) => i !== index) });
  }
  function addRule() {
    onChange({ ...value, rules: [...value.rules, emptyRule(metrics)] });
  }

  return (
    <div>
      {value.rules.map((rule, i) => {
        const metric = metrics.find((m) => m.id === rule.metric_id);
        return (
          <div key={i}>
            {i > 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
                <select
                  aria-label={`Operador lógico ${i}`}
                  style={joinerStyle}
                  value={value.op}
                  onChange={(e) => onChange({ ...value, op: e.target.value as 'AND' | 'OR' })}
                >
                  <option value="AND">Y</option>
                  <option value="OR">O</option>
                </select>
              </div>
            )}
            <div style={rowStyle}>
              <div style={{ flex: '1 1 200px' }}>
                <label style={labelStyle} htmlFor={`rule-metric-${i}`}>Métrica</label>
                <select id={`rule-metric-${i}`} style={fieldStyle} value={rule.metric_id} onChange={(e) => updateRule(i, { metric_id: e.target.value })}>
                  {metrics.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div style={{ flex: '1 1 140px' }}>
                <label style={labelStyle} htmlFor={`rule-operator-${i}`}>Operador</label>
                <select
                  id={`rule-operator-${i}`}
                  style={fieldStyle}
                  value={rule.operator}
                  onChange={(e) => updateRule(i, { operator: e.target.value as AssignmentCriteriaOperator })}
                >
                  {ASSIGNMENT_CRITERIA_OPERATORS.map((op) => <option key={op} value={op}>{OPERATOR_LABEL[op]}</option>)}
                </select>
              </div>
              <div style={{ flex: '0 1 100px' }}>
                <label style={labelStyle} htmlFor={`rule-value-${i}`}>Valor{metric?.unit ? ` (${metric.unit})` : ''}</label>
                <input
                  id={`rule-value-${i}`}
                  type="number"
                  style={fieldStyle}
                  value={rule.value}
                  onChange={(e) => updateRule(i, { value: Number(e.target.value) })}
                />
              </div>
              {rule.operator === 'fuera_de_rango' && (
                <div style={{ flex: '0 1 100px' }}>
                  <label style={labelStyle} htmlFor={`rule-value-max-${i}`}>Hasta</label>
                  <input
                    id={`rule-value-max-${i}`}
                    type="number"
                    style={fieldStyle}
                    value={rule.value_max ?? ''}
                    onChange={(e) => updateRule(i, { value_max: e.target.value ? Number(e.target.value) : undefined })}
                  />
                </div>
              )}
              <span style={{ fontSize: 11, color: 'var(--eph-faint)', flex: '1 1 140px', paddingBottom: 8 }}>
                {metric ? `${metric.source === 'lab_panel' ? 'rango de laboratorio' : metric.source === 'wearable' ? 'escala del wearable' : 'valor calculado'}` : ''}
              </span>
              <button type="button" style={removeButtonStyle} onClick={() => removeRule(i)} aria-label={`Quitar condición ${i + 1}`}>✕</button>
            </div>
          </div>
        );
      })}
      <button type="button" style={ghostButtonStyle} onClick={addRule}>+ Agregar condición</button>
    </div>
  );
}
