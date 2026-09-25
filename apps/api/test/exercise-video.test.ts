import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../src/app.js';
import { db } from '../src/db/index.js';
import { clients, exercises } from '../src/models/schema.js';
import { signToken } from '../src/services/auth.service.js';
import { validateExerciseVideo, ExerciseVideoError } from '../src/services/exercise-video.js';
import { EXERCISE_VIDEO_MAX_BYTES } from '@latribu/shared-types';

// Cabeceras mínimas reales de cada contenedor (no un video reproducible,
// suficiente para la validación de firma).
const MP4_BYTES = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypmp42'), Buffer.alloc(32)]);
const WEBM_BYTES = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(32)]);

describe('validateExerciseVideo (reglas de formato y peso)', () => {
  it('acepta un MP4 y un WebM con firma válida', () => {
    expect(() => validateExerciseVideo({ buffer: MP4_BYTES, mimetype: 'video/mp4' })).not.toThrow();
    expect(() => validateExerciseVideo({ buffer: WEBM_BYTES, mimetype: 'video/webm' })).not.toThrow();
  });

  it('rechaza formatos que no son MP4/WebM', () => {
    expect(() => validateExerciseVideo({ buffer: MP4_BYTES, mimetype: 'video/quicktime' })).toThrow(ExerciseVideoError);
    expect(() => validateExerciseVideo({ buffer: MP4_BYTES, mimetype: 'application/pdf' })).toThrow(/MP4 o WebM/);
  });

  it('rechaza un archivo con mimetype de video pero contenido que no lo es', () => {
    expect(() => validateExerciseVideo({ buffer: Buffer.from('esto no es un video, solo texto plano'), mimetype: 'video/mp4' })).toThrow(/válido/);
    expect(() => validateExerciseVideo({ buffer: MP4_BYTES, mimetype: 'video/webm' })).toThrow(/válido/);
  });

  it('rechaza un video que supera el peso máximo', () => {
    const big = Buffer.concat([MP4_BYTES, Buffer.alloc(EXERCISE_VIDEO_MAX_BYTES)]);
    expect(() => validateExerciseVideo({ buffer: big, mimetype: 'video/mp4' })).toThrow(/30 MB/);
  });
});

describe('exercise video routes', () => {
  const app = createApp();
  const adminToken = signToken({ id: 'admin-1', role: 'admin', name: 'Admin', email: 'admin@example.com' });
  let clientId: string;
  let otherClientId: string;
  let exerciseId: string;
  let clientToken: string;

  beforeAll(async () => {
    const [client] = await db.insert(clients).values({ name: 'Video Client', email: `exvideo-${Date.now()}@example.com`, passwordHash: 'x' }).returning();
    clientId = client.id;
    clientToken = signToken({ id: clientId, role: 'cliente', name: client.name, email: client.email });
    const [other] = await db.insert(clients).values({ name: 'Other Video Client', email: `exvideo-o-${Date.now()}@example.com`, passwordHash: 'x' }).returning();
    otherClientId = other.id;
    const [ex] = await db.insert(exercises).values({ clientId, title: 'Sentadilla', dayNumber: 1, category: 'strength' }).returning();
    exerciseId = ex.id;
  }, 30000);

  afterAll(async () => {
    await request(app).delete(`/api/clients/${clientId}/exercises/${exerciseId}/video`).set('Authorization', `Bearer ${adminToken}`);
    await db.delete(clients).where(eq(clients.id, clientId));
    await db.delete(clients).where(eq(clients.id, otherClientId));
  });

  it('uploads a valid mp4, stores its url/name and clears any YouTube link', async () => {
    await db.update(exercises).set({ youtubeUrl: 'https://youtube.com/watch?v=abc' }).where(eq(exercises.id, exerciseId));
    const res = await request(app)
      .post(`/api/clients/${clientId}/exercises/${exerciseId}/video`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('video', MP4_BYTES, { filename: 'sentadilla.mp4', contentType: 'video/mp4' });
    expect(res.status).toBe(200);
    expect(res.body.exercise.videoUrl).toMatch(/^https?:\/\//);
    expect(res.body.exercise.videoName).toBe('sentadilla.mp4');
    expect(res.body.exercise.youtubeUrl).toBeNull();
  }, 30000);

  it('setting a YouTube link afterwards replaces the uploaded video', async () => {
    const res = await request(app)
      .put(`/api/clients/${clientId}/exercises/${exerciseId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Sentadilla', day_number: 1, category: 'strength', youtube_url: 'https://youtube.com/watch?v=xyz' });
    expect(res.status).toBe(200);
    expect(res.body.exercise.youtubeUrl).toBe('https://youtube.com/watch?v=xyz');
    expect(res.body.exercise.videoUrl).toBeNull();
    expect(res.body.exercise.videoName).toBeNull();
  }, 30000);

  it('rejects a disallowed format with a clear 400', async () => {
    const res = await request(app)
      .post(`/api/clients/${clientId}/exercises/${exerciseId}/video`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('video', Buffer.from('%PDF-1.4'), { filename: 'doc.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/MP4 o WebM/);
  });

  it('rejects a file over the size limit with 413', async () => {
    const big = Buffer.concat([MP4_BYTES, Buffer.alloc(EXERCISE_VIDEO_MAX_BYTES)]);
    const res = await request(app)
      .post(`/api/clients/${clientId}/exercises/${exerciseId}/video`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('video', big, { filename: 'grande.mp4', contentType: 'video/mp4' });
    expect(res.status).toBe(413);
    expect(res.body.error).toMatch(/30 MB/);
  }, 60000);

  it('does not let an exercise be modified through another client\'s URL', async () => {
    const res = await request(app)
      .post(`/api/clients/${otherClientId}/exercises/${exerciseId}/video`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('video', MP4_BYTES, { filename: 'x.mp4', contentType: 'video/mp4' });
    expect(res.status).toBe(404);
  });

  it('is admin-only', async () => {
    const res = await request(app)
      .post(`/api/clients/${clientId}/exercises/${exerciseId}/video`)
      .set('Authorization', `Bearer ${clientToken}`)
      .attach('video', MP4_BYTES, { filename: 'x.mp4', contentType: 'video/mp4' });
    expect(res.status).toBe(403);
  });
});
