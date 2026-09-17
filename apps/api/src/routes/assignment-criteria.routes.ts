import { Router } from 'express';
import { AssignmentCriteriaInputSchema, MetricsCatalogUpdateSchema } from '@latribu/shared-types';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { authMiddleware, adminOnly } from '../middleware/auth.middleware.js';
import * as criteriaController from '../controllers/assignment-criteria.controller.js';
import * as metricsController from '../controllers/metrics-catalog.controller.js';

export const assignmentCriteriaRouter = Router();

assignmentCriteriaRouter.get('/admin/metrics-catalog', authMiddleware, adminOnly, asyncHandler(metricsController.listMetrics));

assignmentCriteriaRouter.patch(
  '/admin/metrics-catalog/:metricId',
  authMiddleware,
  adminOnly,
  validateBody(MetricsCatalogUpdateSchema),
  asyncHandler(metricsController.updateMetric)
);

assignmentCriteriaRouter.get('/admin/assignment-criteria', authMiddleware, adminOnly, asyncHandler(criteriaController.listCriteria));

assignmentCriteriaRouter.post(
  '/admin/assignment-criteria',
  authMiddleware,
  adminOnly,
  validateBody(AssignmentCriteriaInputSchema),
  asyncHandler(criteriaController.createCriteria)
);

assignmentCriteriaRouter.patch(
  '/admin/assignment-criteria/:criteriaId',
  authMiddleware,
  adminOnly,
  asyncHandler(criteriaController.updateCriteria)
);

assignmentCriteriaRouter.post(
  '/admin/assignment-criteria/:criteriaId/publish',
  authMiddleware,
  adminOnly,
  asyncHandler(criteriaController.publishCriteria)
);

assignmentCriteriaRouter.delete(
  '/admin/assignment-criteria/:criteriaId',
  authMiddleware,
  adminOnly,
  asyncHandler(criteriaController.deleteCriteria)
);

assignmentCriteriaRouter.post(
  '/admin/assignment-criteria/:criteriaId/evaluate',
  authMiddleware,
  adminOnly,
  asyncHandler(criteriaController.evaluateCriteria)
);

assignmentCriteriaRouter.get(
  '/admin/assignment-criteria/:criteriaId/matching-clients',
  authMiddleware,
  adminOnly,
  asyncHandler(criteriaController.matchingClients)
);
