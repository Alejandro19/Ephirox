import { Router } from 'express';
import multer from 'multer';
import { NutritionPlanUpdateSchema, MealInputSchema } from '@latribu/shared-types';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { authMiddleware, adminOnly, ownerOrAdmin } from '../middleware/auth.middleware.js';
import * as nutritionController from '../controllers/nutrition.controller.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

export const nutritionRouter = Router();

// Deliberately no requirePermission('nutrition') gate here: clients.permissions.nutrition
// defaults to false, and a client with no plan yet must still see the empty state
// (200 with {} / []), not a 403. Unlike exercises' list route, viewing "you don't have a
// plan yet" is not gated — only the writes (PUT/meal endpoints, which are adminOnly) are
// what actually unlock the module going forward.
nutritionRouter.get(
  '/:id/nutrition',
  authMiddleware,
  ownerOrAdmin,
  asyncHandler(nutritionController.getNutrition)
);

nutritionRouter.put(
  '/:id/nutrition',
  authMiddleware,
  adminOnly,
  validateBody(NutritionPlanUpdateSchema),
  asyncHandler(nutritionController.putNutrition)
);

nutritionRouter.post(
  '/:id/nutrition/upload-pdf',
  authMiddleware,
  adminOnly,
  upload.single('pdf'),
  asyncHandler(nutritionController.uploadNutritionPdf)
);

nutritionRouter.post(
  '/:id/meals',
  authMiddleware,
  adminOnly,
  validateBody(MealInputSchema),
  asyncHandler(nutritionController.createMeal)
);

nutritionRouter.put(
  '/:id/meals/:mealId',
  authMiddleware,
  adminOnly,
  validateBody(MealInputSchema),
  asyncHandler(nutritionController.updateMeal)
);

nutritionRouter.delete(
  '/:id/meals/:mealId',
  authMiddleware,
  adminOnly,
  asyncHandler(nutritionController.deleteMeal)
);
