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

trainingRouter.post(
  '/:id/training/confirm-session',
  authMiddleware,
  ownerOrAdmin,
  requirePermission('training'),
  validateBody(ConfirmSessionInputSchema),
  asyncHandler(trainingController.confirmSession)
);
