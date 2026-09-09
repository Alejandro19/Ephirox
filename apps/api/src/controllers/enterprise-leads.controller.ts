import type { Request, Response } from 'express';
import type { EnterpriseLeadInput, EnterpriseLeadEstadoUpdate } from '@latribu/shared-types';
import {
  createEnterpriseLead,
  listEnterpriseLeads,
  updateEnterpriseLeadEstado,
} from '../services/enterprise-leads.service.js';

export async function create(req: Request, res: Response) {
  const input = req.body as EnterpriseLeadInput;
  await createEnterpriseLead(input);
  return res.status(201).json({ success: true });
}

export async function list(_req: Request, res: Response) {
  const leads = await listEnterpriseLeads();
  return res.status(200).json({ success: true, leads });
}

export async function updateEstado(req: Request, res: Response) {
  const { estado } = req.body as EnterpriseLeadEstadoUpdate;
  const lead = await updateEnterpriseLeadEstado(req.params.id, estado);
  if (!lead) {
    return res.status(404).json({ success: false, error: 'Lead no encontrado.' });
  }
  return res.status(200).json({ success: true, lead });
}
