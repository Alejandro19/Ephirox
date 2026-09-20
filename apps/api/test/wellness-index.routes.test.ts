import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../src/app.js';
import { db } from '../src/db/index.js';
import { clients, trainingCompletions, sleepLogs, wellnessIndexHistory } from '../src/models/schema.js';
import { signToken } from '../src/services/auth.service.js';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

describe('wellness-index route', () => {
  const app = createApp();
  let clientId: string;
  let clientToken: string;
  let otherClientId: string;
  let otherClientToken: string;

  beforeAll(async () => {
    const [client] = await db
      .insert(clients)
      .values({
        name: 'Wellness Client',
        email: `wellness-${Date.now()}@example.com`,
        status: 'active',
        clientType: 'coaching_1_1',
      })
      .returning();
    clientId = client.id;
    clientToken = signToken({ id: clientId, role: 'cliente', name: client.name, email: client.email });

    const [otherClient] = await db
      .insert(clients)
      .values({
        name: 'Other Wellness Client',
        email: `wellness-other-${Date.now()}@example.com`,
        status: 'active',
        clientType: 'coaching_1_1',
      })
      .returning();
    otherClientId = otherClient.id;
    otherClientToken = signToken({ id: otherClientId, role: 'cliente', name: otherClient.name, email: otherClient.email });
  });

  afterAll(async () => {
    await db.delete(clients).where(eq(clients.id, clientId));
    await db.delete(clients).where(eq(clients.id, otherClientId));
  });

  afterEach(async () => {
    await db.delete(trainingCompletions).where(eq(trainingCompletions.clientId, clientId));
    await db.delete(sleepLogs).where(eq(sleepLogs.clientId, clientId));
    await db.delete(wellnessIndexHistory).where(eq(wellnessIndexHistory.clientId, clientId));
  });

  it('returns null when the client has no data in any component yet', async () => {
    const res = await request(app).get(`/api/clients/${clientId}/wellness-index`).set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });

  it('computes the weighted value from training/sleep, nests them into the evolution component, and never includes nutrition', async () => {
    await db.update(clients).set({ trainingDays: 1 }).where(eq(clients.id, clientId));
    const today = todayISO();
    // trainingDays=1 -> expected=4 this month; 2 distinct days done -> pct=50
    await db.insert(trainingCompletions).values([
      { clientId, dayNumber: 1, completedDate: today, source: 'manual' },
    ]);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    await db.insert(trainingCompletions).values([{ clientId, dayNumber: 1, completedDate: yesterday, source: 'manual' }]);
    await db.insert(sleepLogs).values({ clientId, date: today, hours: '7', quality: 5 });

    const res = await request(app).get(`/api/clients/${clientId}/wellness-index`).set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.value).toBe(73);
    expect(res.body.data.trend).toBe('none');
    expect(res.body.data.previousValue).toBeNull();
    expect(res.body.data.componentsUsed).toMatchObject({ training: 50, sleep: 100, evolution: 71 });
    expect(res.body.data.componentsUsed.nutrition).toBeUndefined();
    expect(res.body.data.componentsUsed.cortisol).toBeUndefined();
  });

  it('does not duplicate the history row when called twice in the same week — upserts in place', async () => {
    const today = todayISO();
    await db.insert(sleepLogs).values({ clientId, date: today, hours: '7', quality: 3 });

    await request(app).get(`/api/clients/${clientId}/wellness-index`).set('Authorization', `Bearer ${clientToken}`);
    await request(app).get(`/api/clients/${clientId}/wellness-index`).set('Authorization', `Bearer ${clientToken}`);

    const rows = await db.select().from(wellnessIndexHistory).where(eq(wellnessIndexHistory.clientId, clientId));
    expect(rows).toHaveLength(1);
  });

  it('computes delta and trend against a seeded previous-week row', async () => {
    const lastWeek = new Date(Date.now() - 8 * 86400000).toISOString().slice(0, 10);
    await db.insert(wellnessIndexHistory).values({ clientId, periodStart: lastWeek, value: 40, componentsUsed: {} });

    const today = todayISO();
    await db.insert(sleepLogs).values({ clientId, date: today, hours: '7', quality: 5 });

    const res = await request(app).get(`/api/clients/${clientId}/wellness-index`).set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.previousValue).toBe(40);
    expect(res.body.data.delta).toBeGreaterThan(0);
    expect(res.body.data.trend).toBe('up');
  });

  it('rejects a client fetching a different client\'s index', async () => {
    const res = await request(app).get(`/api/clients/${clientId}/wellness-index`).set('Authorization', `Bearer ${otherClientToken}`);
    expect(res.status).toBe(403);
  });
});

describe('wellness-index history route (Evolution, spec 27.2)', () => {
  const app = createApp();
  let clientId: string;
  let clientToken: string;

  beforeAll(async () => {
    const [client] = await db
      .insert(clients)
      .values({ name: 'Wellness History Client', email: `wellness-history-${Date.now()}@example.com`, status: 'active', clientType: 'coaching_1_1' })
      .returning();
    clientId = client.id;
    clientToken = signToken({ id: clientId, role: 'cliente', name: client.name, email: client.email });
  });

  afterAll(async () => {
    await db.delete(clients).where(eq(clients.id, clientId));
  });

  afterEach(async () => {
    await db.delete(wellnessIndexHistory).where(eq(wellnessIndexHistory.clientId, clientId));
  });

  it('returns an empty history and a null typical when there is no data yet', async () => {
    const res = await request(app).get(`/api/clients/${clientId}/wellness-index/history?days=30`).set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ points: [], typical: null });
  });

  it('returns the points within the requested window and their average as "típico"', async () => {
    const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await db.insert(wellnessIndexHistory).values([
      { clientId, periodStart: daysAgo(60), value: 100, componentsUsed: {} }, // fuera de la ventana de 30 días
      { clientId, periodStart: daysAgo(14), value: 60, componentsUsed: {} },
      { clientId, periodStart: daysAgo(7), value: 80, componentsUsed: {} },
    ]);

    const res = await request(app).get(`/api/clients/${clientId}/wellness-index/history?days=30`).set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.points).toHaveLength(2);
    expect(res.body.data.typical).toBe(70);
  });
});
