import { Router } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { authMiddleware, ownerOrAdmin } from '../middleware/auth.middleware.js';
import * as wellnessIndexController from '../controllers/wellness-index.controller.js';

export const wellnessIndexRouter = Router();

// GET /api/clients/:id/wellness-index — índice de bienestar unificado (home
// + Mi Evolución). Sin requirePermission fijo: el propio servicio filtra por
// módulo permitido (matriz de Roles y Perfiles) y devuelve `data: null`
// cuando no hay ningún componente con datos suficientes.
wellnessIndexRouter.get(
  '/clients/:id/wellness-index',
  authMiddleware, ownerOrAdmin,
  asyncHandler(wellnessIndexController.getWellnessIndex)
);

// GET /api/clients/:id/wellness-index/history?days= — historial + "típico"
// para la gráfica de tendencia de Índice de rendimiento (Evolution, spec 27.2).
wellnessIndexRouter.get(
  '/clients/:id/wellness-index/history',
  authMiddleware, ownerOrAdmin,
  asyncHandler(wellnessIndexController.getWellnessIndexHistory)
);
