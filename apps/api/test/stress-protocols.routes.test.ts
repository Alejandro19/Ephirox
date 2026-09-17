import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../src/app.js';
import { db } from '../src/db/index.js';
import { clients, admins, stressProtocols } from '../src/models/schema.js';
import { hashPassword, signToken } from '../src/services/auth.service.js';

describe('stress protocols routes (Fase 2 — librería reutilizable)', () => {
  const app = createApp();
  let adminToken: string;
  let adminId: string;
  let clientId: string;
  let clientToken: string;

  beforeAll(async () => {
    const adminEmail = `stress-protocols-admin-${Date.now()}@example.com`;
    const [admin] = await db
      .insert(admins)
      .values({ name: 'Protocols Admin', email: adminEmail, passwordHash: await hashPassword('x') })
      .returning();
    adminId = admin.id;
    adminToken = signToken({ id: adminId, role: 'admin', name: 'Protocols Admin', email: adminEmail });

    const [client] = await db
      .insert(clients)
      .values({ name: 'Protocol Client', email: `stress-protocols-${Date.now()}@example.com`, status: 'active', clientType: 'coaching_1_1' })
      .returning();
    clientId = client.id;
    clientToken = signToken({ id: clientId, role: 'cliente', name: client.name, email: client.email });
  });

  afterAll(async () => {
    await db.delete(clients).where(eq(clients.id, clientId));
    await db.delete(admins).where(eq(admins.id, adminId));
  });

  async function createProtocol(overrides: Record<string, unknown> = {}) {
    const res = await request(app)
      .post('/api/admin/stress-protocols')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Recuperación Vagal — Nivel 1', mechanism: 'Respiración', ...overrides });
    return res;
  }

  it('rejects a client from creating a protocol (admin-only)', async () => {
    const res = await request(app)
      .post('/api/admin/stress-protocols')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ name: 'Intento de cliente' });
    expect(res.status).toBe(403);
  });

  it('admin creates a protocol, defaults to borrador, and it appears in the library', async () => {
    const createRes = await createProtocol();
    expect(createRes.status).toBe(201);
    expect(createRes.body.protocol.name).toBe('Recuperación Vagal — Nivel 1');
    expect(createRes.body.protocol.status).toBe('borrador');

    const listRes = await request(app).get('/api/admin/stress-protocols').set('Authorization', `Bearer ${adminToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.protocols.some((p: { id: string }) => p.id === createRes.body.protocol.id)).toBe(true);

    await db.delete(stressProtocols).where(eq(stressProtocols.id, createRes.body.protocol.id));
  });

  it('publishes a protocol via PATCH status transition', async () => {
    const createRes = await createProtocol();
    const protocolId = createRes.body.protocol.id;

    const patchRes = await request(app)
      .patch(`/api/admin/stress-protocols/${protocolId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'publicado' });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.protocol.status).toBe('publicado');

    await db.delete(stressProtocols).where(eq(stressProtocols.id, protocolId));
  });

  it('adds resources of the 4 spec types to a protocol, and reads them back via GET with resources', async () => {
    const createRes = await createProtocol();
    const protocolId = createRes.body.protocol.id;

    const r1 = await request(app)
      .post(`/api/admin/stress-protocols/${protocolId}/resources`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'Técnica de respiración', title: 'Respiración 4-7-8', duration_minutes: 3, instructions: 'Inhala 4s, sostén 7s, exhala 8s.' });
    expect(r1.status).toBe(201);
    expect(r1.body.resource.type).toBe('Técnica de respiración');

    const r2 = await request(app)
      .post(`/api/admin/stress-protocols/${protocolId}/resources`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'Meditación guiada', title: 'Calma nocturna', duration_minutes: 8 });
    expect(r2.status).toBe(201);

    const getRes = await request(app).get(`/api/admin/stress-protocols/${protocolId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.resources).toHaveLength(2);
    expect(getRes.body.resources.map((r: { title: string }) => r.title)).toEqual(
      expect.arrayContaining(['Respiración 4-7-8', 'Calma nocturna'])
    );

    await db.delete(stressProtocols).where(eq(stressProtocols.id, protocolId));
  });

  it('uploads audio to a resource, then replacing it stores a different URL', async () => {
    const createRes = await createProtocol();
    const protocolId = createRes.body.protocol.id;
    const resourceRes = await request(app)
      .post(`/api/admin/stress-protocols/${protocolId}/resources`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'Meditación guiada', title: 'Con audio' });
    const resourceId = resourceRes.body.resource.id;

    const firstUpload = await request(app)
      .post(`/api/admin/stress-protocols/${protocolId}/resources/${resourceId}/upload-audio`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('audio', Buffer.from('fake-audio-bytes-1'), 'first.mp3');
    expect(firstUpload.status).toBe(200);
    expect(firstUpload.body.resource.audioName).toBe('first.mp3');
    const firstAudioUrl = firstUpload.body.resource.audioUrl;

    const secondUpload = await request(app)
      .post(`/api/admin/stress-protocols/${protocolId}/resources/${resourceId}/upload-audio`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('audio', Buffer.from('fake-audio-bytes-2'), 'second.mp3');
    expect(secondUpload.status).toBe(200);
    expect(secondUpload.body.resource.audioUrl).not.toBe(firstAudioUrl);

    await db.delete(stressProtocols).where(eq(stressProtocols.id, protocolId));
  });

  it('PATCH with audio_url: null clears the audio field on a resource', async () => {
    const createRes = await createProtocol();
    const protocolId = createRes.body.protocol.id;
    const resourceRes = await request(app)
      .post(`/api/admin/stress-protocols/${protocolId}/resources`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'Meditación guiada', title: 'Para limpiar audio' });
    const resourceId = resourceRes.body.resource.id;
    await request(app)
      .post(`/api/admin/stress-protocols/${protocolId}/resources/${resourceId}/upload-audio`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('audio', Buffer.from('fake-audio-bytes'), 'clip.mp3');

    const clearRes = await request(app)
      .patch(`/api/admin/stress-protocols/${protocolId}/resources/${resourceId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ audio_url: null });
    expect(clearRes.status).toBe(200);
    expect(clearRes.body.resource.audioUrl).toBeNull();

    await db.delete(stressProtocols).where(eq(stressProtocols.id, protocolId));
  });

  it('deletes a resource, and deletes a whole protocol cascading its resources', async () => {
    const createRes = await createProtocol();
    const protocolId = createRes.body.protocol.id;
    const r1 = await request(app)
      .post(`/api/admin/stress-protocols/${protocolId}/resources`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'Journal de descarga', title: 'Para borrar' });
    const resourceId = r1.body.resource.id;

    const deleteResourceRes = await request(app)
      .delete(`/api/admin/stress-protocols/${protocolId}/resources/${resourceId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deleteResourceRes.status).toBe(200);

    const deleteProtocolRes = await request(app)
      .delete(`/api/admin/stress-protocols/${protocolId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deleteProtocolRes.status).toBe(200);

    const getRes = await request(app).get(`/api/admin/stress-protocols/${protocolId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(getRes.status).toBe(404);
  });
});
