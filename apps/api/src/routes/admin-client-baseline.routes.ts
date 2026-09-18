import { Router } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { authMiddleware, adminOnly } from '../middleware/auth.middleware.js';
import * as baselineController from '../controllers/admin-client-baseline.controller.js';

export const adminClientBaselineRouter = Router();

// Fase 4 (spec 19.1/19.3): clientes activos + wearable más reciente, para
// el panel de baseline y el checklist de "Asignar a clientes activos" del
// formulario de protocolo. `module` queda como query param sin usar todavía
// (todos los clientes activos aplican por ahora) — reservado para cuando
// Workout/Nutrition/Sleep tengan su propio criterio de "activo" relevante.
adminClientBaselineRouter.get(
  '/admin/clients/active-summary',
  authMiddleware,
  adminOnly,
  asyncHandler(baselineController.listActiveClientsWithBaseline)
);
