import { Router } from 'express';
import { TrainingDaysPatchSchema, ConfirmSessionInputSchema } from '@latribu/shared-types';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { authMiddleware, adminOnly, ownerOrAdmin } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/require-permission.middleware.js';
import * as trainingController from '../controllers/training.controller.js';

export const trainingRouter = Router();

trainingRouter.patch(
  '/:id/training-days',
  authMiddleware,
  adminOnly,
  validateBody(TrainingDaysPatchSchema),
  asyncHandler(trainingController.updateTrainingDays)
);

trainingRouter.get(
  '/:id/training-completions',
  authMiddleware,
  ownerOrAdmin,
  requirePermission('training'),
  asyncHandler(trainingController.listTrainingCompletions)
);

// Nota: sin requirePermission('training') aquí a propósito — a diferencia del
// listado, confirm-session ya tiene su propio gate de negocio más preciso
// (NoTrainingDaysError cuando el cliente no tiene días asignados) y el flag
// de permissions.training por defecto es false hasta que un admin asigna
// días (ver unlockTrainingModule en training.service.ts), así que gatear
// aquí también bloquearía con 403 antes de llegar a ese chequeo específico.
trainingRouter.post(
  '/:id/training/confirm-session',
  authMiddleware,
  ownerOrAdmin,
  validateBody(ConfirmSessionInputSchema),
  asyncHandler(trainingController.confirmSession)
);
