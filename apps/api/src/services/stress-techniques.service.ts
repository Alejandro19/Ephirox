import { eq, asc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { stressTechniques, clients, clientNotifications, type StressTechnique } from '../models/schema.js';
import { uploadFile, deleteFile } from '../storage/index.js';
import type { StressTechniqueInput } from '@latribu/shared-types';

async function unlockModule(clientId: string): Promise<void> {
  const rows = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
  const client = rows[0];
  if (!client) return;
  const permissions = (client.permissions as Record<string, boolean>) || {};
  if (permissions.stress === true) return;
  await db.update(clients).set({ permissions: { ...permissions, stress: true } }).where(eq(clients.id, clientId));
  await db.insert(clientNotifications).values({ clientId, message: 'Ahora tienes acceso a tu módulo de Stress.' });
}

function toTechniqueFields(input: StressTechniqueInput) {
  return {
    title: input.title,
    type: input.type ?? null,
    duration: input.duration ?? null,
    durationMinutes: input.duration_minutes ?? null,
    durationSeconds: input.duration_seconds ?? null,
    description: input.description ?? null,
    youtubeUrl: input.youtube_url ?? null,
    emotion: input.emotion ?? null,
    precautionNote: input.precaution_note ?? null,
    // Omitido (no `?? false`) cuando no viene en el input: en create() la
    // columna cae a su default (false); en update() de un PATCH parcial,
    // `?? false` habría apagado el flag de ritual cada vez que se edita
    // cualquier otro campo sin volver a marcar el checkbox.
    ...(input.is_ritual !== undefined ? { isRitual: input.is_ritual } : {}),
  };
}

export async function listTechniques(clientId: string): Promise<StressTechnique[]> {
  return db.select().from(stressTechniques).where(eq(stressTechniques.clientId, clientId)).orderBy(asc(stressTechniques.sortOrder));
}

export async function createTechnique(clientId: string, input: StressTechniqueInput): Promise<StressTechnique> {
  const [technique] = await db.insert(stressTechniques).values({ clientId, ...toTechniqueFields(input) }).returning();
  await unlockModule(clientId);
  return technique;
}

export async function findTechniqueById(techId: string): Promise<StressTechnique | undefined> {
  const rows = await db.select().from(stressTechniques).where(eq(stressTechniques.id, techId)).limit(1);
  return rows[0];
}

export async function updateTechnique(
  techId: string,
  input: StressTechniqueInput & { audio_url?: null }
): Promise<StressTechnique | null> {
  const fields: Record<string, unknown> = toTechniqueFields(input);
  if (input.audio_url === null) {
    const existing = await findTechniqueById(techId);
    if (existing?.audioUrl) await deleteFile(existing.audioUrl);
    fields.audioUrl = null;
    fields.audioName = null;
  }
  const [technique] = await db.update(stressTechniques).set(fields).where(eq(stressTechniques.id, techId)).returning();
  return technique ?? null;
}

export async function deleteTechnique(techId: string): Promise<void> {
  const existing = await findTechniqueById(techId);
  await db.delete(stressTechniques).where(eq(stressTechniques.id, techId));
  if (existing?.audioUrl) await deleteFile(existing.audioUrl);
}

export async function uploadVideo(
  techId: string,
  file: { buffer: Buffer; mimetype: string; originalname: string }
): Promise<StressTechnique | null> {
  const existing = await findTechniqueById(techId);
  if (!existing) return null;
  const videoUrl = await uploadFile(`${existing.clientId}/stress`, file.buffer, file.mimetype, file.originalname);
  const [technique] = await db
    .update(stressTechniques)
    .set({ videoUrl, videoName: file.originalname })
    .where(eq(stressTechniques.id, techId))
    .returning();
  return technique;
}

export async function uploadAudio(
  techId: string,
  file: { buffer: Buffer; mimetype: string; originalname: string }
): Promise<StressTechnique | null> {
  const existing = await findTechniqueById(techId);
  if (!existing) return null;
  const audioUrl = await uploadFile(`${existing.clientId}/stress`, file.buffer, file.mimetype, file.originalname);
  const [technique] = await db
    .update(stressTechniques)
    .set({ audioUrl, audioName: file.originalname })
    .where(eq(stressTechniques.id, techId))
    .returning();
  if (existing.audioUrl) await deleteFile(existing.audioUrl);
  return technique;
}
