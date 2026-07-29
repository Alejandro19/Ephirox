import { Router } from 'express';
import { ClientCreateInputSchema, ClientUpdateInputSchema } from '@latribu/shared-types';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { authMiddleware, adminOnly, ownerOrAdmin } from '../middleware/auth.middleware.js';
import * as clientsController from '../controllers/clients.controller.js';

export const clientsRouter = Router();

clientsRouter.get('/', authMiddleware, adminOnly, asyncHandler(clientsController.listClients));
clientsRouter.post('/', authMiddleware, adminOnly, validateBody(ClientCreateInputSchema), asyncHandler(clientsController.createClient));
clientsRouter.get('/:id', authMiddleware, ownerOrAdmin, asyncHandler(clientsController.getClient));
clientsRouter.put('/:id', authMiddleware, ownerOrAdmin, validateBody(ClientUpdateInputSchema), asyncHandler(clientsController.updateClient));
clientsRouter.delete('/:id', authMiddleware, adminOnly, asyncHandler(clientsController.deleteClient));
