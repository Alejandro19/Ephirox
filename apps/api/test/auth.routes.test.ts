import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { createApp } from '../src/app.js';
import { db } from '../src/db/index.js';
import { admins, clients, therapists, adminNotifications, personalInfo } from '../src/models/schema.js';
import { hashPassword, signToken, type TokenPayload } from '../src/services/auth.service.js';
import { createResetToken, consumeResetToken } from '../src/services/password-reset.service.js';

describe('auth routes', () => {
  const app = createApp();
  const adminEmail = `auth-admin-${Date.now()}@example.com`;
  const clientEmail = `auth-client-${Date.now()}@example.com`;
  let adminId: string;
  let clientId: string;

  beforeAll(async () => {
    const [admin] = await db
      .insert(admins)
      .values({ name: 'Test Admin', email: adminEmail, passwordHash: await hashPassword('admin-pass') })
      .returning();
    adminId = admin.id;

    const [client] = await db
      .insert(clients)
      .values({ name: 'Test Client', email: clientEmail, passwordHash: await hashPassword('client-pass'), status: 'active' })
      .returning();
    clientId = client.id;
  });

  afterAll(async () => {
    await db.delete(adminNotifications).where(eq(adminNotifications.clientId, clientId));
    await db.delete(clients).where(eq(clients.id, clientId));
    await db.delete(admins).where(eq(admins.id, adminId));
  });

  afterEach(async () => {
    await db.delete(clients).where(eq(clients.email, 'new-register@example.com'));
  });

  it('logs an admin in with the correct password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: adminEmail, password: 'admin-pass' });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('admin');
    expect(typeof res.body.token).toBe('string');
  });

  it('rejects a login with the wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: adminEmail, password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('logs a client in and reports their permissions', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: clientEmail, password: 'client-pass' });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('cliente');
    expect(res.body.permissions).toBeDefined();
  });

  it('reports onboardingComplete as false for a client with no personal-info row', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: clientEmail, password: 'client-pass' });
    expect(res.status).toBe(200);
    expect(res.body.onboardingComplete).toBe(false);
  });

  it('reports onboardingComplete as true on /me once personal-info is completed', async () => {
    await db.insert(personalInfo).values({ clientId, completedAt: new Date() });
    const token = signToken({ id: clientId, role: 'cliente', name: 'Test Client', email: clientEmail });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.onboardingComplete).toBe(true);
    await db.delete(personalInfo).where(eq(personalInfo.clientId, clientId));
  });

  it('rejects a login for an inactive client', async () => {
    await db.update(clients).set({ status: 'inactive' }).where(eq(clients.id, clientId));
    const res = await request(app).post('/api/auth/login').send({ email: clientEmail, password: 'client-pass' });
    expect(res.status).toBe(403);
    await db.update(clients).set({ status: 'active' }).where(eq(clients.id, clientId));
  });

  it('registers a new client as inactive and pending', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'New Register', email: 'new-register@example.com', password: 'secret' });
    expect(res.status).toBe(201);
    expect(res.body.pending).toBe(true);
  });

  it('rejects registering an email that already exists', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Dup', email: adminEmail, password: 'secret' });
    expect(res.status).toBe(409);
  });

  it('returns the current admin on /me', async () => {
    const token = signToken({ id: adminId, role: 'admin', name: 'Test Admin', email: adminEmail });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(adminEmail);
  });

  it('changes the current user\'s password', async () => {
    const token = signToken({ id: clientId, role: 'cliente', name: 'Test Client', email: clientEmail });
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'client-pass', newPassword: 'new-client-pass' });
    expect(res.status).toBe(200);

    const loginRes = await request(app).post('/api/auth/login').send({ email: clientEmail, password: 'new-client-pass' });
    expect(loginRes.status).toBe(200);
  });

  it('forgot-password always returns a generic success message, whether or not the email exists', async () => {
    const resExisting = await request(app).post('/api/auth/forgot-password').send({ email: clientEmail });
    const resMissing = await request(app).post('/api/auth/forgot-password').send({ email: 'no-such-user@example.com' });
    expect(resExisting.status).toBe(200);
    expect(resMissing.status).toBe(200);
    expect(resExisting.body.message).toBe(resMissing.body.message);
  });

  it('reset-password updates the password and the new password works on login', async () => {
    const rawToken = await createResetToken('cliente', clientId);
    const res = await request(app).post('/api/auth/reset-password').send({ token: rawToken, newPassword: 'reset-via-link-pass' });
    expect(res.status).toBe(200);

    const loginRes = await request(app).post('/api/auth/login').send({ email: clientEmail, password: 'reset-via-link-pass' });
    expect(loginRes.status).toBe(200);
  });

  it('reset-password rejects an invalid token', async () => {
    const res = await request(app).post('/api/auth/reset-password').send({ token: 'not-a-real-token', newPassword: 'whatever123' });
    expect(res.status).toBe(400);
  });

  it('reset-password token cannot be used twice', async () => {
    const rawToken = await createResetToken('cliente', clientId);
    const first = await request(app).post('/api/auth/reset-password').send({ token: rawToken, newPassword: 'first-reset-pass' });
    expect(first.status).toBe(200);

    const second = await request(app).post('/api/auth/reset-password').send({ token: rawToken, newPassword: 'second-reset-pass' });
    expect(second.status).toBe(400);
  });

  it('consumeResetToken returns null for an already-consumed token', async () => {
    const rawToken = await createResetToken('cliente', clientId);
    const first = await consumeResetToken(rawToken);
    expect(first).not.toBeNull();
    const second = await consumeResetToken(rawToken);
    expect(second).toBeNull();
  });
});

describe('therapist forced password change', () => {
  const app = createApp();
  const therapistEmail = `auth-therapist-${Date.now()}@example.com`;
  let therapistId: string;

  beforeAll(async () => {
    const [therapist] = await db
      .insert(therapists)
      .values({ name: 'Temp Therapist', email: therapistEmail, passwordHash: await hashPassword('temp-pass-123'), mustChangePassword: true })
      .returning();
    therapistId = therapist.id;
  });

  afterAll(async () => {
    await db.delete(therapists).where(eq(therapists.id, therapistId));
  });

  it('a therapist created with a temporary password must change it on first login', async () => {
    const res = await request(app).post('/api/auth/therapist/login').send({ email: therapistEmail, password: 'temp-pass-123' });
    expect(res.status).toBe(200);
    expect(res.body.mustChangePassword).toBe(true);
    const decoded = jwt.decode(res.body.token) as TokenPayload;
    expect(decoded.mustChangePassword).toBe(true);
  });

  it('change-password clears mustChangePassword and reissues a token without the flag', async () => {
    const token = signToken({ id: therapistId, role: 'terapeuta', name: 'Temp Therapist', email: therapistEmail, mustChangePassword: true });
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'temp-pass-123', newPassword: 'permanent-pass-456' });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    const decoded = jwt.decode(res.body.token) as TokenPayload;
    expect(decoded.mustChangePassword).toBe(false);

    const loginRes = await request(app).post('/api/auth/therapist/login').send({ email: therapistEmail, password: 'permanent-pass-456' });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.mustChangePassword).toBe(false);
  });
});
