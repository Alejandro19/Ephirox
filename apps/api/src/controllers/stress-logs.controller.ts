import type { Request, Response } from 'express';
import type { StressCompletionInput } from '@latribu/shared-types';
import * as logsService from '../services/stress-logs.service.js';

function ok(res: Response, data: Record<string, unknown>, status = 200) {
  return res.status(status).json({ success: true, ...data });
}

export async function listCompletions(req: Request, res: Response) {
  const completions = await logsService.listCompletions(req.params.id);
  return ok(res, { completions });
}

export async function markCompletion(req: Request, res: Response) {
  const { completion, created } = await logsService.markCompletion(req.params.id, req.body as StressCompletionInput);
  return ok(res, { completion }, created ? 201 : 200);
}
