import { Router } from 'express';
import multer from 'multer';
import { StressTechniqueInputSchema } from '@latribu/shared-types';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { authMiddleware, adminOnly, ownerOrAdmin } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/require-permission.middleware.js';
import { revalidateCache } from '../middleware/cache-control.middleware.js';
import * as techniquesController from '../controllers/stress-techniques.controller.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

export const stressTechniquesRouter = Router();

stressTechniquesRouter.get(
  '/:id/stress-techniques',
  authMiddleware,
  ownerOrAdmin,
  requirePermission('stress'),
  revalidateCache,
  asyncHandler(techniquesController.listTechniques)
);

stressTechniquesRouter.post(
  '/:id/stress-techniques',
  authMiddleware,
  adminOnly,
  validateBody(StressTechniqueInputSchema),
  asyncHandler(techniquesController.createTechnique)
);

// Note: intentionally NOT running validateBody(StressTechniqueInputSchema) here.
// This route must also accept `audio_url: null` (a field the create schema doesn't
// declare) as a signal to clear the stored audio, matching legacy's schema-less
// req.body pass-through for this one route (server.js:1598-1610). Do not add
// validation here without also extending the schema — see task-3-brief.md.
stressTechniquesRouter.put(
  '/:id/stress-techniques/:techId',
  authMiddleware,
  adminOnly,
  asyncHandler(techniquesController.updateTechnique)
);

stressTechniquesRouter.delete(
  '/:id/stress-techniques/:techId',
  authMiddleware,
  adminOnly,
  asyncHandler(techniquesController.deleteTechnique)
);

stressTechniquesRouter.post(
  '/:id/stress-techniques/:techId/upload',
  authMiddleware,
  adminOnly,
  upload.single('video'),
  asyncHandler(techniquesController.uploadVideo)
);

stressTechniquesRouter.post(
  '/:id/stress-techniques/:techId/upload-audio',
  authMiddleware,
  adminOnly,
  upload.single('audio'),
  asyncHandler(techniquesController.uploadAudio)
);
