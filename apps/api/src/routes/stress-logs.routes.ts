import { Router } from 'express';
import { StressCompletionInputSchema } from '@latribu/shared-types';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { authMiddleware, ownerOrAdmin } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/require-permission.middleware.js';
import * as logsController from '../controllers/stress-logs.controller.js';
import * as tipsController from '../controllers/stress-tips.controller.js';

export const stressLogsRouter = Router();

stressLogsRouter.get(
  '/:id/stress-completions',
  authMiddleware,
  ownerOrAdmin,
  requirePermission('stress'),
  asyncHandler(logsController.listCompletions)
);

stressLogsRouter.post(
  '/:id/stress-completions',
  authMiddleware,
  ownerOrAdmin,
  requirePermission('stress'),
  validateBody(StressCompletionInputSchema),
  asyncHandler(logsController.markCompletion)
);

stressLogsRouter.get(
  '/:id/stress-tip-of-the-day',
  authMiddleware,
  ownerOrAdmin,
  requirePermission('stress'),
  asyncHandler(tipsController.getTipOfTheDay)
);
