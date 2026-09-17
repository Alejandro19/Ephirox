import { Router } from 'express';
import multer from 'multer';
import { StressProtocolInputSchema, StressProtocolResourceInputSchema } from '@latribu/shared-types';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { authMiddleware, adminOnly } from '../middleware/auth.middleware.js';
import * as protocolsController from '../controllers/stress-protocols.controller.js';

// Mismo límite ya usado para audio/video de Stress (stress-techniques.routes.ts).
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

export const stressProtocolsRouter = Router();

stressProtocolsRouter.get(
  '/admin/stress-protocols',
  authMiddleware,
  adminOnly,
  asyncHandler(protocolsController.listProtocols)
);

stressProtocolsRouter.post(
  '/admin/stress-protocols',
  authMiddleware,
  adminOnly,
  validateBody(StressProtocolInputSchema),
  asyncHandler(protocolsController.createProtocol)
);

stressProtocolsRouter.get(
  '/admin/stress-protocols/:protocolId',
  authMiddleware,
  adminOnly,
  asyncHandler(protocolsController.getProtocol)
);

stressProtocolsRouter.patch(
  '/admin/stress-protocols/:protocolId',
  authMiddleware,
  adminOnly,
  asyncHandler(protocolsController.updateProtocol)
);

stressProtocolsRouter.delete(
  '/admin/stress-protocols/:protocolId',
  authMiddleware,
  adminOnly,
  asyncHandler(protocolsController.deleteProtocol)
);

stressProtocolsRouter.post(
  '/admin/stress-protocols/:protocolId/resources',
  authMiddleware,
  adminOnly,
  validateBody(StressProtocolResourceInputSchema),
  asyncHandler(protocolsController.createResource)
);

// Nota: igual que stress-techniques PUT (ver ahí), intencionalmente NO
// corre validateBody acá — debe aceptar `audio_url`/`video_url`: null como
// señal de "quitar el archivo adjunto", campos que el schema de creación no
// declara.
stressProtocolsRouter.patch(
  '/admin/stress-protocols/:protocolId/resources/:resourceId',
  authMiddleware,
  adminOnly,
  asyncHandler(protocolsController.updateResource)
);

stressProtocolsRouter.delete(
  '/admin/stress-protocols/:protocolId/resources/:resourceId',
  authMiddleware,
  adminOnly,
  asyncHandler(protocolsController.deleteResource)
);

stressProtocolsRouter.post(
  '/admin/stress-protocols/:protocolId/resources/:resourceId/upload-audio',
  authMiddleware,
  adminOnly,
  upload.single('audio'),
  asyncHandler(protocolsController.uploadResourceAudio)
);

stressProtocolsRouter.post(
  '/admin/stress-protocols/:protocolId/resources/:resourceId/upload-video',
  authMiddleware,
  adminOnly,
  upload.single('video'),
  asyncHandler(protocolsController.uploadResourceVideo)
);
