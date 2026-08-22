import { eq, desc, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { clients, adminNotifications, type Client } from '../models/schema.js';
import { hashPassword } from './auth.service.js';
import { findAdminByEmail } from './admins.service.js';
import { recordLegalAcceptance, type LegalAcceptanceInput } from './legal-acceptance.service.js';

export async function findClientByEmail(email: string): Promise<Client | null> {
  const rows = await db.select().from(clients).where(eq(clients.email, email)).limit(1);
  return rows[0] ?? null;
}

export async function findClientById(id: string): Promise<Client | null> {
  const rows = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return rows[0] ?? null;
}

// Respaldo de findClientByEmail para el login por Google/Apple — si el
// cliente cambió su correo desde el panel de cuenta, el email real que
// entrega el proveedor SSO ya no coincide con el guardado, pero el
// googleId/appleId vinculado sigue siendo el mismo (ver googleLogin/
// appleLogin en auth.controller.ts).
export async function findClientByGoogleId(googleId: string): Promise<Client | null> {
  const rows = await db.select().from(clients).where(eq(clients.googleId, googleId)).limit(1);
  return rows[0] ?? null;
}

export async function findClientByAppleId(appleId: string): Promise<Client | null> {
  const rows = await db.select().from(clients).where(eq(clients.appleId, appleId)).limit(1);
  return rows[0] ?? null;
}

export type ClientAuthRow = {
  id: string;
  status: string;
  clientType: string;
  permissions: Record<string, boolean>;
  planEndDate: string | null;
};

export async function findClientAuthRowById(id: string): Promise<ClientAuthRow | null> {
  const rows = await db
    .select({
      id: clients.id,
      status: clients.status,
      clientType: clients.clientType,
      permissions: clients.permissions,
      planEndDate: clients.planEndDate,
    })
    .from(clients)
    .where(eq(clients.id, id))
    .limit(1);
  return (rows[0] as ClientAuthRow | undefined) ?? null;
}

export async function createInactiveClient(input: {
  name: string;
  email: string;
  password?: string;
  googleId?: string;
  appleId?: string;
  legalAcceptance: LegalAcceptanceInput;
}): Promise<Client> {
  const passwordHash = input.password ? await hashPassword(input.password) : null;
  // Transaccional (antes no lo era) — para que la fila del cliente y la de
  // evidencia de aceptación legal se creen atómicamente: nunca uno sin el otro.
  return db.transaction(async (tx) => {
    const [client] = await tx
      .insert(clients)
      .values({ name: input.name, email: input.email, passwordHash, googleId: input.googleId, appleId: input.appleId, status: 'inactive' })
      .returning();
    const via = input.googleId ? 'con Google ' : input.appleId ? 'con Apple ' : '';
    await tx.insert(adminNotifications).values({
      clientId: client.id,
      type: 'new_registration',
      message: `${input.name} se registró ${via}en la plataforma.`,
    });
    await recordLegalAcceptance(tx, client.id, input.legalAcceptance);
    return client;
  });
}

// Alta instantánea de "Club Explorador" — activa de una, sin cola de
// aprobación. Nunca lleva contraseña (ni siquiera temporal): el registro la
// loguea directo (ver auth.controller.ts) y, si más adelante quiere entrar
// por email/password, usa el flujo ya existente de "¿Olvidaste tu
// contraseña?" para fijar una por primera vez. Recibe número de miembro y
// activatedAt de una, con la misma secuencia atómica que updateStatus() usa
// para activaciones manuales — así la member card también le aparece.
export async function createActiveExplorerClient(input: {
  name: string;
  email: string;
  googleId?: string;
  appleId?: string;
  legalAcceptance: LegalAcceptanceInput;
}): Promise<Client> {
  return db.transaction(async (tx) => {
    const [client] = await tx
      .insert(clients)
      .values({
        name: input.name, email: input.email, passwordHash: null,
        googleId: input.googleId, appleId: input.appleId,
        status: 'active', clientType: 'lead_wellness',
        memberNumber: sql`nextval('member_number_seq')`,
        activatedAt: new Date(),
      })
      .returning();
    const via = input.googleId ? ' con Google' : input.appleId ? ' con Apple' : '';
    await tx.insert(adminNotifications).values({
      clientId: client.id,
      type: 'new_registration',
      message: `${input.name} se unió como Explorador${via}.`,
    });
    await recordLegalAcceptance(tx, client.id, input.legalAcceptance);
    return client;
  });
}

export async function updateClientPassword(id: string, passwordHash: string): Promise<void> {
  // Cualquier cambio de contraseña (change-password normal o reset por token)
  // satisface la obligación de la temporal — se limpia acá para no duplicar
  // esta lógica en cada endpoint que termina llamando esta función.
  await db.update(clients).set({ passwordHash, mustChangePassword: false }).where(eq(clients.id, id));
}

export async function updateClientGoogleId(id: string, googleId: string): Promise<void> {
  await db.update(clients).set({ googleId }).where(eq(clients.id, id));
}

export async function updateClientAppleId(id: string, appleId: string): Promise<void> {
  await db.update(clients).set({ appleId }).where(eq(clients.id, id));
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

export type CreateClientInput = { name: string; email: string; password: string; plan?: string; mustChangePassword?: boolean };

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
    .values({
      name: input.name,
      email: emailLower,
      passwordHash,
      plan: input.plan || 'Miembro',
      mustChangePassword: input.mustChangePassword ?? false,
    })
    .returning();
  return client;
}

export async function updateClient(id: string, patch: Record<string, unknown>): Promise<Client | null> {
  let normalizedPatch = patch;
  if (typeof patch.email === 'string') {
    const emailLower = patch.email.toLowerCase().trim();
    const [existingClient, existingAdmin] = await Promise.all([
      findClientByEmail(emailLower),
      findAdminByEmail(emailLower),
    ]);
    if ((existingClient && existingClient.id !== id) || existingAdmin) throw new ClientEmailTakenError();
    normalizedPatch = { ...patch, email: emailLower };
  }
  const [client] = await db
    .update(clients)
    .set({ ...normalizedPatch, updatedAt: new Date() })
    .where(eq(clients.id, id))
    .returning();
  return client ?? null;
}

export async function updatePermissions(id: string, permissions: Record<string, boolean>): Promise<Client | null> {
  return updateClient(id, { permissions });
}

export async function updateStatus(id: string, status: 'active' | 'inactive'): Promise<Client | null> {
  // Activar (inactive -> active) es el único momento en que se asigna el
  // número de miembro — de forma atómica vía secuencia de Postgres dentro de
  // una transacción, para que dos activaciones concurrentes nunca choquen.
  // Idempotente: si el cliente ya tenía número (se desactivó y se reactiva),
  // no se vuelve a asignar ni se pisa activatedAt.
  return db.transaction(async (tx) => {
    if (status === 'active') {
      const [existing] = await tx.select({ memberNumber: clients.memberNumber }).from(clients).where(eq(clients.id, id)).limit(1);
      if (existing && existing.memberNumber == null) {
        const [client] = await tx
          .update(clients)
          .set({
            status,
            memberNumber: sql`nextval('member_number_seq')`,
            activatedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(clients.id, id))
          .returning();
        return client ?? null;
      }
    }
    const [client] = await tx
      .update(clients)
      .set({ status, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    return client ?? null;
  });
}

export async function updateClientType(id: string, clientType: string): Promise<Client | null> {
  const existing = await findClientById(id);
  if (!existing) return null;
  const patch: Record<string, unknown> = { clientType };
  if (clientType === 'lead_wellness') {
    patch.permissions = { ...(existing.permissions as Record<string, boolean>), cortisol: true, community: true };
  }
  return updateClient(id, patch);
}

// Único consumidor: el webhook de Stripe (stripe-webhook.controller.ts),
// tras confirmar el pago. Reutiliza updateStatus/updateClientType/renewPlan
// EN SECUENCIA en vez de reimplementar la lógica de activación — es el
// mismo resultado final que produce hoy la aprobación manual en efectivo
// (AdminClientDetail.handleActivate) más el vencimiento, que ese flujo
// nunca seteaba.
export async function activatePaidPlan(
  id: string,
  input: { clientType: string; durationDays: number; packageSize?: number }
): Promise<Client | null> {
  await updateStatus(id, 'active');
  await updateClientType(id, input.clientType);
  // Solo Presencial vende por paquete de clases — fija el saldo vigente al
  // tamaño comprado (ver training.service.ts::confirmSession, que lo descuenta).
  if (input.packageSize != null) {
    await updateClient(id, { sessionsTotal: input.packageSize, sessionsRemaining: input.packageSize });
  }
  return renewPlan(id, { duration_days: input.durationDays });
}

export async function renewPlan(id: string, input: { plan_start_date: string; plan_end_date: string } | { duration_days: number }): Promise<Client | null> {
  if ('plan_start_date' in input) {
    if (input.plan_end_date <= input.plan_start_date) {
      throw new InvalidPlanDatesError();
    }
    const days = Math.round((new Date(input.plan_end_date).getTime() - new Date(input.plan_start_date).getTime()) / 86400000);
    return updateClient(id, {
      planDurationDays: days,
      planStartDate: input.plan_start_date,
      planEndDate: input.plan_end_date,
    });
  }
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + input.duration_days);
  return updateClient(id, {
    planDurationDays: input.duration_days,
    planStartDate: today.toISOString().slice(0, 10),
    planEndDate: endDate.toISOString().slice(0, 10),
  });
}

// Idempotente: si ya había una solicitud pendiente, no pisa la fecha
// original. No borra ni pausa nada por sí sola — solo la hace visible para
// que un admin revise y contacte al cliente (ver panel admin/clientes).
export async function requestAccountDeletion(id: string): Promise<Client | null> {
  const existing = await findClientById(id);
  if (!existing) return null;
  if (existing.deletionRequestedAt) return existing;
  const [client] = await db
    .update(clients)
    .set({ deletionRequestedAt: new Date(), updatedAt: new Date() })
    .where(eq(clients.id, id))
    .returning();
  return client ?? null;
}

export async function resolveDeletionRequest(id: string): Promise<Client | null> {
  return updateClient(id, { deletionRequestedAt: null });
}

export class InvalidPlanDatesError extends Error {
  constructor() {
    super('La fecha de vencimiento debe ser posterior a la de inicio.');
    this.name = 'InvalidPlanDatesError';
  }
}
