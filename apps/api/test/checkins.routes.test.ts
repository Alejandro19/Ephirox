import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../src/app.js';
import { db } from '../src/db/index.js';
import { clients, dailyCheckins, weeklyReflections } from '../src/models/schema.js';
import { signToken } from '../src/services/auth.service.js';

describe('checkins routes (pulso diario + reflexión semanal — exclusivo Mentoría)', () => {
  const app = createApp();
  const adminToken = signToken({ id: 'admin-1', role: 'admin', name: 'Admin', email: 'admin@example.com' });

  let mentoringClientId: string;
  let mentoringClientToken: string;
  let presencialClientId: string;
  let presencialClientToken: string;

  beforeAll(async () => {
    const [mentoringClient] = await db
      .insert(clients)
      .values({ name: 'Mentoring Client', email: `checkins-mentoring-${Date.now()}@example.com`, status: 'active', clientType: 'mentoring' })
      .returning();
    mentoringClientId = mentoringClient.id;
    mentoringClientToken = signToken({ id: mentoringClientId, role: 'cliente', name: mentoringClient.name, email: mentoringClient.email, clientType: 'mentoring' });

    const [presencialClient] = await db
      .insert(clients)
      .values({ name: 'Presencial Client', email: `checkins-presencial-${Date.now()}@example.com`, status: 'active', clientType: 'coaching_1_1' })
      .returning();
    presencialClientId = presencialClient.id;
    presencialClientToken = signToken({ id: presencialClientId, role: 'cliente', name: presencialClient.name, email: presencialClient.email, clientType: 'coaching_1_1' });
  });

  afterAll(async () => {
    await db.delete(dailyCheckins).where(eq(dailyCheckins.clientId, mentoringClientId));
    await db.delete(weeklyReflections).where(eq(weeklyReflections.clientId, mentoringClientId));
    await db.delete(clients).where(eq(clients.id, mentoringClientId));
    await db.delete(clients).where(eq(clients.id, presencialClientId));
  });

  it('bloquea (403) a un cliente Presencial en cualquier ruta de check-ins', async () => {
    const status = await request(app).get(`/api/clients/${presencialClientId}/checkins-status`).set('Authorization', `Bearer ${presencialClientToken}`);
    expect(status.status).toBe(403);
    const post = await request(app).post(`/api/clients/${presencialClientId}/daily-checkin`).set('Authorization', `Bearer ${presencialClientToken}`).send({ pulsoAnimo: 3 });
    expect(post.status).toBe(403);
  });

  it('un cliente Mentoría sin check-in hoy ve dailyDoneToday=false y weeklyDueThisWeek=true', async () => {
    const res = await request(app).get(`/api/clients/${mentoringClientId}/checkins-status`).set('Authorization', `Bearer ${mentoringClientToken}`);
    expect(res.status).toBe(200);
    expect(res.body.dailyDoneToday).toBe(false);
    expect(res.body.weeklyDueThisWeek).toBe(true);
    expect(res.body.lastResponseAt).toBeNull();
  });

  it('registra el pulso diario y el status refleja dailyDoneToday=true', async () => {
    const post = await request(app).post(`/api/clients/${mentoringClientId}/daily-checkin`).set('Authorization', `Bearer ${mentoringClientToken}`).send({ pulsoAnimo: 4 });
    expect(post.status).toBe(200);
    expect(post.body.checkin.pulsoAnimo).toBe(4);

    const status = await request(app).get(`/api/clients/${mentoringClientId}/checkins-status`).set('Authorization', `Bearer ${mentoringClientToken}`);
    expect(status.body.dailyDoneToday).toBe(true);
    expect(status.body.lastResponseAt).not.toBeNull();
  });

  it('el pulso diario es idempotente por día — un segundo POST el mismo día actualiza, no duplica', async () => {
    await request(app).post(`/api/clients/${mentoringClientId}/daily-checkin`).set('Authorization', `Bearer ${mentoringClientToken}`).send({ pulsoAnimo: 2 });
    const rows = await db.select().from(dailyCheckins).where(eq(dailyCheckins.clientId, mentoringClientId));
    expect(rows).toHaveLength(1);
    expect(rows[0].pulsoAnimo).toBe(2);
  });

  it('rechaza un pulso fuera de rango (1-5)', async () => {
    const res = await request(app).post(`/api/clients/${mentoringClientId}/daily-checkin`).set('Authorization', `Bearer ${mentoringClientToken}`).send({ pulsoAnimo: 7 });
    expect(res.status).toBe(400);
  });

  it('registra la reflexión semanal y el status refleja weeklyDueThisWeek=false', async () => {
    const post = await request(app)
      .post(`/api/clients/${mentoringClientId}/weekly-reflection`)
      .set('Authorization', `Bearer ${mentoringClientToken}`)
      .send({ estresCronico: 6, tecnicasManejoUsadas: 'Respiración', despertaresNocturnosSemana: '1-2' });
    expect(post.status).toBe(200);
    expect(post.body.reflection.estresCronico).toBe(6);

    const status = await request(app).get(`/api/clients/${mentoringClientId}/checkins-status`).set('Authorization', `Bearer ${mentoringClientToken}`);
    expect(status.body.weeklyDueThisWeek).toBe(false);
  });

  it('la reflexión semanal es idempotente por semana — un segundo POST la misma semana actualiza, no duplica', async () => {
    await request(app).post(`/api/clients/${mentoringClientId}/weekly-reflection`).set('Authorization', `Bearer ${mentoringClientToken}`).send({ estresCronico: 3 });
    const rows = await db.select().from(weeklyReflections).where(eq(weeklyReflections.clientId, mentoringClientId));
    expect(rows).toHaveLength(1);
    expect(rows[0].estresCronico).toBe(3);
  });

  it('permite a un admin consultar el status de un cliente Mentoría', async () => {
    const res = await request(app).get(`/api/clients/${mentoringClientId}/checkins-status`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});
