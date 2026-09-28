import { desc, eq } from 'drizzle-orm';
import { computeExecutiveResult, programFor, type EnterpriseLeadInput, type EnterpriseLeadEstadoUpdate } from '@latribu/shared-types';
import { db } from '../db/index.js';
import { enterpriseLeads, adminNotifications, type EnterpriseLeadRow } from '../models/schema.js';
import { renderEmailHtml } from './email-template.js';
import { sendTransactionalEmail } from './mailer.js';

export async function createEnterpriseLead(input: EnterpriseLeadInput): Promise<EnterpriseLeadRow> {
  const { evaluacion, ...contacto } = input;
  // score/segmento/programa se recalculan acá desde las respuestas — el
  // cliente nunca los manda, así que no se pueden falsear.
  let extras: Partial<typeof enterpriseLeads.$inferInsert> = {};
  if (evaluacion) {
    const result = computeExecutiveResult(evaluacion.respuestas);
    extras = {
      score: result.score,
      segmento: result.segmento,
      programa: programFor(result.segmento, evaluacion.evaluarEquipo),
      evaluacion: {
        categorias: result.categorias,
        fortaleza: result.fortaleza,
        riesgo: result.riesgo,
        personas: evaluacion.personas,
        equipoDirectivo: evaluacion.equipoDirectivo,
        evaluarEquipo: evaluacion.evaluarEquipo,
        respuestas: evaluacion.respuestas,
      },
    };
  }
  const [row] = await db.insert(enterpriseLeads).values({ ...contacto, ...extras }).returning();
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
    message: `Nueva solicitud de demo: ${lead.nombre}${contexto}${lead.score != null ? ` — Score ${lead.score}/100 (${lead.programa})` : ''}`,
  });
}

// Por HTTP (Resend), no SMTP — Railway bloquea la salida por los puertos
// SMTP clásicos (confirmado en logs de producción con la verificación de
// leads: ETIMEDOUT en 465 y 587 por igual). Sin RESEND_API_KEY, sendTransactionalEmail
// ya se encarga de no-opear en dev/test y de fallar cerrado en producción —
// pero acá el lead ya quedó guardado en la base aunque el correo no salga,
// así que se atrapa el error para no tumbar la creación del lead por eso.
async function notifyEnterpriseLead(lead: EnterpriseLeadRow): Promise<void> {
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
${lead.score != null ? `<p style="margin:0 0 6px;"><strong>Executive Performance Score:</strong> ${lead.score}/100 (${lead.segmento ?? '—'}) — programa: ${lead.programa ?? '—'}</p>` : ''}
${lead.quien ? `<p style="margin:0;"><strong>Quién más debería estar:</strong> ${lead.quien}</p>` : ''}`,
  });

  try {
    await sendTransactionalEmail({ to: NOTIFY_TO, cc: NOTIFY_CC, subject, html });
  } catch (e) {
    console.error('notifyEnterpriseLead error', e);
  }
}
