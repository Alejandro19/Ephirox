import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { EnterpriseLeadInputSchema } from '@latribu/shared-types';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/async-handler.js';
import * as enterpriseLeadsController from '../controllers/enterprise-leads.controller.js';

// Endpoint público (sin auth) expuesto a internet desde la landing de
// marketing — mismo criterio de rate-limit que loginLimiter en auth.routes.ts.
const leadsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.' },
});

export const enterpriseLeadsRouter = Router();

enterpriseLeadsRouter.post(
  '/enterprise-leads',
  leadsLimiter,
  validateBody(EnterpriseLeadInputSchema),
  asyncHandler(enterpriseLeadsController.create),
);
