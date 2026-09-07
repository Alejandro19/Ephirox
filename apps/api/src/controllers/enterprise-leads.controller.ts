import type { Request, Response } from 'express';
import type { EnterpriseLeadInput } from '@latribu/shared-types';
import { createEnterpriseLead } from '../services/enterprise-leads.service.js';

export async function create(req: Request, res: Response) {
  const input = req.body as EnterpriseLeadInput;
  await createEnterpriseLead(input);
  return res.status(201).json({ success: true });
}
