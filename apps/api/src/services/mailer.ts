import { Resend } from 'resend';

// Envío transaccional sobre HTTPS (443) en vez de SMTP (25/465/587) — Railway
// bloquea la salida por los puertos SMTP clásicos (confirmado en logs de
// producción: ETIMEDOUT tanto en 465 como en 587, mismo error con IPv4
// forzada), así que ningún ajuste de nodemailer podía arreglarlo desde
// adentro. Una API HTTP como Resend usa el mismo puerto que cualquier
// petición web normal, que nunca está bloqueado.

export class EmailNotConfiguredError extends Error {}

let client: Resend | null = null;

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!client) client = new Resend(key);
  return client;
}

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  from?: string;
  cc?: string;
};

// Sin RESEND_API_KEY, en producción NO se envía nada (fail-closed, mismo
// criterio que antes con SMTP); en local/tests se ve el contenido en
// consola para poder seguir el flujo sin credenciales reales.
export async function sendTransactionalEmail(input: SendEmailInput): Promise<void> {
  const resend = getClient();
  const from = input.from || process.env.NOTIFICATION_FROM || 'Ephirox <no-reply@ephirox.com>';

  if (!resend) {
    if (process.env.NODE_ENV === 'production') throw new EmailNotConfiguredError();
    console.log(`mailer: RESEND_API_KEY no configurada; correo para ${input.to} — ${input.subject}`);
    return;
  }

  const { error } = await resend.emails.send({
    from,
    to: input.to,
    ...(input.cc ? { cc: input.cc } : {}),
    subject: input.subject,
    html: input.html,
  });
  if (error) throw new Error(error.message || 'Resend rechazó el envío del correo.');
}
