import { eq, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { clients, adminNotifications, type Client } from '../models/schema.js';
import { hashPassword } from './auth.service.js';
import { findAdminByEmail } from './admins.service.js';

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

export class ClientEmailTakenError extends Error {
  constructor() {
    super('Ese email ya está registrado.');
    this.name = 'ClientEmailTakenError';
  }
}

export async function listClients(): Promise<Client[]> {
  return db.select().from(clients).orderBy(desc(clients.createdAt));
}

export type CreateClientInput = { name: string; email: string; password: string; plan?: string };

export async function createClient(input: CreateClientInput): Promise<Client> {
  const emailLower = input.email.toLowerCase().trim();
  const [existingClient, existingAdmin] = await Promise.all([
    findClientByEmail(emailLower),
    findAdminByEmail(emailLower),
  ]);
  if (existingClient || existingAdmin) throw new ClientEmailTakenError();
  const passwordHash = await hashPassword(input.password);
  const [client] = await db
    .insert(clients)
    .values({ name: input.name, email: emailLower, passwordHash, plan: input.plan || 'Miembro' })
    .returning();
  return client;
}

export async function updateClient(id: string, patch: Record<string, unknown>): Promise<Client | null> {
  const [client] = await db
    .update(clients)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(clients.id, id))
    .returning();
  return client ?? null;
}

export async function deleteClient(id: string): Promise<void> {
  await db.delete(clients).where(eq(clients.id, id));
}
