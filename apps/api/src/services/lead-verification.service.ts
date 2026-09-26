import { createHmac, timingSafeEqual } from 'node:crypto';
import nodemailer from 'nodemailer';
import { LEAD_CODE_LENGTH } from '@latribu/shared-types';
import { renderEmailHtml } from './email-template.js';

// Verificación del correo de un lead (formularios públicos de la landing):
// se manda un código de 6 dígitos al correo y solo quien lo recibe puede
// enviar el lead. Sin tabla nueva: el código se DERIVA con HMAC (secreto del
// servidor + correo + ventana de 10 min) y se recalcula al verificarlo, así
// que no hay nada que guardar ni limpiar, y no se puede adivinar sin el
// secreto. Válido durante la ventana actual y la anterior (10–20 min).

const WINDOW_MS = 10 * 60 * 1000;
const TOKEN_TTL_MS = 30 * 60 * 1000;

export class LeadEmailNotConfiguredError extends Error {}

function secret(): string {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error('JWT_SECRET no está configurada.');
  return value;
}

function hmac(label: string, payload: string): string {
  return createHmac('sha256', secret()).update(`${label}|${payload}`).digest('hex');
}

const normalize = (correo: string) => correo.trim().toLowerCase();

export function computeLeadCode(correo: string, windowOffset = 0): string {
  const window = Math.floor(Date.now() / WINDOW_MS) - windowOffset;
  const digest = hmac('lead-code', `${normalize(correo)}|${window}`);
  return (parseInt(digest.slice(0, 10), 16) % 10 ** LEAD_CODE_LENGTH).toString().padStart(LEAD_CODE_LENGTH, '0');
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function isLeadCodeValid(correo: string, code: string): boolean {
  return [0, 1].some((offset) => safeEqual(computeLeadCode(correo, offset), code));
}

// Token que prueba "este correo ya se verificó" — lo manda el formulario junto
// con el lead. Atado al correo y con vencimiento.
export function issueLeadToken(correo: string): string {
  const exp = Date.now() + TOKEN_TTL_MS;
  return `${exp}.${hmac('lead-token', `${normalize(correo)}|${exp}`)}`;
}

export function isLeadTokenValid(correo: string, token: string | undefined): boolean {
  if (!token) return false;
  const [expRaw, signature] = token.split('.');
  const exp = Number(expRaw);
  if (!signature || !Number.isFinite(exp) || exp < Date.now()) return false;
  return safeEqual(hmac('lead-token', `${normalize(correo)}|${exp}`), signature);
}

export async function sendLeadVerificationCode(correo: string): Promise<void> {
  const code = computeLeadCode(correo);
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;

  if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !EMAIL_PASS) {
    // En producción sin correo configurado NO se abre la puerta: verificar el
    // correo es justo el control. En local/tests se muestra el código en consola.
    if (process.env.NODE_ENV === 'production') throw new LeadEmailNotConfiguredError();
    console.log(`lead-verification: correo no configurado; código para ${correo}: ${code}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(EMAIL_PORT),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  });
  await transporter.sendMail({
    from: process.env.NOTIFICATION_FROM || 'no-reply@ephirox.com',
    to: correo,
    subject: 'Tu código de verificación de Ephirox',
    html: renderEmailHtml({
      preheader: `Tu código es ${code}`,
      bodyHtml: `<p style="margin:0 0 14px;">Tu código de verificación es:</p>
<p style="margin:0 0 14px;font-size:28px;letter-spacing:6px;"><strong>${code}</strong></p>
<p style="margin:0;">Vence en unos minutos. Si no lo solicitaste, ignora este mensaje.</p>`,
    }),
  });
}
