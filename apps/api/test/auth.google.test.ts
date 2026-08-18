import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../src/app.js';
import { db } from '../src/db/index.js';
import { admins, clients, adminNotifications, legalAcceptances } from '../src/models/schema.js';
import { hashPassword } from '../src/services/auth.service.js';
import { setGoogleVerifierForTests } from '../src/services/google-auth.service.js';

function fakePayload(overrides: Record<string, unknown> = {}) {
  return {
    email: 'google-user@example.com',
    email_verified: true,
    sub: 'google-sub-123',
    name: 'Google User',
    ...overrides,
  };
}

const legalAcceptanceFixture = {
  dataPolicyVersion: 'v0.1-borrador',
  termsVersion: 'v0.1-borrador',
  sensitiveDataConsent: true,
  acceptedAt: new Date().toISOString(),
};

describe('POST /api/auth/google', () => {
  const app = createApp();
  const adminEmail = `google-admin-${Date.now()}@example.com`;
  let adminId: string;

  beforeAll(async () => {
    process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
    const [admin] = await db.insert(admins).values({ name: 'Google Admin', email: adminEmail, passwordHash: await hashPassword('x') }).returning();
    adminId = admin.id;
  });

  afterAll(async () => {
    await db.delete(admins).where(eq(admins.id, adminId));
  });

  beforeEach(() => {
    setGoogleVerifierForTests(null);
  });

  afterEach(async () => {
    // Scoped to the one client this file creates — never delete by `type`
    // alone, since other test files also insert 'new_registration' rows and
    // may run concurrently against the same test database. legal_acceptances
    // no tiene ON DELETE CASCADE a propósito, así que hay que borrarla antes
    // de poder borrar el cliente de prueba.
    const created = await db.select().from(clients).where(eq(clients.email, 'google-user@example.com'));
    if (created[0]) {
      await db.delete(legalAcceptances).where(eq(legalAcceptances.clientId, created[0].id));
      await db.delete(adminNotifications).where(eq(adminNotifications.clientId, created[0].id));
      await db.delete(clients).where(eq(clients.id, created[0].id));
    }
  });

  it('rejects an unverified Google token', async () => {
    setGoogleVerifierForTests({
      verifyIdToken: async () => ({ getPayload: () => fakePayload({ email_verified: false }) }),
    });
    const res = await request(app).post('/api/auth/google').send({ credential: 'fake' });
    expect(res.status).toBe(401);
  });

  it('logs an existing admin in by matching email', async () => {
    setGoogleVerifierForTests({
      verifyIdToken: async () => ({ getPayload: () => fakePayload({ email: adminEmail }) }),
    });
    const res = await request(app).post('/api/auth/google').send({ credential: 'fake' });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('admin');
  });

  it('returns needsConsent + a draftToken for a brand new identity, without creating an account yet', async () => {
    setGoogleVerifierForTests({
      verifyIdToken: async () => ({ getPayload: () => fakePayload() }),
    });
    const res = await request(app).post('/api/auth/google').send({ credential: 'fake' });
    expect(res.status).toBe(200);
    expect(res.body.needsConsent).toBe(true);
    expect(res.body.provider).toBe('google');
    expect(res.body.draftToken).toEqual(expect.any(String));
    expect(res.body.token).toBeUndefined();

    const created = await db.select().from(clients).where(eq(clients.email, 'google-user@example.com'));
    expect(created).toHaveLength(0);
  });

  it('completes registration via /auth/sso/complete-registration once the legal terms are accepted', async () => {
    setGoogleVerifierForTests({
      verifyIdToken: async () => ({ getPayload: () => fakePayload() }),
    });
    const googleRes = await request(app).post('/api/auth/google').send({ credential: 'fake' });
    expect(googleRes.status).toBe(200);
    const { draftToken } = googleRes.body;

    const completeRes = await request(app)
      .post('/api/auth/sso/complete-registration')
      .send({ draftToken, legalAcceptance: legalAcceptanceFixture });
    expect(completeRes.status).toBe(201);
    expect(completeRes.body.token).toEqual(expect.any(String));
    expect(completeRes.body.clientType).toBe('lead_wellness');

    const created = await db.select().from(clients).where(eq(clients.email, 'google-user@example.com'));
    expect(created).toHaveLength(1);
    expect(created[0].status).toBe('active');
    expect(created[0].googleId).toBe('google-sub-123');
    expect(created[0].memberNumber).not.toBeNull();

    const [acceptance] = await db.select().from(legalAcceptances).where(eq(legalAcceptances.clientId, created[0].id));
    expect(acceptance).toBeDefined();
    expect(acceptance.sensitiveDataConsent).toBe(true);

    // El draftToken es de un solo uso — un segundo intento con el mismo
    // token debe rechazarse, no crear un segundo cliente.
    const secondAttempt = await request(app)
      .post('/api/auth/sso/complete-registration')
      .send({ draftToken, legalAcceptance: legalAcceptanceFixture });
    expect(secondAttempt.status).toBe(401);
  });

  it('rejects completing SSO registration with an invalid draftToken', async () => {
    const res = await request(app)
      .post('/api/auth/sso/complete-registration')
      .send({ draftToken: 'not-a-real-token', legalAcceptance: legalAcceptanceFixture });
    expect(res.status).toBe(401);
  });

  it('still finds a client by googleId when their platform email no longer matches the Google account (changed via the account panel)', async () => {
    const [client] = await db
      .insert(clients)
      .values({
        name: 'Renamed Email Client',
        email: 'renamed-email-client@example.com',
        googleId: 'google-sub-changed-email',
        status: 'active',
      })
      .returning();

    setGoogleVerifierForTests({
      // Google sigue devolviendo el email original con el que se vinculó la
      // cuenta — ya no coincide con el que el cliente guardó desde el panel.
      verifyIdToken: async () => ({ getPayload: () => fakePayload({ email: 'original-google-email@example.com', sub: 'google-sub-changed-email' }) }),
    });
    const res = await request(app).post('/api/auth/google').send({ credential: 'fake' });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('cliente');
    expect(res.body.user.id).toBe(client.id);
    // No debe haber creado una cuenta nueva ni pisado el email guardado.
    expect(res.body.user.email).toBe('renamed-email-client@example.com');

    await db.delete(clients).where(eq(clients.id, client.id));
  });
});
