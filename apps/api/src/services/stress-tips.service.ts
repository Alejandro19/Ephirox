import { eq, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { stressTips, type StressTip } from '../models/schema.js';
import type { StressTipUpdate } from '@latribu/shared-types';

export async function listTips(): Promise<StressTip[]> {
  return db.select().from(stressTips).orderBy(desc(stressTips.createdAt));
}

export async function createTip(content: string): Promise<StressTip> {
  const [tip] = await db.insert(stressTips).values({ content }).returning();
  return tip;
}

export async function updateTip(id: string, patch: StressTipUpdate): Promise<StressTip | null> {
  const [tip] = await db.update(stressTips).set(patch).where(eq(stressTips.id, id)).returning();
  return tip ?? null;
}

export async function deleteTip(id: string): Promise<void> {
  await db.delete(stressTips).where(eq(stressTips.id, id));
}

export async function getTipOfTheDay(): Promise<StressTip | null> {
  const pool = await db.select().from(stressTips).where(eq(stressTips.active, true));
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
