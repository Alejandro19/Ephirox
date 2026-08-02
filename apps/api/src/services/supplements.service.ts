import { eq, and, asc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { supplements, clients, clientNotifications, type Supplement } from '../models/schema.js';
import type { SupplementInput } from '@latribu/shared-types';

async function unlockModule(clientId: string): Promise<void> {
  const rows = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
  const client = rows[0];
  if (!client) return;
  const permissions = (client.permissions as Record<string, boolean>) || {};
  if (permissions.supplementation === true) return;
  await db.update(clients).set({ permissions: { ...permissions, supplementation: true } }).where(eq(clients.id, clientId));
  await db.insert(clientNotifications).values({ clientId, message: 'Ahora tienes acceso a tu módulo de suplementación.' });
}

export async function listSupplements(clientId: string): Promise<Supplement[]> {
  return db.select().from(supplements).where(eq(supplements.clientId, clientId)).orderBy(asc(supplements.sortOrder));
}

export async function createSupplement(clientId: string, input: SupplementInput): Promise<Supplement | null> {
  const existing = await db
    .select()
    .from(supplements)
    .where(and(eq(supplements.clientId, clientId), eq(supplements.name, input.name)));
  if (existing.length > 0) return null;

  const [supplement] = await db.insert(supplements).values({ clientId, ...input }).returning();
  await unlockModule(clientId);
  return supplement;
}

export async function updateSupplement(suppId: string, input: SupplementInput): Promise<Supplement | null> {
  const [supplement] = await db.update(supplements).set({ ...input, updatedAt: new Date() }).where(eq(supplements.id, suppId)).returning();
  return supplement ?? null;
}

export async function deleteSupplement(suppId: string): Promise<void> {
  await db.delete(supplements).where(eq(supplements.id, suppId));
}
