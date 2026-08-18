import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { membershipPayments, type MembershipPayment } from '../models/schema.js';

export type CreatePendingPaymentInput = {
  clientId: string;
  clientType: string;
  durationMonths: number;
  amountCents: number;
  currency: string;
  stripePaymentIntentId: string;
};

export async function createPendingPayment(input: CreatePendingPaymentInput): Promise<MembershipPayment> {
  const [payment] = await db
    .insert(membershipPayments)
    .values({
      clientId: input.clientId,
      clientType: input.clientType,
      durationMonths: input.durationMonths,
      amountCents: input.amountCents,
      currency: input.currency,
      stripePaymentIntentId: input.stripePaymentIntentId,
      status: 'pending',
    })
    .returning();
  return payment;
}

export async function findById(id: string): Promise<MembershipPayment | null> {
  const rows = await db.select().from(membershipPayments).where(eq(membershipPayments.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function findByStripePaymentIntentId(stripePaymentIntentId: string): Promise<MembershipPayment | null> {
  const rows = await db
    .select()
    .from(membershipPayments)
    .where(eq(membershipPayments.stripePaymentIntentId, stripePaymentIntentId))
    .limit(1);
  return rows[0] ?? null;
}

export async function markSucceeded(id: string): Promise<MembershipPayment | null> {
  const [payment] = await db
    .update(membershipPayments)
    .set({ status: 'succeeded', succeededAt: new Date() })
    .where(eq(membershipPayments.id, id))
    .returning();
  return payment ?? null;
}
