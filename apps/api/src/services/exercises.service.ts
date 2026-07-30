import { and, eq, asc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { exercises, clients, clientNotifications, type Exercise } from '../models/schema.js';
import type { ExerciseInput } from '@latribu/shared-types';

export async function listExercisesByClient(clientId: string): Promise<Exercise[]> {
  return db.select().from(exercises).where(eq(exercises.clientId, clientId)).orderBy(asc(exercises.sortOrder));
}

const MODULE_LABELS: Record<string, string> = {
  training: 'entrenamiento',
  nutrition: 'nutrición',
  supplementation: 'suplementación',
  cortisol: 'gestión de cortisol',
};

async function unlockModule(clientId: string, moduleKey: string): Promise<void> {
  const rows = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
  const client = rows[0];
  if (!client) return;
  const permissions = (client.permissions as Record<string, boolean>) || {};
  if (permissions[moduleKey] === true) return;
  await db
    .update(clients)
    .set({ permissions: { ...permissions, [moduleKey]: true } })
    .where(eq(clients.id, clientId));
  const label = MODULE_LABELS[moduleKey];
  if (label) {
    await db.insert(clientNotifications).values({ clientId, message: `Ahora tienes acceso a tu módulo de ${label}.` });
  }
}

function toExerciseFields(input: ExerciseInput) {
  return {
    title: input.title,
    dayNumber: input.day_number,
    category: input.category,
    series: input.series ?? null,
    reps: input.reps ?? null,
    duration: input.duration ?? null,
    restTime: input.rest_time ?? null,
    youtubeUrl: input.youtube_url ?? null,
    description: input.description ?? null,
    recommendations: input.recommendations ?? null,
  };
}

export async function createExercise(clientId: string, input: ExerciseInput): Promise<Exercise> {
  const siblings = await db
    .select()
    .from(exercises)
    .where(and(eq(exercises.clientId, clientId), eq(exercises.dayNumber, input.day_number), eq(exercises.category, input.category)));
  const nextSortOrder = siblings.reduce((max, ex) => Math.max(max, ex.sortOrder), -1) + 1;

  const [exercise] = await db
    .insert(exercises)
    .values({ clientId, ...toExerciseFields(input), sortOrder: nextSortOrder })
    .returning();

  await unlockModule(clientId, 'training');
  return exercise;
}

export async function updateExercise(exerciseId: string, input: ExerciseInput): Promise<Exercise | null> {
  const [exercise] = await db
    .update(exercises)
    .set({ ...toExerciseFields(input), updatedAt: new Date() })
    .where(eq(exercises.id, exerciseId))
    .returning();
  return exercise ?? null;
}

export async function deleteExercise(exerciseId: string): Promise<void> {
  await db.delete(exercises).where(eq(exercises.id, exerciseId));
}

export async function findExerciseById(exerciseId: string): Promise<Exercise | undefined> {
  const rows = await db.select().from(exercises).where(eq(exercises.id, exerciseId)).limit(1);
  return rows[0];
}

async function siblingsOf(exercise: Exercise): Promise<Exercise[]> {
  return db
    .select()
    .from(exercises)
    .where(and(eq(exercises.clientId, exercise.clientId), eq(exercises.dayNumber, exercise.dayNumber), eq(exercises.category, exercise.category)))
    .orderBy(asc(exercises.sortOrder));
}

export async function reorderExercise(exerciseId: string, direction: 'up' | 'down'): Promise<Exercise[]> {
  const current = await findExerciseById(exerciseId);
  if (!current) return [];
  const siblings = await siblingsOf(current);

  const index = siblings.findIndex((ex) => ex.id === exerciseId);
  const neighborIndex = direction === 'up' ? index - 1 : index + 1;
  if (index === -1 || neighborIndex < 0 || neighborIndex >= siblings.length) return siblings;

  const neighbor = siblings[neighborIndex];
  await db.update(exercises).set({ sortOrder: neighbor.sortOrder }).where(eq(exercises.id, current.id));
  await db.update(exercises).set({ sortOrder: current.sortOrder }).where(eq(exercises.id, neighbor.id));

  return siblingsOf(current);
}
