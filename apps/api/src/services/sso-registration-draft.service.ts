import crypto from 'crypto';
import { and, eq, isNull, gt } from 'drizzle-orm';
import { db } from '../db/index.js';
import { ssoRegistrationDrafts } from '../models/schema.js';

// Borrador de una identidad SSO (Google/Apple) nueva ya verificada contra el
// proveedor, pendiente del paso de aceptación legal — mismo patrón que
// password-reset.service.ts (token opaco, hasheado en reposo, un solo uso,
// TTL corto). Deliberadamente NO es un JWT: un JWT firmado con JWT_SECRET
// pasaría jwt.verify() en auth.middleware.ts y sería aceptado como sesión
// real por cualquier ruta protegida solo con authMiddleware — un token
// opaco verificado únicamente por lookup en esta tabla no tiene ese riesgo.
const DRAFT_TTL_MS = 10 * 60 * 1000; // 10 min

function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export type SsoDraftInput = { provider: 'google' | 'apple'; providerSub: string; email: string; name: string };

export async function createSsoDraft(input: SsoDraftInput): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString('hex');
  await db.insert(ssoRegistrationDrafts).values({
    tokenHash: hashToken(rawToken),
    provider: input.provider,
    providerSub: input.providerSub,
    email: input.email,
    name: input.name,
    expiresAt: new Date(Date.now() + DRAFT_TTL_MS),
  });
  return rawToken;
}

export async function consumeSsoDraft(rawToken: string): Promise<SsoDraftInput | null> {
  const tokenHash = hashToken(rawToken);
  const rows = await db
    .select()
    .from(ssoRegistrationDrafts)
    .where(and(eq(ssoRegistrationDrafts.tokenHash, tokenHash), isNull(ssoRegistrationDrafts.usedAt), gt(ssoRegistrationDrafts.expiresAt, new Date())))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  await db.update(ssoRegistrationDrafts).set({ usedAt: new Date() }).where(eq(ssoRegistrationDrafts.id, row.id));
  return { provider: row.provider as 'google' | 'apple', providerSub: row.providerSub, email: row.email, name: row.name };
}
