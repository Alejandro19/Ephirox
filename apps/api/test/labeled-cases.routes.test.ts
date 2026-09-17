import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../src/app.js';
import { db } from '../src/db/index.js';
import { clients, admins, mentors, stressProtocols, labeledCases } from '../src/models/schema.js';
import { hashPassword, signToken } from '../src/services/auth.service.js';

describe('labeled cases + mentors routes (Fase 3 — Caso Etiquetado)', () => {
  const app = createApp();
  let adminToken: string;
  let adminId: string;
  let clientId: string;
  let clientToken: string;
  let mentorId: string;
  let protocolId: string;

  beforeAll(async () => {
    const adminEmail = `labeled-cases-admin-${Date.now()}@example.com`;
    const [admin] = await db.insert(admins).values({ name: 'Cases Admin', email: adminEmail, passwordHash: await hashPassword('x') }).returning();
    adminId = admin.id;
    adminToken = signToken({ id: adminId, role: 'admin', name: 'Cases Admin', email: adminEmail });

    const [client] = await db
      .insert(clients)
      .values({ name: 'Cases Client', email: `labeled-cases-${Date.now()}@example.com`, status: 'active', clientType: 'mentoring', permissions: { stress: true } })
      .returning();
    clientId = client.id;
    clientToken = signToken({ id: clientId, role: 'cliente', name: client.name, email: client.email });

    const [mentor] = await db.insert(mentors).values({ name: 'Sofía Duarte', specialty: 'Regulación del sistema nervioso' }).returning();
    mentorId = mentor.id;

    const [protocol] = await db
      .insert(stressProtocols)
      .values({ name: 'Recuperación Vagal — Nivel 1', mechanism: 'Respiración', status: 'publicado', createdBy: adminId })
      .returning();
    protocolId = protocol.id;
  });

  afterAll(async () => {
    await db.delete(labeledCases).where(eq(labeledCases.clientId, clientId));
    await db.delete(stressProtocols).where(eq(stressProtocols.id, protocolId));
    await db.delete(mentors).where(eq(mentors.id, mentorId));
    await db.delete(clients).where(eq(clients.id, clientId));
    await db.delete(admins).where(eq(admins.id, adminId));
  });

  it('rejects a client from creating a mentor (admin-only)', async () => {
    const res = await request(app).post('/api/admin/mentors').set('Authorization', `Bearer ${clientToken}`).send({ name: 'Intento' });
    expect(res.status).toBe(403);
  });

  it('admin creates a mentor and it appears in the list', async () => {
    const res = await request(app).get('/api/admin/mentors').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.mentors.some((m: { id: string }) => m.id === mentorId)).toBe(true);
  });

  it('admin assigns a published protocol + mentor to a client, snapshotting baseline and creating week 6/12 checkpoints', async () => {
    const createRes = await request(app)
      .post(`/api/admin/clients/${clientId}/labeled-cases`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ module: 'stress', protocol_id: protocolId, mentor_id: mentorId });
    expect(createRes.status).toBe(201);
    expect(createRes.body.case.clientId).toBe(clientId);
    expect(createRes.body.case.protocolId).toBe(protocolId);
    expect(createRes.body.case.mentorId).toBe(mentorId);
    expect(createRes.body.case.caseNumber).toEqual(expect.any(Number));
    expect(createRes.body.case.baselineSnapshot).toBeDefined();

    const listRes = await request(app).get('/api/admin/labeled-cases?module=stress').set('Authorization', `Bearer ${adminToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.cases.some((c: { id: string }) => c.id === createRes.body.case.id)).toBe(true);
  });

  it('client fetches the active case and gets mentor + protocol + resources denormalized', async () => {
    const res = await request(app)
      .get(`/api/clients/${clientId}/labeled-cases/active?module=stress`)
      .set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(200);
    expect(res.body.activeCase).not.toBeNull();
    expect(res.body.activeCase.mentor.name).toBe('Sofía Duarte');
    expect(res.body.activeCase.protocol.name).toBe('Recuperación Vagal — Nivel 1');
    expect(res.body.activeCase.checkpoints).toHaveLength(2);
    expect(res.body.activeCase.checkpoints.map((c: { weekNumber: number }) => c.weekNumber)).toEqual([6, 12]);
  });

  it('admin updates a checkpoint status to completado', async () => {
    const listRes = await request(app).get('/api/admin/labeled-cases?module=stress').set('Authorization', `Bearer ${adminToken}`);
    const caseId = listRes.body.cases[0].id;

    const patchRes = await request(app)
      .patch(`/api/admin/labeled-cases/${caseId}/checkpoints/6`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'completado', notes: 'Mejoró HRV respecto al baseline.' });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.checkpoint.status).toBe('completado');
    expect(patchRes.body.checkpoint.completedAt).not.toBeNull();
  });

  it('admin closes the case with an outcome, and it stops appearing as active for the client', async () => {
    const listRes = await request(app).get('/api/admin/labeled-cases?module=stress').set('Authorization', `Bearer ${adminToken}`);
    const caseId = listRes.body.cases[0].id;

    const closeRes = await request(app)
      .patch(`/api/admin/labeled-cases/${caseId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ outcome: 'mejora' });
    expect(closeRes.status).toBe(200);
    expect(closeRes.body.case.outcome).toBe('mejora');
    expect(closeRes.body.case.closedAt).not.toBeNull();

    const activeRes = await request(app)
      .get(`/api/clients/${clientId}/labeled-cases/active?module=stress`)
      .set('Authorization', `Bearer ${clientToken}`);
    expect(activeRes.status).toBe(200);
    expect(activeRes.body.activeCase).toBeNull();
  });
});
