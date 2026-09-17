import { Router } from 'express';
import { MentorInputSchema } from '@latribu/shared-types';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { authMiddleware, adminOnly } from '../middleware/auth.middleware.js';
import * as mentorsController from '../controllers/mentors.controller.js';

export const mentorsRouter = Router();

mentorsRouter.get('/admin/mentors', authMiddleware, adminOnly, asyncHandler(mentorsController.listMentors));

mentorsRouter.post(
  '/admin/mentors',
  authMiddleware,
  adminOnly,
  validateBody(MentorInputSchema),
  asyncHandler(mentorsController.createMentor)
);

mentorsRouter.patch('/admin/mentors/:mentorId', authMiddleware, adminOnly, asyncHandler(mentorsController.updateMentor));

mentorsRouter.delete('/admin/mentors/:mentorId', authMiddleware, adminOnly, asyncHandler(mentorsController.deleteMentor));
