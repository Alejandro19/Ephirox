import type { Request, Response } from 'express';
import * as baselineService from '../services/admin-client-baseline.service.js';

export async function listActiveClientsWithBaseline(req: Request, res: Response) {
  const clients = await baselineService.listActiveClientsWithLatestWearable();
  return res.status(200).json({ success: true, clients });
}
