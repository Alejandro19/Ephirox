import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { LoginInputSchema, RegisterInputSchema, ChangePasswordInputSchema } from '@latribu/shared-types';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import * as authController from '../controllers/auth.controller.js';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en unos minutos.' },
});

export const authRouter = Router();

authRouter.post('/login', loginLimiter, validateBody(LoginInputSchema), asyncHandler(authController.login));
authRouter.get('/me', authMiddleware, asyncHandler(authController.me));
authRouter.post('/register', validateBody(RegisterInputSchema), asyncHandler(authController.register));
authRouter.post('/change-password', authMiddleware, validateBody(ChangePasswordInputSchema), asyncHandler(authController.changePassword));
