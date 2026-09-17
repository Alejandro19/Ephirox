import type { Request, Response } from 'express';
import type { StressProtocolInput, StressProtocolResourceInput } from '@latribu/shared-types';
import * as protocolsService from '../services/stress-protocols.service.js';

function ok(res: Response, data: Record<string, unknown>, status = 200) {
  return res.status(status).json({ success: true, ...data });
}
function err(res: Response, message: string, status = 400) {
  return res.status(status).json({ success: false, error: message });
}

export async function listProtocols(req: Request, res: Response) {
  const protocols = await protocolsService.listAllProtocols();
  return ok(res, { protocols });
}

export async function getProtocol(req: Request, res: Response) {
  const protocol = await protocolsService.findProtocolById(req.params.protocolId);
  if (!protocol) return err(res, 'Protocolo no encontrado.', 404);
  const resources = await protocolsService.listResourcesForProtocol(req.params.protocolId);
  return ok(res, { protocol, resources });
}

export async function createProtocol(req: Request, res: Response) {
  const protocol = await protocolsService.createProtocol(req.body as StressProtocolInput, req.user!.id);
  return ok(res, { protocol }, 201);
}

export async function updateProtocol(req: Request, res: Response) {
  const protocol = await protocolsService.updateProtocol(req.params.protocolId, req.body as Partial<StressProtocolInput>);
  if (!protocol) return err(res, 'Protocolo no encontrado.', 404);
  return ok(res, { protocol });
}

export async function deleteProtocol(req: Request, res: Response) {
  await protocolsService.deleteProtocol(req.params.protocolId);
  return ok(res, { message: 'Protocolo eliminado.' });
}

export async function createResource(req: Request, res: Response) {
  const resource = await protocolsService.createResource(req.params.protocolId, req.body as StressProtocolResourceInput);
  return ok(res, { resource }, 201);
}

export async function updateResource(req: Request, res: Response) {
  const resource = await protocolsService.updateResource(
    req.params.resourceId,
    req.body as Partial<StressProtocolResourceInput> & { audio_url?: null; video_url?: null }
  );
  if (!resource) return err(res, 'Recurso no encontrado.', 404);
  return ok(res, { resource });
}

export async function deleteResource(req: Request, res: Response) {
  await protocolsService.deleteResource(req.params.resourceId);
  return ok(res, { message: 'Recurso eliminado.' });
}

export async function uploadResourceAudio(req: Request, res: Response) {
  if (!req.file) return err(res, 'No se recibió ningún audio.');
  const resource = await protocolsService.uploadResourceAudio(req.params.resourceId, req.file);
  if (!resource) return err(res, 'Recurso no encontrado.', 404);
  return ok(res, { resource });
}

export async function uploadResourceVideo(req: Request, res: Response) {
  if (!req.file) return err(res, 'No se recibió ningún video.');
  const resource = await protocolsService.uploadResourceVideo(req.params.resourceId, req.file);
  if (!resource) return err(res, 'Recurso no encontrado.', 404);
  return ok(res, { resource });
}
