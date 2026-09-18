import { Router } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { authMiddleware, ownerOrAdmin } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/require-permission.middleware.js';
import * as regulationCapacityController from '../controllers/regulation-capacity.controller.js';

export const regulationCapacityRouter = Router();

// Fase 7 (spec 21.2). enabled:false mientras REGULATION_CAPACITY_ENABLED_IN_PRODUCTION
// esté apagado (pendiente de calibración clínica) — RegulationCapacityCard.tsx
// (Fase 1) sigue mostrando el placeholder de Carga Cognitiva cuando ve enabled:false.
regulationCapacityRouter.get(
  '/clients/:id/regulation-capacity',
  authMiddleware,
  ownerOrAdmin,
  requirePermission('stress'),
  asyncHandler(regulationCapacityController.getRegulationCapacity)
);
