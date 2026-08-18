import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../src/app.js';
import { db } from '../src/db/index.js';
import { clients, legalAcceptances } from '../src/models/schema.js';
import { setAppleVerifierForTests, type AppleIdentityPayload } from '../src/services/apple-auth.service.js';

const legalAcceptanceFixture = {
  dataPolicyVersion: 'v0.1-borrador',
  termsVersion: 'v0.1-borrador',
  sensitiveDataConsent: true,
  acceptedAt: new Date().toISOString(),
};

function fakeApplePayload(overrides: Partial<AppleIdentityPayload> = {}): AppleIdentityPayload {
  return {
    sub: 'apple-sub-123',
    email: 'apple-user@example.com',
    email_verified: true,
    ...overrides,
  };
}

describe('SSO consent gate (needsConsent -> /auth/sso/complete-registration)', () => {
  const app = createApp();

  beforeEach(() => {
    process.env.APPLE_CLIENT_ID = 'test-apple-client-id';
    setAppleVerifierForTests(null);
  });

  afterEach(async () => {
    // legal_acceptances no tiene ON DELETE CASCADE a propósito — hay que
    // borrarla antes de poder borrar el cliente de prueba.
    const created = await db.select().from(clients).where(eq(clients.email, 'apple-user@example.com'));
    for (const c of created) {
      await db.delete(legalAcceptances).where(eq(legalAcceptances.clientId, c.id));
    }
    await db.delete(clients).where(eq(clients.email, 'apple-user@example.com'));
  });

  it('returns needsConsent + a draftToken for a brand new Apple identity, without creating an account yet', async () => {
    setAppleVerifierForTests(async () => fakeApplePayload());
    const res = await request(app).post('/api/auth/apple').send({ identityToken: 'fake', name: 'Apple User' });
    expect(res.status).toBe(200);
    expect(res.body.needsConsent).toBe(true);
    expect(res.body.provider).toBe('apple');
    expect(res.body.draftToken).toEqual(expect.any(String));

    const created = await db.select().from(clients).where(eq(clients.email, 'apple-user@example.com'));
    expect(created).toHaveLength(0);
  });

  it('completes an Apple registration via /auth/sso/complete-registration once the legal terms are accepted', async () => {
    setAppleVerifierForTests(async () => fakeApplePayload());
    const appleRes = await request(app).post('/api/auth/apple').send({ identityToken: 'fake', name: 'Apple User' });
    expect(appleRes.status).toBe(200);
    const { draftToken } = appleRes.body;

    const completeRes = await request(app)
      .post('/api/auth/sso/complete-registration')
      .send({ draftToken, legalAcceptance: legalAcceptanceFixture });
    expect(completeRes.status).toBe(201);
    expect(completeRes.body.token).toEqual(expect.any(String));
    expect(completeRes.body.clientType).toBe('lead_wellness');

    const [created] = await db.select().from(clients).where(eq(clients.email, 'apple-user@example.com'));
    expect(created.appleId).toBe('apple-sub-123');
    expect(created.status).toBe('active');

    const [acceptance] = await db.select().from(legalAcceptances).where(eq(legalAcceptances.clientId, created.id));
    expect(acceptance).toBeDefined();
    expect(acceptance.termsVersion).toBe(legalAcceptanceFixture.termsVersion);
  });

  it('rejects completing registration if the email got registered by another path in the meantime (race guard)', async () => {
    setAppleVerifierForTests(async () => fakeApplePayload());
    const appleRes = await request(app).post('/api/auth/apple').send({ identityToken: 'fake', name: 'Apple User' });
    const { draftToken } = appleRes.body;

    // Mientras el draft seguía sin consumirse, el mismo email se registró
    // por otra vía (ej. dos pestañas, o la solicitud de Membresía Premium).
    await db.insert(clients).values({ name: 'Apple User', email: 'apple-user@example.com', passwordHash: null, status: 'inactive' });

    const completeRes = await request(app)
      .post('/api/auth/sso/complete-registration')
      .send({ draftToken, legalAcceptance: legalAcceptanceFixture });
    expect(completeRes.status).toBe(409);
  });

  it('rejects completing registration with a missing legalAcceptance payload', async () => {
    setAppleVerifierForTests(async () => fakeApplePayload());
    const appleRes = await request(app).post('/api/auth/apple').send({ identityToken: 'fake', name: 'Apple User' });
    const { draftToken } = appleRes.body;

    const res = await request(app).post('/api/auth/sso/complete-registration').send({ draftToken });
    expect(res.status).toBe(400);
  });
});
