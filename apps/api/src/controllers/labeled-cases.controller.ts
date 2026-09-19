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

export async function getClosedCasesForClient(req: Request, res: Response) {
  const module = typeof req.query.module === 'string' ? req.query.module : 'stress';
  const cases = await casesService.listClosedCasesForClient(req.params.id, module);
  return ok(res, { cases });
}

export async function getRecentCases(req: Request, res: Response) {
  const module = typeof req.query.module === 'string' ? req.query.module : 'stress';
  const cases = await casesService.listRecentCasesForModule(module);
  return ok(res, { cases });
}

export async function listCasesForModule(req: Request, res: Response) {
  const module = typeof req.query.module === 'string' ? req.query.module : 'stress';
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const status = typeof req.query.status === 'string' ? (req.query.status as 'activo' | 'vencido' | 'completado') : undefined;
  const protocolId = typeof req.query.protocolId === 'string' ? req.query.protocolId : undefined;
  const cases = await casesService.listCasesForModule(module, { search, status, protocolId });
  return ok(res, { cases });
}

export async function getCaseDetail(req: Request, res: Response) {
  const detail = await casesService.getCaseDetail(req.params.caseId);
  if (!detail) return err(res, 'Caso no encontrado.', 404);
  return ok(res, { detail });
}

export async function getProtocolEffectiveness(req: Request, res: Response) {
  const effectiveness = await casesService.computeProtocolEffectiveness(req.params.protocolId);
  return ok(res, { effectiveness });
}

export async function exportCasesCsv(req: Request, res: Response) {
  const module = typeof req.query.module === 'string' && req.query.module !== 'all' ? req.query.module : undefined;
  const onlyCompleted = req.query.status !== 'all';
  const csv = await casesService.exportCasesCsv(module, onlyCompleted);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="casos-etiquetados-${module ?? 'todos'}.csv"`);
  return res.status(200).send(csv);
}
