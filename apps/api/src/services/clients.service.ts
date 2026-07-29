import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { clients, type Client } from '../models/schema.js';

export async function findClientByEmail(email: string): Promise<Client | null> {
  const rows = await db.select().from(clients).where(eq(clients.email, email)).limit(1);
  return rows[0] ?? null;
}

export async function findClientById(id: string): Promise<Client | null> {
  const rows = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return rows[0] ?? null;
}
