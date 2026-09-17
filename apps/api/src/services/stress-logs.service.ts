import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { stressCompletions, type StressCompletion } from '../models/schema.js';
import type { StressCompletionInput } from '@latribu/shared-types';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function listCompletions(clientId: string): Promise<StressCompletion[]> {
  return db.select().from(stressCompletions).where(eq(stressCompletions.clientId, clientId)).orderBy(desc(stressCompletions.completedDate));
}

export async function markCompletion(
  clientId: string,
  input: StressCompletionInput
): Promise<{ completion: StressCompletion; created: boolean }> {
  const date = today();
  const existing = await db
    .select()
    .from(stressCompletions)
    .where(and(eq(stressCompletions.clientId, clientId), eq(stressCompletions.completedDate, date)));
  if (existing[0]) return { completion: existing[0], created: false };

  const [completion] = await db
    .insert(stressCompletions)
    .values({ clientId, techniqueId: input.technique_id ?? null, completedDate: date })
    .returning();
  return { completion, created: true };
}
