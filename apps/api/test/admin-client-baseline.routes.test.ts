import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../src/app.js';
import { db } from '../src/db/index.js';
import { clients, admins, wearableMetricas } from '../src/models/schema.js';
import { hashPassword, signToken } from '../src/services/auth.service.js';

describe('admin client baseline routes (Fase 4 — clientes activos + wearable más reciente)', () => {
  const app = createApp();
  let adminToken: string;
  let adminId: string;
  let clientId: string;
  let inactiveClientId: string;

  beforeAll(async () => {
    const adminEmail = `baseline-admin-${Date.now()}@example.com`;
    const [admin] = await db.insert(admins).values({ name: 'Baseline Admin', email: adminEmail, passwordHash: await hashPassword('x') }).returning();
    adminId = admin.id;
    adminToken = signToken({ id: adminId, role: 'admin', name: 'Baseline Admin', email: adminEmail });

    const [client] = await db
      .insert(clients)
      .values({ name: 'Baseline Client', email: `baseline-${Date.now()}@example.com`, status: 'active', clientType: 'coaching_1_1' })
      .returning();
    clientId = client.id;

    const [inactive] = await db
      .insert(clients)
      .values({ name: 'Inactive Client', email: `baseline-inactive-${Date.now()}@example.com`, status: 'inactive', clientType: 'coaching_1_1' })
      .returning();
    inactiveClientId = inactive.id;

    // Dos filas de wearable — la del 16 es más reciente que la del 10, debe
    // ganar esa aunque se inserte primero la vieja.
    await db.insert(wearableMetricas).values({ clientId, dispositivo: 'oura', fecha: '2026-09-10', hrvNocturno: 30, fcReposo: 70 });
    await db.insert(wearableMetricas).values({ clientId, dispositivo: 'oura', fecha: '2026-09-16', hrvNocturno: 38, fcReposo: 62, suenoScore: 65 });
  });

  afterAll(async () => {
    await db.delete(wearableMetricas).where(eq(wearableMetricas.clientId, clientId));
    await db.delete(clients).where(eq(clients.id, clientId));
    await db.delete(clients).where(eq(clients.id, inactiveClientId));
    await db.delete(admins).where(eq(admins.id, adminId));
  });

  it('returns only active clients, each with their most recent wearable snapshot', async () => {
    const res = await request(app).get('/api/admin/clients/active-summary').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);

    const row = res.body.clients.find((c: { id: string }) => c.id === clientId);
    expect(row).toBeDefined();
    expect(row.fecha).toBe('2026-09-16');
    expect(row.hrvNocturno).toBe(38);
    expect(row.fcReposo).toBe(62);
    expect(row.suenoScore).toBe(65);

    expect(res.body.clients.some((c: { id: string }) => c.id === inactiveClientId)).toBe(false);
  });
});
