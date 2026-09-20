import type { Request, Response } from 'express';
import * as wellnessIndexService from '../services/wellness-index.service.js';

export async function getWellnessIndex(req: Request, res: Response) {
  const data = await wellnessIndexService.computeWellnessIndexForClient(req.params.id);
  return res.status(200).json({ success: true, data });
}

export async function getWellnessIndexHistory(req: Request, res: Response) {
  const days = Number(req.query.days) || 30;
  const data = await wellnessIndexService.getWellnessIndexHistoryForClient(req.params.id, days);
  return res.status(200).json({ success: true, data });
}
