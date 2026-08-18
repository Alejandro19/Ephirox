import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { membershipPrices, type MembershipPrice } from '../models/schema.js';

export async function listPrices(): Promise<MembershipPrice[]> {
  return db.select().from(membershipPrices);
}

export async function findPrice(clientType: string, durationMonths: number): Promise<MembershipPrice | null> {
  const rows = await db
    .select()
    .from(membershipPrices)
    .where(and(eq(membershipPrices.clientType, clientType), eq(membershipPrices.durationMonths, durationMonths)))
    .limit(1);
  return rows[0] ?? null;
}

export async function updatePrice(id: string, amountCents: number): Promise<MembershipPrice | null> {
  const [price] = await db
    .update(membershipPrices)
    .set({ amountCents, updatedAt: new Date() })
    .where(eq(membershipPrices.id, id))
    .returning();
  return price ?? null;
}
