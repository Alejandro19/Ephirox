import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../middleware/async-handler.js';
import { authMiddleware, ownerOrAdmin } from '../middleware/auth.middleware.js';
import * as wearableController from '../controllers/wearable.controller.js';

const oauthCallbackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

// Rutas autenticadas, ligadas a un cliente — se montan en /api/clients.
export const wearableRouter = Router();

wearableRouter.get('/:id/wearable/estado', authMiddleware, ownerOrAdmin, asyncHandler(wearableController.getEstado));
wearableRouter.get('/:id/wearable/metricas', authMiddleware, ownerOrAdmin, asyncHandler(wearableController.getMetricas));
wearableRouter.post('/:id/wearable/:dispositivo/sync', authMiddleware, ownerOrAdmin, asyncHandler(wearableController.syncNow));
wearableRouter.delete('/:id/wearable/:dispositivo', authMiddleware, ownerOrAdmin, asyncHandler(wearableController.disconnect));
// Devuelve la URL de autorización del proveedor (JSON, autenticada) en vez de
// redirigir directo — el frontend hace fetch() con el Bearer token y navega
// él mismo. Antes esto vivía en una ruta pública que confiaba en un
// `clienteId` de query string sin verificar sesión: cualquiera podía
// enlazar SU PROPIO wearable a la cuenta de otra persona con solo conocer su
// id (ver session-memory.md, auditoría de seguridad). El id ahora sale de
// `req.params.id`, ya verificado por ownerOrAdmin — nunca de un query param.
wearableRouter.get('/:id/wearable/:dispositivo/connect-url', authMiddleware, ownerOrAdmin, asyncHandler(wearableController.connectUrl));

// Callback de OAuth (redirect-based: el proveedor navega el browser de
// vuelta acá, no puede llevar el header Authorization) — se monta en
// /api/wearable. No necesita autenticarse a sí mismo: el clienteId sale del
// `state` que generamos nosotros en connectUrl arriba, ya autenticado.
export const wearableOAuthRouter = Router();

wearableOAuthRouter.get('/:dispositivo/callback', oauthCallbackLimiter, asyncHandler(wearableController.callback));
