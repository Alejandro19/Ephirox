import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { stressProtocols } from '../models/schema.js';
import type { AssignmentCriteriaInput } from '@latribu/shared-types';
import * as criteriaService from '../services/assignment-criteria.service.js';

function ok(res: Response, data: Record<string, unknown>, status = 200) {
  return res.status(status).json({ success: true, ...data });
}
function err(res: Response, message: string, status = 400) {
  return res.status(status).json({ success: false, error: message });
}

export async function listCriteria(req: Request, res: Response) {
  const criteria = await criteriaService.listCriteria();
  return ok(res, { criteria });
}

export async function createCriteria(req: Request, res: Response) {
  const criteria = await criteriaService.createCriteria(req.body as AssignmentCriteriaInput, req.user!.id);
  return ok(res, { criteria }, 201);
}

export async function updateCriteria(req: Request, res: Response) {
  const criteria = await criteriaService.updateDraftCriteria(req.params.criteriaId, req.body as Partial<AssignmentCriteriaInput>);
  if (!criteria) return err(res, 'Criterio no encontrado, o ya está publicado (edítalo con /publish para crear una nueva versión).', 404);
  return ok(res, { criteria });
}

export async function publishCriteria(req: Request, res: Response) {
  const criteria = await criteriaService.publishCriteria(req.params.criteriaId, req.body as Partial<AssignmentCriteriaInput> | undefined);
  if (!criteria) return err(res, 'Criterio no encontrado.', 404);
  return ok(res, { criteria });
}

export async function deleteCriteria(req: Request, res: Response) {
  const usedBy = await db.select({ id: stressProtocols.id }).from(stressProtocols).where(eq(stressProtocols.criteriaId, req.params.criteriaId));
  if (usedBy.length > 0) return err(res, `No se puede eliminar: ${usedBy.length} protocolo(s) lo están usando.`, 409);
  await criteriaService.deleteCriteria(req.params.criteriaId);
  return ok(res, { message: 'Criterio eliminado.' });
}

export async function evaluateCriteria(req: Request, res: Response) {
  const clientId = req.body?.client_id;
  if (!clientId) return err(res, 'client_id es requerido.');
  const result = await criteriaService.evaluateCriteriaForClient(req.params.criteriaId, clientId);
  if (!result) return err(res, 'Criterio no encontrado.', 404);
  return ok(res, result);
}

export async function matchingClients(req: Request, res: Response) {
  const clients = await criteriaService.findMatchingClients(req.params.criteriaId);
  return ok(res, { clients });
}
