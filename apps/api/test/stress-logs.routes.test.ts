import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../src/app.js';
import { db } from '../src/db/index.js';
import { clients, stressCompletions } from '../src/models/schema.js';
import { signToken } from '../src/services/auth.service.js';

describe('stress logs routes', () => {
  const app = createApp();
  let clientId: string;
  let clientToken: string;

  beforeAll(async () => {
    const [client] = await db
      .insert(clients)
      .values({
        name: 'Stress Logs Client',
        email: `stress-logs-${Date.now()}@example.com`,
        status: 'active',
        clientType: 'coaching_1_1',
        permissions: { stress: true },
      })
      .returning();
    clientId = client.id;
    clientToken = signToken({ id: clientId, role: 'cliente', name: client.name, email: client.email });
  });

  afterAll(async () => {
    await db.delete(clients).where(eq(clients.id, clientId));
  });

  afterEach(async () => {
    await db.delete(stressCompletions).where(eq(stressCompletions.clientId, clientId));
  });

  it('lists no completions when none exist', async () => {
    const res = await request(app).get(`/api/clients/${clientId}/stress-completions`).set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(200);
    expect(res.body.completions).toEqual([]);
  });

  it('marks a completion for today, and posting again the same day returns the same row (no duplicate)', async () => {
    const first = await request(app).post(`/api/clients/${clientId}/stress-completions`).set('Authorization', `Bearer ${clientToken}`).send({});
    expect(first.status).toBe(201);

    const second = await request(app).post(`/api/clients/${clientId}/stress-completions`).set('Authorization', `Bearer ${clientToken}`).send({});
    expect(second.status).toBe(200);
    expect(second.body.completion.id).toBe(first.body.completion.id);

    const list = await db.select().from(stressCompletions).where(eq(stressCompletions.clientId, clientId));
    expect(list).toHaveLength(1);
  });
});
