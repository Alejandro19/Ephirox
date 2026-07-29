import type { Request, Response } from 'express';
import type { ClientCreateInput, ClientUpdateInput } from '@latribu/shared-types';
import * as clientsService from '../services/clients.service.js';

function ok(res: Response, data: Record<string, unknown>, status = 200) {
  return res.status(status).json({ success: true, ...data });
}
function err(res: Response, message: string, status = 400) {
  return res.status(status).json({ success: false, error: message });
}

export async function listClients(_req: Request, res: Response) {
  const clients = await clientsService.listClients();
  return ok(res, { clients });
}

export async function createClient(req: Request, res: Response) {
  const input = req.body as ClientCreateInput;
  try {
    const client = await clientsService.createClient(input);
    return ok(res, { client }, 201);
  } catch (e) {
    if (e instanceof clientsService.ClientEmailTakenError) return err(res, e.message, 409);
    throw e;
  }
}

export async function getClient(req: Request, res: Response) {
  const client = await clientsService.findClientById(req.params.id);
  if (!client) return err(res, 'Cliente no encontrado.', 404);
  return ok(res, { client });
}

export async function updateClient(req: Request, res: Response) {
  const patch = req.body as ClientUpdateInput;
  const client = await clientsService.updateClient(req.params.id, patch);
  if (!client) return err(res, 'Cliente no encontrado.', 404);
  return ok(res, { client });
}

export async function deleteClient(req: Request, res: Response) {
  await clientsService.deleteClient(req.params.id);
  return ok(res, { message: 'Cliente eliminado.' });
}
