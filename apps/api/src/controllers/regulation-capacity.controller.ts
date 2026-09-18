import type { Request, Response } from 'express';
import * as regulationCapacityService from '../services/regulation-capacity.service.js';

export async function getRegulationCapacity(req: Request, res: Response) {
  const overview = await regulationCapacityService.getRegulationCapacityOverview(req.params.id);
  return res.status(200).json({ success: true, ...overview });
}
