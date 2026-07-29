import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../src/app.js';
import { db } from '../src/db/index.js';
import { clients, bioInbodyRecords } from '../src/models/schema.js';
import { signToken } from '../src/services/auth.service.js';

describe('inbody routes', () => {
  const app = createApp();
  let clientId: string;
  let token: string;

  beforeAll(async () => {
    const [client] = await db
      .insert(clients)
      .values({
        name: 'Inbody Client',
        email: `inbody-${Date.now()}@example.com`,
        passwordHash: 'x',
        clientType: 'coaching_1_1',
        inbodyCadenceType: 'mensual',
      })
      .returning();
    clientId = client.id;
    token = signToken({ id: clientId, role: 'cliente', name: 'Inbody Client', email: client.email });
  });

  afterAll(async () => {
    await db.delete(bioInbodyRecords).where(eq(bioInbodyRecords.clientId, clientId));
    await db.delete(clients).where(eq(clients.id, clientId));
  });

  it('uploads an InBody file', async () => {
    const res = await request(app)
      .post(`/api/clients/${clientId}/inbody-upload`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('fake pdf bytes'), { filename: 'inbody.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(200);
    expect(res.body.file_url).toMatch(/^https:\/\//);
  });

  it('creates an InBody record and recalculates the next expected date for a mensual cadence', async () => {
    const res = await request(app)
      .post(`/api/clients/${clientId}/inbody-records`)
      .set('Authorization', `Bearer ${token}`)
      .send({ fecha: '2026-01-01', peso_total: 70, smm: 30, grasa_pct: 15 });
    expect(res.status).toBe(201);
    expect(res.body.record.pesoTotal).toBe(70);

    const [updatedClient] = await db.select().from(clients).where(eq(clients.id, clientId));
    expect(updatedClient.inbodyNextExpectedDate).toBe('2026-02-01');
    expect(updatedClient.inbodyReminderSentThisCycle).toBe(false);
  });

  it('lists InBody records for a client', async () => {
    const res = await request(app).get(`/api/clients/${clientId}/inbody-records`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.records).toHaveLength(1);
  });
});
