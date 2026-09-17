import type { Request, Response } from 'express';
import type { LabeledCaseInput, LabeledCaseUpdate, LabeledCaseCheckpointUpdate } from '@latribu/shared-types';
import * as casesService from '../services/labeled-cases.service.js';

function ok(res: Response, data: Record<string, unknown>, status = 200) {
  return res.status(status).json({ success: true, ...data });
}
function err(res: Response, message: string, status = 400) {
  return res.status(status).json({ success: false, error: message });
}

export async function listActiveCases(req: Request, res: Response) {
  const module = typeof req.query.module === 'string' ? req.query.module : 'stress';
  const cases = await casesService.listActiveCasesForModule(module);
  return ok(res, { cases });
}

export async function createCase(req: Request, res: Response) {
  const labeledCase = await casesService.createCase(req.params.id, req.body as LabeledCaseInput, req.user!.id);
  return ok(res, { case: labeledCase }, 201);
}

export async function updateCase(req: Request, res: Response) {
  const labeledCase = await casesService.updateCase(req.params.caseId, req.body as LabeledCaseUpdate);
  if (!labeledCase) return err(res, 'Caso no encontrado.', 404);
  return ok(res, { case: labeledCase });
}

export async function updateCheckpoint(req: Request, res: Response) {
  const weekNumber = Number(req.params.weekNumber);
  const checkpoint = await casesService.updateCheckpoint(req.params.caseId, weekNumber, req.body as LabeledCaseCheckpointUpdate);
  if (!checkpoint) return err(res, 'Checkpoint no encontrado.', 404);
  return ok(res, { checkpoint });
}

export async function getActiveCaseForClient(req: Request, res: Response) {
  const module = typeof req.query.module === 'string' ? req.query.module : 'stress';
  const view = await casesService.getActiveCaseForClient(req.params.id, module);
  return ok(res, { activeCase: view });
}
