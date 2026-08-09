import crypto from 'crypto';
import { and, eq, isNull, gt } from 'drizzle-orm';
import nodemailer from 'nodemailer';
import { db } from '../db/index.js';
import { passwordResetTokens } from '../models/schema.js';

export type ResetUserType = 'admin' | 'cliente' | 'terapeuta';

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export async function createResetToken(userType: ResetUserType, userId: string): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString('hex');
  await db.insert(passwordResetTokens).values({
    userType,
    userId,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
  });
  return rawToken;
}

export async function consumeResetToken(rawToken: string): Promise<{ userType: ResetUserType; userId: string } | null> {
  const tokenHash = hashToken(rawToken);
  const rows = await db
    .select()
    .from(passwordResetTokens)
    .where(and(eq(passwordResetTokens.tokenHash, tokenHash), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, new Date())))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, row.id));
  return { userType: row.userType as ResetUserType, userId: row.userId };
}

export async function sendPasswordResetEmail(email: string, resetLink: string): Promise<void> {
  const EMAIL_HOST = process.env.EMAIL_HOST;
  const EMAIL_PORT = process.env.EMAIL_PORT;
  const EMAIL_SECURE = process.env.EMAIL_SECURE === 'true';
  const EMAIL_USER = process.env.EMAIL_USER;
  const EMAIL_PASS = process.env.EMAIL_PASS;
  const EMAIL_FROM = process.env.NOTIFICATION_FROM || 'no-reply@latribu.com';

  const subject = 'Recupera tu contraseña — La Tribu';
  const html = `<p>Recibimos una solicitud para restablecer tu contraseña.</p>
<p><a href="${resetLink}">Haz clic aquí para crear una nueva contraseña</a></p>
<p>Este enlace vence en 1 hora. Si no fuiste tú, ignora este correo.</p>`;

  if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !EMAIL_PASS) {
    // Sin config de email (dev local): el link queda visible en logs para poder probar el flujo.
    console.log('sendPasswordResetEmail: email config no disponible, se omite el envío.', { email, resetLink });
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: Number(EMAIL_PORT),
      secure: EMAIL_SECURE,
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    });
    await transporter.sendMail({ from: EMAIL_FROM, to: email, subject, html });
  } catch (e) {
    console.error('sendPasswordResetEmail error', e);
  }
}
