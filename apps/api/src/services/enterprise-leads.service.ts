import nodemailer from 'nodemailer';
import type { EnterpriseLeadInput } from '@latribu/shared-types';
import { db } from '../db/index.js';
import { enterpriseLeads, type EnterpriseLeadRow } from '../models/schema.js';
import { renderEmailHtml } from './email-template.js';

export async function createEnterpriseLead(input: EnterpriseLeadInput): Promise<EnterpriseLeadRow> {
  const [row] = await db.insert(enterpriseLeads).values(input).returning();
  await notifyEnterpriseLead(row);
  return row;
}

// Mismo transporter/no-op que sendPasswordResetEmail (password-reset.service.ts)
// si no hay SMTP real configurado — el lead ya quedó guardado en la base aunque
// el correo no salga.
async function notifyEnterpriseLead(lead: EnterpriseLeadRow): Promise<void> {
  const EMAIL_HOST = process.env.EMAIL_HOST;
  const EMAIL_PORT = process.env.EMAIL_PORT;
  const EMAIL_SECURE = process.env.EMAIL_SECURE === 'true';
  const EMAIL_USER = process.env.EMAIL_USER;
  const EMAIL_PASS = process.env.EMAIL_PASS;
  const EMAIL_FROM = process.env.NOTIFICATION_FROM || 'no-reply@ephirox.com';
  const NOTIFY_TO = process.env.ENTERPRISE_LEADS_NOTIFY_EMAIL || 'contacto@ephirox.com';

  const subject = `Nueva empresa interesada: ${lead.empresa}`;
  const html = renderEmailHtml({
    preheader: `${lead.nombre} (${lead.rol}) en ${lead.empresa} quiere llevar Ephirox a su equipo.`,
    bodyHtml: `<p style="margin:0 0 6px;"><strong>Nombre:</strong> ${lead.nombre}</p>
<p style="margin:0 0 6px;"><strong>Empresa:</strong> ${lead.empresa}</p>
<p style="margin:0 0 6px;"><strong>Rol:</strong> ${lead.rol}</p>
<p style="margin:0 0 6px;"><strong>Equipo a considerar:</strong> ${lead.tamano || 'No especificado'}</p>
${lead.quien ? `<p style="margin:0;"><strong>Quién más debería estar:</strong> ${lead.quien}</p>` : ''}`,
  });

  if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !EMAIL_PASS) {
    console.log('notifyEnterpriseLead: email config no disponible, se omite el envío.', lead);
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: Number(EMAIL_PORT),
      secure: EMAIL_SECURE,
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    });
    await transporter.sendMail({ from: EMAIL_FROM, to: NOTIFY_TO, subject, html });
  } catch (e) {
    console.error('notifyEnterpriseLead error', e);
  }
}
