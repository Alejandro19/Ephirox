import { eq, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { therapists, type Therapist } from '../models/schema.js';
import { hashPassword } from './auth.service.js';

export async function findTherapistByEmail(email: string): Promise<Therapist | null> {
  const rows = await db.select().from(therapists).where(eq(therapists.email, email)).limit(1);
  return rows[0] ?? null;
}

export async function findTherapistById(id: string): Promise<Therapist | null> {
  const rows = await db.select().from(therapists).where(eq(therapists.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listTherapists(): Promise<Therapist[]> {
  return db.select().from(therapists).orderBy(desc(therapists.createdAt));
}

export async function createTherapist(input: { name: string; email: string; password: string; specialty?: string | null; phone?: string | null }): Promise<Therapist> {
  const passwordHash = await hashPassword(input.password);
  const [therapist] = await db
    .insert(therapists)
    // La contraseña que asigna el admin es siempre temporal — se obliga a
    // cambiarla en el primer login (ver authController.changePassword).
    .values({ name: input.name, email: input.email, passwordHash, specialty: input.specialty, phone: input.phone, mustChangePassword: true })
    .returning();
  return therapist;
}

export async function setTherapistActive(id: string, active: boolean): Promise<void> {
  await db.update(therapists).set({ active }).where(eq(therapists.id, id));
}

export async function updateTherapistPassword(id: string, passwordHash: string): Promise<void> {
  await db.update(therapists).set({ passwordHash, mustChangePassword: false }).where(eq(therapists.id, id));
}
