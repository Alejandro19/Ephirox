import { Router } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { authMiddleware, adminOnly } from '../middleware/auth.middleware.js';
import * as restToolsController from '../controllers/rest-tools.controller.js';

export const restToolsRouter = Router();

restToolsRouter.get('/rest-tools', authMiddleware, asyncHandler(restToolsController.listActiveForClient));
restToolsRouter.get('/admin/rest-tools', authMiddleware, adminOnly, asyncHandler(restToolsController.listAllForAdmin));
restToolsRouter.post('/admin/rest-tools', authMiddleware, adminOnly, asyncHandler(restToolsController.createTool));
restToolsRouter.put('/admin/rest-tools/:id', authMiddleware, adminOnly, asyncHandler(restToolsController.updateTool));
restToolsRouter.delete('/admin/rest-tools/:id', authMiddleware, adminOnly, asyncHandler(restToolsController.deleteTool));
