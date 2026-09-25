import { Router, type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import { ExerciseInputSchema, ExerciseOrderPatchSchema, EXERCISE_VIDEO_MAX_BYTES } from '@latribu/shared-types';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { authMiddleware, adminOnly, ownerOrAdmin } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/require-permission.middleware.js';
import { revalidateCache } from '../middleware/cache-control.middleware.js';
import * as exercisesController from '../controllers/exercises.controller.js';

export const exercisesRouter = Router();

// Límite duro en multer (memoria) = mismo máximo que la regla del formulario;
// el error de tamaño se traduce a un 413 con mensaje claro en vez del
// "Error interno del servidor" genérico.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: EXERCISE_VIDEO_MAX_BYTES } });
function singleVideo(req: Request, res: Response, next: NextFunction) {
  upload.single('video')(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ success: false, error: 'El video supera el máximo de 30 MB.' });
    }
    if (error) return next(error);
    next();
  });
}

exercisesRouter.get(
  '/:id/exercises',
  authMiddleware,
  ownerOrAdmin,
  requirePermission('training'),
  revalidateCache,
  asyncHandler(exercisesController.listExercises)
);

exercisesRouter.post(
  '/:id/exercises',
  authMiddleware,
  adminOnly,
  validateBody(ExerciseInputSchema),
  asyncHandler(exercisesController.createExercise)
);

exercisesRouter.put(
  '/:id/exercises/:exerciseId',
  authMiddleware,
  adminOnly,
  validateBody(ExerciseInputSchema),
  asyncHandler(exercisesController.updateExercise)
);

exercisesRouter.delete(
  '/:id/exercises/:exerciseId',
  authMiddleware,
  adminOnly,
  asyncHandler(exercisesController.deleteExercise)
);

exercisesRouter.patch(
  '/:id/exercises/:exerciseId/order',
  authMiddleware,
  adminOnly,
  validateBody(ExerciseOrderPatchSchema),
  asyncHandler(exercisesController.reorderExercise)
);

exercisesRouter.post(
  '/:id/exercises/:exerciseId/video',
  authMiddleware,
  adminOnly,
  singleVideo,
  asyncHandler(exercisesController.uploadExerciseVideo)
);

exercisesRouter.delete(
  '/:id/exercises/:exerciseId/video',
  authMiddleware,
  adminOnly,
  asyncHandler(exercisesController.removeExerciseVideo)
);
