import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import multer, { MulterError } from 'multer';
import { StressProtocolInputSchema, StressProtocolResourceInputSchema } from '@latribu/shared-types';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { authMiddleware, adminOnly } from '../middleware/auth.middleware.js';
import * as protocolsController from '../controllers/stress-protocols.controller.js';

// Mismo límite ya usado para audio/video de Stress (stress-techniques.routes.ts).
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

// multer.single() por sí solo manda cualquier error (archivo > 100MB, campo
// equivocado, etc.) al manejador global de errores, que responde siempre el
// mismo "Error interno del servidor." genérico — el admin no se enteraba de
// qué pasó realmente. Este wrapper intercepta esos errores puntuales y
// devuelve un mensaje específico en vez de dejarlos caer al manejador global.
function uploadSingleWithMessage(fieldName: string) {
  const middleware = upload.single(fieldName);
  return (req: Request, res: Response, next: NextFunction) => {
    middleware(req, res, (error: unknown) => {
      if (!error) return next();
      if (error instanceof MulterError && error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, error: 'El archivo supera el límite de 100MB.' });
      }
      return next(error);
    });
  };
}

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
  uploadSingleWithMessage('audio'),
  asyncHandler(protocolsController.uploadResourceAudio)
);

stressProtocolsRouter.post(
  '/admin/stress-protocols/:protocolId/resources/:resourceId/upload-video',
  authMiddleware,
  adminOnly,
  uploadSingleWithMessage('video'),
  asyncHandler(protocolsController.uploadResourceVideo)
);
