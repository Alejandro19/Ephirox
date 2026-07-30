import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../src/app.js';
import { db } from '../src/db/index.js';
import { clients, trainingCompletions } from '../src/models/schema.js';
import { signToken } from '../src/services/auth.service.js';

describe('training routes', () => {
  const app = createApp();
  let adminToken: string;
  let clientId: string;
  let clientToken: string;

  beforeAll(async () => {
    adminToken = signToken({ id: 'admin-1', role: 'admin', name: 'Admin', email: 'admin@example.com' });
    const [client] = await db
      .insert(clients)
      .values({
        name: 'Training Client',
        email: `training-${Date.now()}@example.com`,
        passwordHash: 'x',
        clientType: 'coaching_1_1',
        permissions: { training: true },
      })
      .returning();
    clientId = client.id;
    clientToken = signToken({ id: clientId, role: 'cliente', name: client.name, email: client.email });
  });

  afterAll(async () => {
    await db.delete(trainingCompletions).where(eq(trainingCompletions.clientId, clientId));
    await db.delete(clients).where(eq(clients.id, clientId));
  });

  it('rejects an invalid training_days value', async () => {
    const res = await request(app)
      .patch(`/api/clients/${clientId}/training-days`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ training_days: 9 });
    expect(res.status).toBe(400);
  });

  it('sets training_days as admin', async () => {
    const res = await request(app)
      .patch(`/api/clients/${clientId}/training-days`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ training_days: 3 });
    expect(res.status).toBe(200);
    expect(res.body.client.trainingDays).toBe(3);
  });

  it('rejects a client setting their own training_days', async () => {
    const res = await request(app)
      .patch(`/api/clients/${clientId}/training-days`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ training_days: 5 });
    expect(res.status).toBe(403);
  });

  it('fails confirm-session when the client has no training_days', async () => {
    const [noDaysClient] = await db
      .insert(clients)
      .values({
        name: 'No Days Client',
        email: `nodays-${Date.now()}@example.com`,
        passwordHash: 'x',
        clientType: 'coaching_1_1',
        permissions: { training: true },
      })
      .returning();
    const noDaysToken = signToken({ id: noDaysClient.id, role: 'cliente', name: noDaysClient.name, email: noDaysClient.email });
    const res = await request(app)
      .post(`/api/clients/${noDaysClient.id}/training/confirm-session`)
      .set('Authorization', `Bearer ${noDaysToken}`)
      .send({ tz: 'America/Mexico_City' });
    expect(res.status).toBe(400);
    await db.delete(clients).where(eq(clients.id, noDaysClient.id));
  });

  it('confirms a session and inserts training_completions for day 1', async () => {
    const res = await request(app)
      .post(`/api/clients/${clientId}/training/confirm-session`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ tz: 'America/Mexico_City' });
    expect(res.status).toBe(200);
    expect(res.body.alreadyConfirmedToday).toBe(false);
    expect(res.body.dayNumber).toBe(1);

    const completions = await db.select().from(trainingCompletions).where(eq(trainingCompletions.clientId, clientId));
    expect(completions).toHaveLength(1);
    expect(completions[0].dayNumber).toBe(1);
    expect(completions[0].source).toBe('manual');
  });

  it('reports alreadyConfirmedToday on a second call the same day and does not insert a duplicate row', async () => {
    const res = await request(app)
      .post(`/api/clients/${clientId}/training/confirm-session`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ tz: 'America/Mexico_City' });
    expect(res.status).toBe(200);
    expect(res.body.alreadyConfirmedToday).toBe(true);

    const completions = await db.select().from(trainingCompletions).where(eq(trainingCompletions.clientId, clientId));
    expect(completions).toHaveLength(1);
  });

  it('lists training completions', async () => {
    const res = await request(app).get(`/api/clients/${clientId}/training-completions`).set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(200);
    expect(res.body.completions).toHaveLength(1);
  });
});
