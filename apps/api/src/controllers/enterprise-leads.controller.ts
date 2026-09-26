import type { Request, Response } from 'express';
import { eq, and, gte } from 'drizzle-orm';
import type { EnterpriseLeadInput, EnterpriseLeadEstadoUpdate } from '@latribu/shared-types';
import { db } from '../db/index.js';
import { enterpriseLeads } from '../models/schema.js';
import {
  LeadEmailNotConfiguredError,
  isLeadCodeValid,
  isLeadTokenValid,
  issueLeadToken,
  sendLeadVerificationCode,
} from '../services/lead-verification.service.js';
import {
  createEnterpriseLead,
  listEnterpriseLeads,
  updateEnterpriseLeadEstado,
} from '../services/enterprise-leads.service.js';

// Un mismo correo no crea dos leads en 24 h (doble clic, reenvíos, spam).
const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function create(req: Request, res: Response) {
  const { hp, verificationToken, ...input } = req.body as EnterpriseLeadInput;

  // Honeypot: un bot llenó el campo oculto. Se responde "ok" sin guardar nada,
  // para que no sepa que fue descartado.
  if (hp) return res.status(201).json({ success: true });

  // El correo debe estar verificado (código enviado a ese mismo correo).
  if (!isLeadTokenValid(input.correo, verificationToken)) {
    return res.status(400).json({ success: false, error: 'Verifica tu correo para continuar.' });
  }

  const since = new Date(Date.now() - DUPLICATE_WINDOW_MS);
  const [existing] = await db
    .select({ id: enterpriseLeads.id })
    .from(enterpriseLeads)
    .where(and(eq(enterpriseLeads.correo, input.correo.trim().toLowerCase()), gte(enterpriseLeads.createdAt, since)))
    .limit(1);
  if (existing) return res.status(201).json({ success: true });

  await createEnterpriseLead({ ...input, correo: input.correo.trim().toLowerCase() });
  return res.status(201).json({ success: true });
}

export async function startVerification(req: Request, res: Response) {
  try {
    await sendLeadVerificationCode((req.body as { correo: string }).correo);
    return res.status(200).json({ success: true });
  } catch (e) {
    if (e instanceof LeadEmailNotConfiguredError) {
      return res.status(503).json({ success: false, error: 'No pudimos enviar el código en este momento. Intenta más tarde.' });
    }
    throw e;
  }
}

export async function confirmVerification(req: Request, res: Response) {
  const { correo, code } = req.body as { correo: string; code: string };
  if (!isLeadCodeValid(correo, code)) {
    return res.status(400).json({ success: false, error: 'El código no es correcto o ya venció.' });
  }
  return res.status(200).json({ success: true, token: issueLeadToken(correo) });
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
