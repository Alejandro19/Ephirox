import type { ConditionNode, ConditionLeaf } from '@latribu/shared-types';

// Lógica pura del árbol AND/OR de "Criterios de asignación" (spec punto
// 21.1) — separada de la resolución de datos (assignment-criteria.service.ts)
// para poder testearla sin DB. `values` ya trae el valor resuelto de cada
// métrica (por metricId) — null si no hay dato disponible para ese cliente.
function isLeaf(node: ConditionNode): node is ConditionLeaf {
  return 'metric_id' in node;
}

function evaluateLeaf(leaf: ConditionLeaf, values: Record<string, number | null>): boolean {
  const value = values[leaf.metric_id];
  // Sin dato disponible: la condición no se puede confirmar, nunca se
  // asume "cumple" por defecto — mismo criterio de robustez que el resto
  // del repo (ver computeAndStoreCognitiveLoadForDate: nunca rellena con 0).
  if (value == null) return false;
  switch (leaf.operator) {
    case 'menor_que':
      return value < leaf.value;
    case 'mayor_que':
      return value > leaf.value;
    case 'fuera_de_rango': {
      const max = leaf.value_max ?? leaf.value;
      return value < leaf.value || value > max;
    }
    default:
      return false;
  }
}

export function evaluateCondition(node: ConditionNode, values: Record<string, number | null>): boolean {
  if (isLeaf(node)) return evaluateLeaf(node, values);
  if (node.op === 'AND') return node.rules.every((r) => evaluateCondition(r, values));
  return node.rules.some((r) => evaluateCondition(r, values));
}
