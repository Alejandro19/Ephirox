import { Router } from 'express';
import { StressTipInputSchema, StressTipUpdateSchema } from '@latribu/shared-types';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { authMiddleware, adminOnly } from '../middleware/auth.middleware.js';
import { revalidateCache } from '../middleware/cache-control.middleware.js';
import * as tipsController from '../controllers/stress-tips.controller.js';

export const adminStressTipsRouter = Router();

adminStressTipsRouter.get('/admin/stress-tips', authMiddleware, adminOnly, revalidateCache, asyncHandler(tipsController.listTips));
adminStressTipsRouter.post(
  '/admin/stress-tips',
  authMiddleware,
  adminOnly,
  validateBody(StressTipInputSchema),
  asyncHandler(tipsController.createTip)
);
adminStressTipsRouter.patch(
  '/admin/stress-tips/:tipId',
  authMiddleware,
  adminOnly,
  validateBody(StressTipUpdateSchema),
  asyncHandler(tipsController.updateTip)
);
adminStressTipsRouter.delete('/admin/stress-tips/:tipId', authMiddleware, adminOnly, asyncHandler(tipsController.deleteTip));
