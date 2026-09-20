import type { Request, Response } from 'express';
import type { EvolutionCheckinInput } from '@latribu/shared-types';
import * as evolutionService from '../services/evolution.service.js';
import * as clientsService from '../services/clients.service.js';
import * as evolutionCohortService from '../services/evolution-cohort.service.js';

function ok(res: Response, data: Record<string, unknown>, status = 200) {
  return res.status(status).json({ success: true, ...data });
}
function err(res: Response, message: string, status = 400) {
  return res.status(status).json({ success: false, error: message });
}

export async function getEvolution(req: Request, res: Response) {
  const data = await evolutionService.getEvolutionData(req.params.id);
  return ok(res, data);
}

// "Reporte de mi equipo" (spec 28) — nunca confiar en que el frontend no
// muestre la pestaña: se re-verifica acá, contra la base de datos, que el
// cliente dueño de :id tiene permissions.reporteEquipo === true antes de
// calcular o devolver cualquier dato agregado de su cohorte.
export async function getCohortReport(req: Request, res: Response) {
  const client = await clientsService.findClientById(req.params.id);
  if (!client) return err(res, 'Cliente no encontrado.', 404);
  const permissions = (client.permissions as Record<string, boolean>) || {};
  if (permissions.reporteEquipo !== true) {
    return err(res, 'No tienes acceso a Reporte de mi equipo.', 403);
  }
  const report = await evolutionCohortService.getCohortReport(req.params.id);
  return ok(res, { report });
}

export async function createCheckin(req: Request, res: Response) {
  const checkin = await evolutionService.createCheckin(req.params.id, req.body as EvolutionCheckinInput);
  return ok(res, { checkin }, 201);
}
