import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../src/app.js';
import { db } from '../src/db/index.js';
import { admins, clients, legalAcceptances, wearableMetricas, regulationCapacityBaselines, regulationCapacityHistory } from '../src/models/schema.js';
import { hashPassword, signToken } from '../src/services/auth.service.js';
import { getCohortReport, listCohortMemberIds } from '../src/services/evolution-cohort.service.js';

describe('evolution cohort report (spec 28)', () => {
  const app = createApp();
  const suffix = Date.now();
  let adminId: string;
  let adminToken: string;
  let leaderId: string;
  let leaderToken: string;
  let consentedMemberId: string;
  let noConsentMemberId: string;

  beforeAll(async () => {
    const [admin] = await db.insert(admins).values({ name: 'Cohort Admin', email: `cohort-admin-${suffix}@example.com`, passwordHash: await hashPassword('x') }).returning();
    adminId = admin.id;
    adminToken = signToken({ id: adminId, role: 'admin', name: 'Cohort Admin', email: admin.email });

    const [leader] = await db
      .insert(clients)
      .values({ name: 'Leader', email: `cohort-leader-report-${suffix}@example.com`, passwordHash: 'x', clientType: 'mentoring', permissions: { reporteEquipo: true } })
      .returning();
    leaderId = leader.id;
    leaderToken = signToken({ id: leaderId, role: 'cliente', name: 'Leader', email: leader.email });

    const [consented] = await db
      .insert(clients)
      .values({ name: 'Consented Member', email: `cohort-member-a-${suffix}@example.com`, passwordHash: 'x', clientType: 'mentoring', cohortLeaderId: leaderId })
      .returning();
    consentedMemberId = consented.id;

    const [noConsent] = await db
      .insert(clients)
      .values({ name: 'No Consent Member', email: `cohort-member-b-${suffix}@example.com`, passwordHash: 'x', clientType: 'mentoring', cohortLeaderId: leaderId })
      .returning();
    noConsentMemberId = noConsent.id;

    await db.insert(legalAcceptances).values({
      clientId: consentedMemberId, dataPolicyVersion: 'v1', termsVersion: 'v1', sensitiveDataConsent: true,
      dataResearchConsent: true, acceptedAt: new Date(),
    });
    await db.insert(legalAcceptances).values({
      clientId: noConsentMemberId, dataPolicyVersion: 'v1', termsVersion: 'v1', sensitiveDataConsent: true,
      dataResearchConsent: false, acceptedAt: new Date(),
    });

    // Días recientes de recovery bajo el umbral (66) para el miembro con
    // consentimiento — el otro miembro no debe influir el reporte en absoluto.
    const today = new Date();
    for (let i = 0; i < 5; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      await db.insert(wearableMetricas).values({
        clientId: consentedMemberId, dispositivo: 'oura', fecha: d.toISOString().slice(0, 10), recoveryScore: 50,
      });
      await db.insert(wearableMetricas).values({
        clientId: noConsentMemberId, dispositivo: 'oura', fecha: d.toISOString().slice(0, 10), recoveryScore: 90,
      });
    }
  });

  afterAll(async () => {
    await db.delete(regulationCapacityHistory).where(eq(regulationCapacityHistory.clientId, consentedMemberId));
    await db.delete(regulationCapacityBaselines).where(eq(regulationCapacityBaselines.clientId, consentedMemberId));
    await db.delete(wearableMetricas).where(eq(wearableMetricas.clientId, consentedMemberId));
    await db.delete(wearableMetricas).where(eq(wearableMetricas.clientId, noConsentMemberId));
    await db.delete(legalAcceptances).where(eq(legalAcceptances.clientId, consentedMemberId));
    await db.delete(legalAcceptances).where(eq(legalAcceptances.clientId, noConsentMemberId));
    await db.delete(clients).where(eq(clients.id, consentedMemberId));
    await db.delete(clients).where(eq(clients.id, noConsentMemberId));
    await db.delete(clients).where(eq(clients.id, leaderId));
    await db.delete(admins).where(eq(admins.id, adminId));
  });

  it('lists only members whose cohortLeaderId points to the leader', async () => {
    const ids = await listCohortMemberIds(leaderId);
    expect(ids.sort()).toEqual([consentedMemberId, noConsentMemberId].sort());
  });

  it('excludes members without confirmed research consent from the aggregated report', async () => {
    const report = await getCohortReport(leaderId);
    expect(report.memberCount).toBe(1);
    expect(report.members).toHaveLength(1);
    // Nunca un nombre real — solo "Miembro N".
    expect(report.members[0].label).toBe('Miembro 1');
    expect(report.avgRecoveryScore).toBe(50);
  });

  it('serves the report over the API only when permissions.reporteEquipo is true', async () => {
    const res = await request(app).get(`/api/clients/${leaderId}/cohort-report`).set('Authorization', `Bearer ${leaderToken}`);
    expect(res.status).toBe(200);
    expect(res.body.report.memberCount).toBe(1);
  });

  // Verificación de seguridad explícita (spec 28/30): el backend nunca
  // confía en que el frontend oculte la pestaña — re-chequea el permiso
  // contra la base de datos incluso si alguien llama la URL directamente.
  it('returns 403 for a client without permissions.reporteEquipo, even calling the URL directly', async () => {
    const [unauthorized] = await db
      .insert(clients)
      .values({ name: 'No Access', email: `cohort-no-access-${suffix}@example.com`, passwordHash: 'x', clientType: 'mentoring' })
      .returning();
    const token = signToken({ id: unauthorized.id, role: 'cliente', name: 'No Access', email: unauthorized.email });

    const res = await request(app).get(`/api/clients/${unauthorized.id}/cohort-report`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);

    await db.delete(clients).where(eq(clients.id, unauthorized.id));
  });

  it('rejects a different client trying to read someone else\'s cohort report', async () => {
    const res = await request(app).get(`/api/clients/${leaderId}/cohort-report`).set('Authorization', `Bearer ${signToken({ id: consentedMemberId, role: 'cliente', name: 'x', email: 'x@example.com' })}`);
    expect(res.status).toBe(403);
  });

  // Regresión: la tendencia semanal de la cohorte usaba la lectura de
  // Capacidad de regulación del propio cliente, truncada a los 14 días de
  // su dashboard individual — con más historial que eso, atRiskByWeek/
  // avgRegulationByWeek quedaban cortados a ~2 semanas en vez de las 8
  // esperadas. Se sembraron 42 días (6 semanas) de historial para verificarlo.
  it('covers more than 2 weeks of regulation-capacity trend when more than 14 days of history exist', async () => {
    await db.insert(regulationCapacityBaselines).values({
      clientId: consentedMemberId, hrvAvg: 45, fcReposoAvg: 58, suenoScoreAvg: 75, daysUsed: 7,
    });
    const today = new Date();
    const rows = Array.from({ length: 42 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      return { clientId: consentedMemberId, fecha: d.toISOString().slice(0, 10), score: 80 };
    });
    await db.insert(regulationCapacityHistory).values(rows);

    const report = await getCohortReport(leaderId);
    expect(report.avgRegulationByWeek.length).toBeGreaterThan(2);
  }, 20000);
});
