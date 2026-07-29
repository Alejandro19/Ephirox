import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { clients, adminNotifications, type Client } from '../models/schema.js';
import { hashPassword } from './auth.service.js';

export async function findClientByEmail(email: string): Promise<Client | null> {
  const rows = await db.select().from(clients).where(eq(clients.email, email)).limit(1);
  return rows[0] ?? null;
}

export async function findClientById(id: string): Promise<Client | null> {
  const rows = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createInactiveClient(input: { name: string; email: string; password?: string; googleId?: string }): Promise<Client> {
  const passwordHash = input.password ? await hashPassword(input.password) : null;
  const [client] = await db
    .insert(clients)
    .values({ name: input.name, email: input.email, passwordHash, googleId: input.googleId, status: 'inactive' })
    .returning();
  const viaGoogle = Boolean(input.googleId);
  await db.insert(adminNotifications).values({
    clientId: client.id,
    type: 'new_registration',
    message: `${input.name} se registró ${viaGoogle ? 'con Google ' : ''}en la plataforma.`,
  });
  return client;
}

export async function updateClientPassword(id: string, passwordHash: string): Promise<void> {
  await db.update(clients).set({ passwordHash }).where(eq(clients.id, id));
}

export async function updateClientGoogleId(id: string, googleId: string): Promise<void> {
  await db.update(clients).set({ googleId }).where(eq(clients.id, id));
}
