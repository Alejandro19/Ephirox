import nodemailer from 'nodemailer';
import { desc, eq } from 'drizzle-orm';
import type { EnterpriseLeadInput, EnterpriseLeadEstadoUpdate } from '@latribu/shared-types';
import { db } from '../db/index.js';
import { enterpriseLeads, adminNotifications, type EnterpriseLeadRow } from '../models/schema.js';
import { renderEmailHtml } from './email-template.js';

export async function createEnterpriseLead(input: EnterpriseLeadInput): Promise<EnterpriseLeadRow> {
  const [row] = await db.insert(enterpriseLeads).values(input).returning();
  await Promise.all([notifyEnterpriseLead(row), createAdminAlert(row)]);
  return row;
}

// Submódulo admin "Leads por contactar".
export async function listEnterpriseLeads(): Promise<EnterpriseLeadRow[]> {
  return db.select().from(enterpriseLeads).orderBy(desc(enterpriseLeads.createdAt));
}

export async function updateEnterpriseLeadEstado(
  id: string,
  estado: EnterpriseLeadEstadoUpdate['estado']
): Promise<EnterpriseLeadRow | undefined> {
  const [row] = await db
    .update(enterpriseLeads)
    .set({ estado })
    .where(eq(enterpriseLeads.id, id))
    .returning();
  return row;
}

// Alarma dentro del panel admin (campana de NotificationBell.tsx) — sin
// client_id, este lead no es un cliente del gimnasio (ver el ALTER que
// volvió nullable esa columna, apps/api/drizzle/manual-migrations/
// 2026-09-06-admin-notifications-nullable-client.sql).
async function createAdminAlert(lead: EnterpriseLeadRow): Promise<void> {
  // Punto 12.1: el formulario vuelve a pedir empresa/cargo (revelado
  // progresivo, Paso 2) — casi siempre vienen con dato para leads nuevos.
  const contexto = lead.empresa ? ` — ${lead.empresa}${lead.rol ? ` (${lead.rol})` : ''}` : '';
  await db.insert(adminNotifications).values({
    type: 'enterprise_lead',
    message: `Nueva solicitud de demo: ${lead.nombre}${contexto}`,
  });
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
  const NOTIFY_CC = process.env.ENTERPRISE_LEADS_NOTIFY_CC || 'g619alejandro@gmail.com';

  const subject = `Nueva solicitud de demo: ${lead.nombre}`;
  const html = renderEmailHtml({
    preheader: `${lead.nombre} quiere agendar una demo de Ephirox.`,
    // Punto 12.1: Empresa/Cargo/Tamaño de cohorte vuelven a pedirse (Paso 2,
    // revelado progresivo) — Sede/país y sitio web son campos nuevos. Todo
    // se muestra solo si viene (leads viejos, o si se abandonó a mitad).
    bodyHtml: `<p style="margin:0 0 6px;"><strong>Nombre:</strong> ${lead.nombre}</p>
<p style="margin:0 0 6px;"><strong>Correo:</strong> ${lead.correo}</p>
<p style="margin:0 0 6px;"><strong>WhatsApp:</strong> ${lead.celular}</p>
${lead.empresa ? `<p style="margin:0 0 6px;"><strong>Empresa:</strong> ${lead.empresa}</p>` : ''}
${lead.rol ? `<p style="margin:0 0 6px;"><strong>Cargo:</strong> ${lead.rol}</p>` : ''}
${lead.tamano ? `<p style="margin:0 0 6px;"><strong>Tamaño de cohorte:</strong> ${lead.tamano}</p>` : ''}
${lead.pais ? `<p style="margin:0 0 6px;"><strong>Sede / país:</strong> ${lead.pais}</p>` : ''}
${lead.sitioWeb ? `<p style="margin:0 0 6px;"><strong>Sitio web:</strong> ${lead.sitioWeb}</p>` : ''}
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
    await transporter.sendMail({ from: EMAIL_FROM, to: NOTIFY_TO, cc: NOTIFY_CC, subject, html });
  } catch (e) {
    console.error('notifyEnterpriseLead error', e);
  }
}
