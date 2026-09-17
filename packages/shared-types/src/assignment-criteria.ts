import { z } from 'zod';

// Catálogo de marcadores (spec punto 21.1) — poblado por una migración de
// seed controlada por código (ver apps/api/.../metrics-catalog.service.ts),
// no por el admin: un field_key inventado a mano rompería un criterio en
// silencio. El admin solo activa/desactiva y ajusta reference_range.
export const METRIC_SOURCES = ['wearable', 'lab_panel', 'cognitive_load', 'morning_checkin'] as const;
export const MetricSourceSchema = z.enum(METRIC_SOURCES);
export type MetricSource = z.infer<typeof MetricSourceSchema>;

export const METRIC_AGGREGATIONS = ['latest', 'avg_7d', 'avg_14d'] as const;
export const MetricAggregationSchema = z.enum(METRIC_AGGREGATIONS);
export type MetricAggregation = z.infer<typeof MetricAggregationSchema>;

export const MetricsCatalogUpdateSchema = z.object({
  active: z.boolean().optional(),
  reference_range: z.object({ min: z.number().nullable().optional(), max: z.number().nullable().optional() }).nullable().optional(),
});
export type MetricsCatalogUpdate = z.infer<typeof MetricsCatalogUpdateSchema>;

// Criterios de asignación (spec punto 21.1) — árbol AND/OR de condiciones.
export const ASSIGNMENT_CRITERIA_OPERATORS = ['menor_que', 'mayor_que', 'fuera_de_rango'] as const;
export const AssignmentCriteriaOperatorSchema = z.enum(ASSIGNMENT_CRITERIA_OPERATORS);
export type AssignmentCriteriaOperator = z.infer<typeof AssignmentCriteriaOperatorSchema>;

export const ASSIGNMENT_CRITERIA_STATUSES = ['borrador', 'publicado', 'archivado'] as const;
export const AssignmentCriteriaStatusSchema = z.enum(ASSIGNMENT_CRITERIA_STATUSES);
export type AssignmentCriteriaStatus = z.infer<typeof AssignmentCriteriaStatusSchema>;

const ConditionLeafSchema = z.object({
  metric_id: z.string().uuid(),
  operator: AssignmentCriteriaOperatorSchema,
  value: z.number(),
  // Solo usado por 'fuera_de_rango' — el rango [value, value_max].
  value_max: z.number().optional(),
});
export type ConditionLeaf = z.infer<typeof ConditionLeafSchema>;

export type ConditionNode = ConditionLeaf | { op: 'AND' | 'OR'; rules: ConditionNode[] };

export const ConditionSchema: z.ZodType<ConditionNode> = z.lazy(() =>
  z.union([
    ConditionLeafSchema,
    z.object({
      op: z.enum(['AND', 'OR']),
      rules: z.array(ConditionSchema).min(1),
    }),
  ])
);

export const LABELED_CASE_MODULES_FOR_CRITERIA = ['stress', 'training', 'nutrition', 'rest'] as const;

export const AssignmentCriteriaInputSchema = z.object({
  name: z.string().min(1),
  conditions: ConditionSchema,
  applicable_modules: z.array(z.enum(LABELED_CASE_MODULES_FOR_CRITERIA)).min(1),
  status: AssignmentCriteriaStatusSchema.optional(),
});
export type AssignmentCriteriaInput = z.infer<typeof AssignmentCriteriaInputSchema>;
