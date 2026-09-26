import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { EnterpriseLeadInputSchema, EnterpriseLeadEstadoUpdateSchema, LeadVerificationStartSchema, LeadVerificationConfirmSchema } from '@latribu/shared-types';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { authMiddleware, adminOnly } from '../middleware/auth.middleware.js';
import * as enterpriseLeadsController from '../controllers/enterprise-leads.controller.js';

// Endpoint público (sin auth) expuesto a internet desde la landing de
// marketing — mismo criterio de rate-limit que loginLimiter en auth.routes.ts.
const leadsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.' },
  // Los tests hacen decenas de peticiones desde la misma IP; el límite real
  // se prueba aparte con RATE_LIMIT_TEST=1.
  skip: () => process.env.NODE_ENV === 'test' && process.env.RATE_LIMIT_TEST !== '1',
});

// El envío del código cuesta un correo real: límite más estricto por IP.
const verificationSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Demasiados códigos solicitados. Intenta de nuevo en unos minutos.' },
});
const verificationConfirmLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Demasiados intentos. Intenta de nuevo en unos minutos.' },
});

export const enterpriseLeadsRouter = Router();

enterpriseLeadsRouter.post(
  '/enterprise-leads/verification',
  verificationSendLimiter,
  validateBody(LeadVerificationStartSchema),
  asyncHandler(enterpriseLeadsController.startVerification),
);
enterpriseLeadsRouter.post(
  '/enterprise-leads/verification/confirm',
  verificationConfirmLimiter,
  validateBody(LeadVerificationConfirmSchema),
  asyncHandler(enterpriseLeadsController.confirmVerification),
);

enterpriseLeadsRouter.post(
  '/enterprise-leads',
  leadsLimiter,
  validateBody(EnterpriseLeadInputSchema),
  asyncHandler(enterpriseLeadsController.create),
);

// Submódulo admin "Leads por contactar" — panel interno, requiere sesión de admin.
enterpriseLeadsRouter.get(
  '/admin/enterprise-leads',
  authMiddleware,
  adminOnly,
  asyncHandler(enterpriseLeadsController.list),
);
enterpriseLeadsRouter.patch(
  '/admin/enterprise-leads/:id/estado',
  authMiddleware,
  adminOnly,
  validateBody(EnterpriseLeadEstadoUpdateSchema),
  asyncHandler(enterpriseLeadsController.updateEstado),
);
