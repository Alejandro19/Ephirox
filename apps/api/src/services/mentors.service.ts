import { eq, asc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { mentors, type Mentor } from '../models/schema.js';
import type { MentorInput } from '@latribu/shared-types';

export async function listMentors(): Promise<Mentor[]> {
  return db.select().from(mentors).orderBy(asc(mentors.name));
}

export async function listActiveMentors(): Promise<Mentor[]> {
  const rows = await listMentors();
  return rows.filter((m) => m.active);
}

export async function findMentorById(mentorId: string): Promise<Mentor | undefined> {
  const rows = await db.select().from(mentors).where(eq(mentors.id, mentorId)).limit(1);
  return rows[0];
}

export async function createMentor(input: MentorInput): Promise<Mentor> {
  const [mentor] = await db
    .insert(mentors)
    .values({ name: input.name, specialty: input.specialty ?? null, active: input.active ?? true })
    .returning();
  return mentor;
}

export async function updateMentor(mentorId: string, input: Partial<MentorInput>): Promise<Mentor | null> {
  const fields: Record<string, unknown> = {};
  if (input.name !== undefined) fields.name = input.name;
  if (input.specialty !== undefined) fields.specialty = input.specialty;
  if (input.active !== undefined) fields.active = input.active;
  const [mentor] = await db.update(mentors).set(fields).where(eq(mentors.id, mentorId)).returning();
  return mentor ?? null;
}

export async function deleteMentor(mentorId: string): Promise<void> {
  await db.delete(mentors).where(eq(mentors.id, mentorId));
}
