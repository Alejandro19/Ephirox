import type { Request, Response } from 'express';
import type { MentorInput } from '@latribu/shared-types';
import * as mentorsService from '../services/mentors.service.js';

function ok(res: Response, data: Record<string, unknown>, status = 200) {
  return res.status(status).json({ success: true, ...data });
}
function err(res: Response, message: string, status = 400) {
  return res.status(status).json({ success: false, error: message });
}

export async function listMentors(req: Request, res: Response) {
  const mentors = await mentorsService.listMentors();
  return ok(res, { mentors });
}

export async function createMentor(req: Request, res: Response) {
  const mentor = await mentorsService.createMentor(req.body as MentorInput);
  return ok(res, { mentor }, 201);
}

export async function updateMentor(req: Request, res: Response) {
  const mentor = await mentorsService.updateMentor(req.params.mentorId, req.body as Partial<MentorInput>);
  if (!mentor) return err(res, 'Mentor no encontrado.', 404);
  return ok(res, { mentor });
}

export async function deleteMentor(req: Request, res: Response) {
  await mentorsService.deleteMentor(req.params.mentorId);
  return ok(res, { message: 'Mentor eliminado.' });
}
