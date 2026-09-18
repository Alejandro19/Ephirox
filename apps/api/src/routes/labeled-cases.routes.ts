import { Router } from 'express';
import { LabeledCaseInputSchema, LabeledCaseUpdateSchema, LabeledCaseCheckpointUpdateSchema } from '@latribu/shared-types';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { authMiddleware, adminOnly, ownerOrAdmin } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/require-permission.middleware.js';
import * as casesController from '../controllers/labeled-cases.controller.js';

export const labeledCasesRouter = Router();

labeledCasesRouter.get('/admin/labeled-cases', authMiddleware, adminOnly, asyncHandler(casesController.listActiveCases));

// "Asignaciones recientes" (spec 19/23.3) — log de los últimos casos
// creados para el módulo, cualquier estado.
labeledCasesRouter.get('/admin/labeled-cases/recent', authMiddleware, adminOnly, asyncHandler(casesController.getRecentCases));

labeledCasesRouter.post(
  '/admin/clients/:id/labeled-cases',
  authMiddleware,
  adminOnly,
  validateBody(LabeledCaseInputSchema),
  asyncHandler(casesController.createCase)
);

labeledCasesRouter.patch(
  '/admin/labeled-cases/:caseId',
  authMiddleware,
  adminOnly,
  validateBody(LabeledCaseUpdateSchema),
  asyncHandler(casesController.updateCase)
);

labeledCasesRouter.patch(
  '/admin/labeled-cases/:caseId/checkpoints/:weekNumber',
  authMiddleware,
  adminOnly,
  validateBody(LabeledCaseCheckpointUpdateSchema),
  asyncHandler(casesController.updateCheckpoint)
);

// Consumida por ClientStressPanel/StressPlanSection (Fase 1) para mostrar el
// mentor y el protocolo activo real — solo module=stress tiene UI en esta
// ronda (ver labeled-cases.service.ts).
labeledCasesRouter.get(
  '/clients/:id/labeled-cases/active',
  authMiddleware,
  ownerOrAdmin,
  requirePermission('stress'),
  asyncHandler(casesController.getActiveCaseForClient)
);

// "Historial de protocolos" (spec 23.3, vista cliente) — casos ya cerrados.
labeledCasesRouter.get(
  '/clients/:id/labeled-cases/closed',
  authMiddleware,
  ownerOrAdmin,
  requirePermission('stress'),
  asyncHandler(casesController.getClosedCasesForClient)
);
