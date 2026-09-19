import { eq, asc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { stressProtocols, stressProtocolResources, type StressProtocol, type StressProtocolResource } from '../models/schema.js';
import { uploadFile, deleteFile } from '../storage/index.js';
import type { StressProtocolInput, StressProtocolResourceInput } from '@latribu/shared-types';

const STORAGE_PREFIX = 'stress-protocols';

export async function listAllProtocols(): Promise<StressProtocol[]> {
  return db.select().from(stressProtocols).orderBy(asc(stressProtocols.sortOrder), asc(stressProtocols.createdAt));
}

export async function listPublishedProtocols(): Promise<StressProtocol[]> {
  const rows = await db.select().from(stressProtocols).orderBy(asc(stressProtocols.sortOrder), asc(stressProtocols.createdAt));
  return rows.filter((p) => p.status === 'publicado');
}

export async function findProtocolById(protocolId: string): Promise<StressProtocol | undefined> {
  const rows = await db.select().from(stressProtocols).where(eq(stressProtocols.id, protocolId)).limit(1);
  return rows[0];
}

export async function listResourcesForProtocol(protocolId: string): Promise<StressProtocolResource[]> {
  return db
    .select()
    .from(stressProtocolResources)
    .where(eq(stressProtocolResources.protocolId, protocolId))
    .orderBy(asc(stressProtocolResources.sortOrder), asc(stressProtocolResources.createdAt));
}

export async function createProtocol(input: StressProtocolInput, createdBy: string | null): Promise<StressProtocol> {
  const [protocol] = await db
    .insert(stressProtocols)
    .values({
      name: input.name,
      mechanism: input.mechanism ?? null,
      status: input.status ?? 'borrador',
      sortOrder: input.sort_order ?? 0,
      suggestedFrequency: input.suggested_frequency ?? null,
      defaultCycleWeeks: input.default_cycle_weeks ?? 12,
      createdBy,
    })
    .returning();
  return protocol;
}

export async function updateProtocol(protocolId: string, input: Partial<StressProtocolInput>): Promise<StressProtocol | null> {
  const fields: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name !== undefined) fields.name = input.name;
  if (input.mechanism !== undefined) fields.mechanism = input.mechanism;
  if (input.status !== undefined) fields.status = input.status;
  if (input.sort_order !== undefined) fields.sortOrder = input.sort_order;
  if (input.criteria_id !== undefined) fields.criteriaId = input.criteria_id;
  if (input.suggested_frequency !== undefined) fields.suggestedFrequency = input.suggested_frequency;
  if (input.default_cycle_weeks !== undefined) fields.defaultCycleWeeks = input.default_cycle_weeks;
  const [protocol] = await db.update(stressProtocols).set(fields).where(eq(stressProtocols.id, protocolId)).returning();
  return protocol ?? null;
}

// Los recursos se borran en cascada (ON DELETE CASCADE) — pero sus archivos
// en Supabase Storage no, así que hay que limpiarlos a mano antes de borrar
// la fila del protocolo (mismo criterio best-effort que deleteFile ya usa).
export async function deleteProtocol(protocolId: string): Promise<void> {
  const resources = await listResourcesForProtocol(protocolId);
  await db.delete(stressProtocols).where(eq(stressProtocols.id, protocolId));
  for (const r of resources) {
    if (r.audioUrl) await deleteFile(r.audioUrl);
    if (r.videoUrl) await deleteFile(r.videoUrl);
  }
}

function toResourceFields(input: StressProtocolResourceInput) {
  return {
    type: input.type,
    title: input.title,
    durationMinutes: input.duration_minutes ?? null,
    durationSeconds: input.duration_seconds ?? null,
    instructions: input.instructions ?? null,
    youtubeUrl: input.youtube_url ?? null,
    sortOrder: input.sort_order ?? 0,
  };
}

export async function createResource(protocolId: string, input: StressProtocolResourceInput): Promise<StressProtocolResource> {
  const [resource] = await db
    .insert(stressProtocolResources)
    .values({ protocolId, ...toResourceFields(input) })
    .returning();
  return resource;
}

export async function findResourceById(resourceId: string): Promise<StressProtocolResource | undefined> {
  const rows = await db.select().from(stressProtocolResources).where(eq(stressProtocolResources.id, resourceId)).limit(1);
  return rows[0];
}

// Acepta audio_url/video_url: null como señal explícita de "quitar el
// archivo adjunto" — mismo patrón que stress-techniques.service.ts::updateTechnique.
export async function updateResource(
  resourceId: string,
  input: Partial<StressProtocolResourceInput> & { audio_url?: null; video_url?: null }
): Promise<StressProtocolResource | null> {
  const fields: Record<string, unknown> = {};
  if (input.type !== undefined) fields.type = input.type;
  if (input.title !== undefined) fields.title = input.title;
  if (input.duration_minutes !== undefined) fields.durationMinutes = input.duration_minutes;
  if (input.duration_seconds !== undefined) fields.durationSeconds = input.duration_seconds;
  if (input.instructions !== undefined) fields.instructions = input.instructions;
  if (input.youtube_url !== undefined) fields.youtubeUrl = input.youtube_url;
  if (input.sort_order !== undefined) fields.sortOrder = input.sort_order;

  const existing = await findResourceById(resourceId);
  if (input.audio_url === null) {
    if (existing?.audioUrl) await deleteFile(existing.audioUrl);
    fields.audioUrl = null;
    fields.audioName = null;
  }
  if (input.video_url === null) {
    if (existing?.videoUrl) await deleteFile(existing.videoUrl);
    fields.videoUrl = null;
    fields.videoName = null;
  }

  const [resource] = await db.update(stressProtocolResources).set(fields).where(eq(stressProtocolResources.id, resourceId)).returning();
  return resource ?? null;
}

export async function deleteResource(resourceId: string): Promise<void> {
  const existing = await findResourceById(resourceId);
  await db.delete(stressProtocolResources).where(eq(stressProtocolResources.id, resourceId));
  if (existing?.audioUrl) await deleteFile(existing.audioUrl);
  if (existing?.videoUrl) await deleteFile(existing.videoUrl);
}

export async function uploadResourceAudio(
  resourceId: string,
  file: { buffer: Buffer; mimetype: string; originalname: string }
): Promise<StressProtocolResource | null> {
  const existing = await findResourceById(resourceId);
  if (!existing) return null;
  const audioUrl = await uploadFile(STORAGE_PREFIX, file.buffer, file.mimetype, file.originalname);
  const [resource] = await db
    .update(stressProtocolResources)
    .set({ audioUrl, audioName: file.originalname })
    .where(eq(stressProtocolResources.id, resourceId))
    .returning();
  if (existing.audioUrl) await deleteFile(existing.audioUrl);
  return resource;
}

export async function uploadResourceVideo(
  resourceId: string,
  file: { buffer: Buffer; mimetype: string; originalname: string }
): Promise<StressProtocolResource | null> {
  const existing = await findResourceById(resourceId);
  if (!existing) return null;
  const videoUrl = await uploadFile(STORAGE_PREFIX, file.buffer, file.mimetype, file.originalname);
  const [resource] = await db
    .update(stressProtocolResources)
    .set({ videoUrl, videoName: file.originalname })
    .where(eq(stressProtocolResources.id, resourceId))
    .returning();
  if (existing.videoUrl) await deleteFile(existing.videoUrl);
  return resource;
}
