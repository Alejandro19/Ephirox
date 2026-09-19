import { z } from 'zod';

// Catálogo de marcadores (spec punto 21.1) — se sembró originalmente por
// código (ver apps/api/.../metrics-catalog.service.ts::SEED_METRICS) con
// field_key verificados a mano contra el schema Drizzle real, pero el admin
// puede crear/editar/eliminar marcadores propios desde acá (pedido
// explícito). Para wearable/cognitive_load el field_key sale de un select
// cerrado en el form (AdminMetricsCatalogPanel), no de texto libre, así se
// mantiene la mitigación original al riesgo de typo — lab_panel/
// morning_checkin sí son texto libre porque leen de datos JSON sin columnas
// fijas que enumerar.
export const METRIC_SOURCES = ['wearable', 'lab_panel', 'cognitive_load', 'morning_checkin'] as const;
export const MetricSourceSchema = z.enum(METRIC_SOURCES);
export type MetricSource = z.infer<typeof MetricSourceSchema>;

export const METRIC_AGGREGATIONS = ['latest', 'avg_7d', 'avg_14d'] as const;
export const MetricAggregationSchema = z.enum(METRIC_AGGREGATIONS);
export type MetricAggregation = z.infer<typeof MetricAggregationSchema>;

export const MetricsCatalogInputSchema = z.object({
  name: z.string().min(1),
  unit: z.string().nullable().optional(),
  source: MetricSourceSchema,
  field_key: z.string().min(1),
  aggregation: MetricAggregationSchema.optional(),
  reference_range: z.object({ min: z.number().nullable().optional(), max: z.number().nullable().optional() }).nullable().optional(),
});
export type MetricsCatalogInput = z.infer<typeof MetricsCatalogInputSchema>;

export const MetricsCatalogUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  unit: z.string().nullable().optional(),
  field_key: z.string().min(1).optional(),
  aggregation: MetricAggregationSchema.optional(),
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
