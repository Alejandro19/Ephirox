import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../src/app.js';
import { db } from '../src/db/index.js';
import { clients, admins, wearableMetricas, assignmentCriteria } from '../src/models/schema.js';
import { hashPassword, signToken } from '../src/services/auth.service.js';

describe('assignment criteria + metrics catalog routes (Fase 5 — motor de criterios)', () => {
  const app = createApp();
  let adminToken: string;
  let adminId: string;
  let clientId: string;
  let clientToken: string;
  let hrvMetricId: string;

  beforeAll(async () => {
    const adminEmail = `criteria-admin-${Date.now()}@example.com`;
    const [admin] = await db.insert(admins).values({ name: 'Criteria Admin', email: adminEmail, passwordHash: await hashPassword('x') }).returning();
    adminId = admin.id;
    adminToken = signToken({ id: adminId, role: 'admin', name: 'Criteria Admin', email: adminEmail });

    const [client] = await db
      .insert(clients)
      .values({ name: 'Criteria Client', email: `criteria-${Date.now()}@example.com`, status: 'active', clientType: 'coaching_1_1' })
      .returning();
    clientId = client.id;
    clientToken = signToken({ id: clientId, role: 'cliente', name: client.name, email: client.email });

    // Baseline de wearable: HRV bajo (35 ms) — para que matchee un criterio "HRV < 40".
    await db.insert(wearableMetricas).values({ clientId, dispositivo: 'oura', fecha: '2026-09-15', hrvNocturno: 35 });

    const metricsRes = await request(app).get('/api/admin/metrics-catalog').set('Authorization', `Bearer ${adminToken}`);
    hrvMetricId = metricsRes.body.metrics.find((m: { name: string }) => m.name === 'HRV basal (RMSSD)').id;
  });

  afterAll(async () => {
    await db.delete(wearableMetricas).where(eq(wearableMetricas.clientId, clientId));
    await db.delete(clients).where(eq(clients.id, clientId));
    await db.delete(admins).where(eq(admins.id, adminId));
  });

  it('rejects a client from listing the metrics catalog (admin-only)', async () => {
    const res = await request(app).get('/api/admin/metrics-catalog').set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(403);
  });

  it('seeds the metrics catalog on first read, and does not duplicate on a second read', async () => {
    const firstRes = await request(app).get('/api/admin/metrics-catalog').set('Authorization', `Bearer ${adminToken}`);
    expect(firstRes.status).toBe(200);
    const namesFirst = firstRes.body.metrics.map((m: { name: string }) => m.name);
    expect(namesFirst).toEqual(expect.arrayContaining(['HRV basal (RMSSD)', 'FC en reposo', 'Sleep score', 'Cortisol PM']));
    // El mockup de referencia tenía "Reuniones/semana", pero no hay ningún
    // campo real en el schema que la respalde todavía — no debe existir.
    expect(namesFirst).not.toContain('Reuniones / semana');

    const secondRes = await request(app).get('/api/admin/metrics-catalog').set('Authorization', `Bearer ${adminToken}`);
    expect(secondRes.body.metrics.length).toBe(firstRes.body.metrics.length);
  });

  it('admin creates a criterion (borrador), evaluates it against a real client, and it matches (HRV 35 < 40)', async () => {
    // matching-clients resuelve la métrica de cada cliente activo con su
    // propio round-trip a DB (real, no un mock) — con ~15-20 clientes
    // acumulados en la base de test, el default de 10s queda justo.
    const createRes = await request(app)
      .post('/api/admin/assignment-criteria')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Recuperación Vagal — criterio estándar',
        conditions: { metric_id: hrvMetricId, operator: 'menor_que', value: 40 },
        applicable_modules: ['stress'],
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.criteria.status).toBe('borrador');
    const criteriaId = createRes.body.criteria.id;

    const evalRes = await request(app)
      .post(`/api/admin/assignment-criteria/${criteriaId}/evaluate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ client_id: clientId });
    expect(evalRes.status).toBe(200);
    expect(evalRes.body.matches).toBe(true);
    expect(evalRes.body.resolvedValues[hrvMetricId]).toBe(35);

    const matchingRes = await request(app)
      .get(`/api/admin/assignment-criteria/${criteriaId}/matching-clients`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(matchingRes.status).toBe(200);
    expect(matchingRes.body.clients.some((c: { id: string }) => c.id === clientId)).toBe(true);

    await db.delete(assignmentCriteria).where(eq(assignmentCriteria.id, criteriaId));
  }, 30000);

  it('publishing a borrador criterion just flips its status, without creating a new version', async () => {
    const createRes = await request(app)
      .post('/api/admin/assignment-criteria')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Alta carga de reuniones', conditions: { metric_id: hrvMetricId, operator: 'menor_que', value: 50 }, applicable_modules: ['stress'] });
    const criteriaId = createRes.body.criteria.id;

    const publishRes = await request(app).post(`/api/admin/assignment-criteria/${criteriaId}/publish`).set('Authorization', `Bearer ${adminToken}`).send({});
    expect(publishRes.status).toBe(200);
    expect(publishRes.body.criteria.id).toBe(criteriaId);
    expect(publishRes.body.criteria.status).toBe('publicado');
    expect(publishRes.body.criteria.version).toBe(1);

    await db.delete(assignmentCriteria).where(eq(assignmentCriteria.id, criteriaId));
  });

  it('editing an already-published criterion archives the old row and creates version 2, not mutating version 1', async () => {
    const createRes = await request(app)
      .post('/api/admin/assignment-criteria')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Versionado v1', conditions: { metric_id: hrvMetricId, operator: 'menor_que', value: 40 }, applicable_modules: ['stress'] });
    const v1Id = createRes.body.criteria.id;
    await request(app).post(`/api/admin/assignment-criteria/${v1Id}/publish`).set('Authorization', `Bearer ${adminToken}`).send({});

    const republishRes = await request(app)
      .post(`/api/admin/assignment-criteria/${v1Id}/publish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ conditions: { metric_id: hrvMetricId, operator: 'menor_que', value: 35 } });
    expect(republishRes.status).toBe(200);
    const v2Id = republishRes.body.criteria.id;
    expect(v2Id).not.toBe(v1Id);
    expect(republishRes.body.criteria.version).toBe(2);

    const listRes = await request(app).get('/api/admin/assignment-criteria').set('Authorization', `Bearer ${adminToken}`);
    const v1Row = listRes.body.criteria.find((c: { id: string }) => c.id === v1Id);
    expect(v1Row.status).toBe('archivado');
    const v2Row = listRes.body.criteria.find((c: { id: string }) => c.id === v2Id);
    expect(v2Row.status).toBe('publicado');

    await db.delete(assignmentCriteria).where(eq(assignmentCriteria.id, v1Id));
    await db.delete(assignmentCriteria).where(eq(assignmentCriteria.id, v2Id));
  });

  it('refuses to delete a criterion that a protocol is using (409)', async () => {
    const createRes = await request(app)
      .post('/api/admin/assignment-criteria')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'En uso', conditions: { metric_id: hrvMetricId, operator: 'menor_que', value: 40 }, applicable_modules: ['stress'] });
    const criteriaId = createRes.body.criteria.id;

    const protocolRes = await request(app)
      .post('/api/admin/stress-protocols')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Protocolo con criterio' });
    const protocolId = protocolRes.body.protocol.id;
    await request(app).patch(`/api/admin/stress-protocols/${protocolId}`).set('Authorization', `Bearer ${adminToken}`).send({});
    // Asocia el criterio directamente en DB (el endpoint de protocolo no expone
    // set-criteria todavía — eso llega con la UI de la Fase 6/4).
    const { stressProtocols } = await import('../src/models/schema.js');
    await db.update(stressProtocols).set({ criteriaId }).where(eq(stressProtocols.id, protocolId));

    const deleteRes = await request(app).delete(`/api/admin/assignment-criteria/${criteriaId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(deleteRes.status).toBe(409);

    await db.delete(stressProtocols).where(eq(stressProtocols.id, protocolId));
    await db.delete(assignmentCriteria).where(eq(assignmentCriteria.id, criteriaId));
  });

  it('admin toggles a metric active/inactive and adjusts its reference_range', async () => {
    const patchRes = await request(app)
      .patch(`/api/admin/metrics-catalog/${hrvMetricId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ active: false, reference_range: { min: 42, max: 58 } });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.metric.active).toBe(false);
    expect(patchRes.body.metric.referenceRange).toEqual({ min: 42, max: 58 });

    // Restaurar para no afectar otros tests/corridas futuras contra la misma DB.
    await request(app).patch(`/api/admin/metrics-catalog/${hrvMetricId}`).set('Authorization', `Bearer ${adminToken}`).send({ active: true, reference_range: { min: 40, max: 60 } });
  });
});
