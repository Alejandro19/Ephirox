import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../src/app.js';
import { db } from '../src/db/index.js';
import { clients, admins, mentors, stressProtocols, labeledCases, assignmentCriteria, legalAcceptances } from '../src/models/schema.js';
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
      .send({ outcome: 'mejora_leve' });
    expect(closeRes.status).toBe(200);
    expect(closeRes.body.case.outcome).toBe('mejora_leve');
    expect(closeRes.body.case.closedAt).not.toBeNull();

    const activeRes = await request(app)
      .get(`/api/clients/${clientId}/labeled-cases/active?module=stress`)
      .set('Authorization', `Bearer ${clientToken}`);
    expect(activeRes.status).toBe(200);
    expect(activeRes.body.activeCase).toBeNull();
  });
});

describe('Casos Etiquetados — detalle, valoración estandarizada y elegibilidad de dataset (punto 24/25)', () => {
  const app = createApp();
  let adminToken: string;
  let adminId: string;
  let clientId: string;
  let protocolId: string;
  let criteriaId: string;

  beforeAll(async () => {
    const adminEmail = `labeled-cases-detail-admin-${Date.now()}@example.com`;
    const [admin] = await db.insert(admins).values({ name: 'Detail Admin', email: adminEmail, passwordHash: await hashPassword('x') }).returning();
    adminId = admin.id;
    adminToken = signToken({ id: adminId, role: 'admin', name: 'Detail Admin', email: adminEmail });

    const [client] = await db
      .insert(clients)
      .values({ name: 'Detail Client', email: `labeled-cases-detail-${Date.now()}@example.com`, status: 'active', clientType: 'mentoring', permissions: { stress: true } })
      .returning();
    clientId = client.id;

    const [criteria] = await db
      .insert(assignmentCriteria)
      .values({ name: 'Regla congelada de prueba', conditions: { metric_id: 'x', operator: 'menor_que', value: 1 }, applicableModules: ['stress'], status: 'publicado', version: 2, createdBy: adminId })
      .returning();
    criteriaId = criteria.id;

    const [protocol] = await db
      .insert(stressProtocols)
      .values({ name: 'Protocolo con regla', mechanism: 'Respiración', status: 'publicado', criteriaId, createdBy: adminId })
      .returning();
    protocolId = protocol.id;
  });

  afterAll(async () => {
    await db.delete(labeledCases).where(eq(labeledCases.clientId, clientId));
    await db.delete(stressProtocols).where(eq(stressProtocols.id, protocolId));
    await db.delete(assignmentCriteria).where(eq(assignmentCriteria.id, criteriaId));
    await db.delete(legalAcceptances).where(eq(legalAcceptances.clientId, clientId));
    await db.delete(clients).where(eq(clients.id, clientId));
    await db.delete(admins).where(eq(admins.id, adminId));
  });

  it('congela la regla vigente del protocolo (id + versión) al crear el caso', async () => {
    const createRes = await request(app)
      .post(`/api/admin/clients/${clientId}/labeled-cases`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ module: 'stress', protocol_id: protocolId, cycle_weeks: 6 });
    expect(createRes.status).toBe(201);
    const caseId = createRes.body.case.id;

    const detailRes = await request(app).get(`/api/admin/labeled-cases/${caseId}/detail`).set('Authorization', `Bearer ${adminToken}`);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.detail.criteriaName).toBe('Regla congelada de prueba');
    expect(detailRes.body.detail.criteriaVersion).toBe(2);
    // Sin consentimiento de investigación registrado todavía — null explícito, no false.
    expect(detailRes.body.detail.dataResearchConsent).toBeNull();
  });

  it('registrar el último checkpoint con una valoración fija la etiqueta final del caso sola', async () => {
    const createRes = await request(app)
      .post(`/api/admin/clients/${clientId}/labeled-cases`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ module: 'stress', protocol_id: protocolId, cycle_weeks: 6 });
    const caseId = createRes.body.case.id;

    const patchRes = await request(app)
      .patch(`/api/admin/labeled-cases/${caseId}/checkpoints/6`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'completado', valoracion: 'mejora_significativa', notes: 'Cambio sostenido.' });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.checkpoint.valoracion).toBe('mejora_significativa');

    const detailRes = await request(app).get(`/api/admin/labeled-cases/${caseId}/detail`).set('Authorization', `Bearer ${adminToken}`);
    expect(detailRes.body.detail.labeledCase.outcome).toBe('mejora_significativa');
    expect(detailRes.body.detail.labeledCase.closedAt).not.toBeNull();
  });

  it('marca un caso como "vencido" cuando un checkpoint pasado su fecha sigue pendiente, y lo excluye del CSV', async () => {
    const createRes = await request(app)
      .post(`/api/admin/clients/${clientId}/labeled-cases`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ module: 'stress', protocol_id: protocolId, cycle_weeks: 6 });
    const caseId = createRes.body.case.id;

    // Retrocede assignedAt 40 días — el checkpoint de semana 6 (42 días) NO
    // vence con esto (a propósito, ver siguiente): el de la asignación
    // original usa FOLLOWUP_WEEKS=[6,12] filtrado por cycleWeeks=6, así que
    // solo existe el checkpoint de semana 6 (42 días de plazo). Retrocedemos
    // 50 días para que sí esté vencido.
    await db.update(labeledCases).set({ assignedAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000) }).where(eq(labeledCases.id, caseId));

    const listRes = await request(app)
      .get(`/api/admin/labeled-cases/detailed?module=stress&status=vencido`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.cases.some((c: { id: string }) => c.id === caseId)).toBe(true);

    // Sin consentimiento de investigación autorizado, tampoco entra al CSV aunque se registrara el checkpoint.
    await db.insert(legalAcceptances).values({
      clientId, dataPolicyVersion: 'v1', termsVersion: 'v1', sensitiveDataConsent: true, dataResearchConsent: true, acceptedAt: new Date(),
    });
    await request(app)
      .patch(`/api/admin/labeled-cases/${caseId}/checkpoints/6`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'completado', valoracion: 'sin_cambio' });

    const csvRes = await request(app).get('/api/admin/labeled-cases/export.csv?module=stress').set('Authorization', `Bearer ${adminToken}`);
    expect(csvRes.status).toBe(200);
    expect(csvRes.text).toContain(`#${createRes.body.case.caseNumber}`);
  }, 20000);
});
