import { describe, it, expect } from 'vitest';
import { evaluateCondition } from '../src/services/criteria-evaluation-engine.js';
import type { ConditionNode } from '@latribu/shared-types';

describe('criteria-evaluation-engine (spec 21.1 — motor de criterios de asignación)', () => {
  it('evaluates a single "menor_que" leaf', () => {
    const node: ConditionNode = { metric_id: 'hrv', operator: 'menor_que', value: 40 };
    expect(evaluateCondition(node, { hrv: 35 })).toBe(true);
    expect(evaluateCondition(node, { hrv: 45 })).toBe(false);
    expect(evaluateCondition(node, { hrv: 40 })).toBe(false); // estrictamente menor, no <=
  });

  it('evaluates a single "mayor_que" leaf', () => {
    const node: ConditionNode = { metric_id: 'cortisol', operator: 'mayor_que', value: 15 };
    expect(evaluateCondition(node, { cortisol: 18 })).toBe(true);
    expect(evaluateCondition(node, { cortisol: 10 })).toBe(false);
  });

  it('evaluates a "fuera_de_rango" leaf against [value, value_max]', () => {
    const node: ConditionNode = { metric_id: 'sleep', operator: 'fuera_de_rango', value: 50, value_max: 70 };
    expect(evaluateCondition(node, { sleep: 40 })).toBe(true); // por debajo
    expect(evaluateCondition(node, { sleep: 80 })).toBe(true); // por encima
    expect(evaluateCondition(node, { sleep: 60 })).toBe(false); // dentro
  });

  it('a leaf with no data available (null) never evaluates to true, regardless of operator', () => {
    expect(evaluateCondition({ metric_id: 'hrv', operator: 'menor_que', value: 40 }, { hrv: null })).toBe(false);
    expect(evaluateCondition({ metric_id: 'hrv', operator: 'menor_que', value: 40 }, {})).toBe(false);
  });

  it('AND requires every rule to be true (mockup example: HRV < 40 Y Cortisol > 15)', () => {
    const node: ConditionNode = {
      op: 'AND',
      rules: [
        { metric_id: 'hrv', operator: 'menor_que', value: 40 },
        { metric_id: 'cortisol', operator: 'mayor_que', value: 15 },
      ],
    };
    expect(evaluateCondition(node, { hrv: 35, cortisol: 18 })).toBe(true);
    expect(evaluateCondition(node, { hrv: 35, cortisol: 10 })).toBe(false);
    expect(evaluateCondition(node, { hrv: 45, cortisol: 18 })).toBe(false);
  });

  it('OR requires at least one rule to be true', () => {
    const node: ConditionNode = {
      op: 'OR',
      rules: [
        { metric_id: 'hrv', operator: 'menor_que', value: 40 },
        { metric_id: 'cortisol', operator: 'mayor_que', value: 15 },
      ],
    };
    expect(evaluateCondition(node, { hrv: 45, cortisol: 18 })).toBe(true);
    expect(evaluateCondition(node, { hrv: 45, cortisol: 10 })).toBe(false);
  });

  it('evaluates nested groups: (A AND B) OR C', () => {
    const node: ConditionNode = {
      op: 'OR',
      rules: [
        {
          op: 'AND',
          rules: [
            { metric_id: 'hrv', operator: 'menor_que', value: 40 },
            { metric_id: 'cortisol', operator: 'mayor_que', value: 15 },
          ],
        },
        { metric_id: 'reuniones', operator: 'mayor_que', value: 25 },
      ],
    };
    // A y B fallan, pero C cumple -> true por el OR externo.
    expect(evaluateCondition(node, { hrv: 45, cortisol: 10, reuniones: 30 })).toBe(true);
    // Nada cumple.
    expect(evaluateCondition(node, { hrv: 45, cortisol: 10, reuniones: 10 })).toBe(false);
    // A y B cumplen (el AND interno pasa), C no hace falta.
    expect(evaluateCondition(node, { hrv: 35, cortisol: 18, reuniones: 10 })).toBe(true);
  });
});
