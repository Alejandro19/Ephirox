import type { Request, Response } from 'express';
import type { MorningCheckinInput } from '@latribu/shared-types';
import * as morningCheckinService from '../services/morning-checkin.service.js';
import * as cognitiveLoadService from '../services/cognitive-load.service.js';

function ok(res: Response, data: Record<string, unknown>) {
  return res.status(200).json({ success: true, ...data });
}

export async function getTodayMorningCheckin(req: Request, res: Response) {
  const tz = typeof req.query.tz === 'string' ? req.query.tz : undefined;
  const checkin = await morningCheckinService.getTodayMorningCheckin(req.params.id, tz);
  return ok(res, { checkin });
}

export async function postMorningCheckin(req: Request, res: Response) {
  const { tz, ...input } = req.body as MorningCheckinInput;
  const checkin = await morningCheckinService.upsertTodayMorningCheckin(req.params.id, input, tz);
  return ok(res, { checkin });
}

export async function getCognitiveLoadOverview(req: Request, res: Response) {
  const overview = await cognitiveLoadService.getCognitiveLoadOverview(req.params.id);
  return ok(res, overview);
}
