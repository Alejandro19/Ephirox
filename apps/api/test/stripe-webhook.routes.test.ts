import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { eq, and } from 'drizzle-orm';
import type Stripe from 'stripe';
import { createApp } from '../src/app.js';
import { db } from '../src/db/index.js';
import { clients, membershipPrices, membershipPayments } from '../src/models/schema.js';
import { hashPassword } from '../src/services/auth.service.js';
import { setStripeClientForTests } from '../src/services/stripe.service.js';

function fakeStripeClientReturning(event: Partial<Stripe.Event> | null, shouldThrow = false): Stripe {
  return {
    webhooks: {
      constructEvent: () => {
        if (shouldThrow) throw new Error('invalid signature');
        return event as Stripe.Event;
      },
    },
  } as unknown as Stripe;
}

function paymentSucceededEvent(paymentIntentId: string): Partial<Stripe.Event> {
  return {
    type: 'payment_intent.succeeded',
    data: { object: { id: paymentIntentId } as Stripe.PaymentIntent },
  };
}

describe('POST /api/stripe/webhook', () => {
  const app = createApp();
  const clientEmail = `webhook-client-${Date.now()}@example.com`;
  let clientId: string;

  beforeAll(async () => {
    const [client] = await db
      .insert(clients)
      .values({ name: 'Webhook Client', email: clientEmail, passwordHash: await hashPassword('x'), status: 'inactive', clientType: 'lead_wellness' })
      .returning();
    clientId = client.id;
    await db
      .update(membershipPrices)
      .set({ amountCents: 9900 })
      .where(and(eq(membershipPrices.clientType, 'coaching_1_1'), eq(membershipPrices.durationMonths, 1)));
  });

  afterAll(async () => {
    await db.delete(membershipPayments).where(eq(membershipPayments.clientId, clientId));
    await db.delete(clients).where(eq(clients.id, clientId));
    await db
      .update(membershipPrices)
      .set({ amountCents: 0 })
      .where(and(eq(membershipPrices.clientType, 'coaching_1_1'), eq(membershipPrices.durationMonths, 1)));
  });

  beforeEach(() => {
    setStripeClientForTests(null);
  });

  it('rejects a request with no stripe-signature header', async () => {
    const res = await request(app).post('/api/stripe/webhook').send({ type: 'payment_intent.succeeded' });
    expect(res.status).toBe(400);
  });

  it('rejects an invalid signature', async () => {
    setStripeClientForTests(fakeStripeClientReturning(null, true));
    const res = await request(app)
      .post('/api/stripe/webhook')
      .set('stripe-signature', 'bad-signature')
      .send({ type: 'payment_intent.succeeded' });
    expect(res.status).toBe(400);
  });

  it('activates the membership and sets a 30-day expiration on payment_intent.succeeded, and is idempotent on redelivery', async () => {
    const [payment] = await db
      .insert(membershipPayments)
      .values({
        clientId,
        clientType: 'coaching_1_1',
        durationMonths: 1,
        amountCents: 9900,
        currency: 'usd',
        stripePaymentIntentId: 'pi_webhook_test_1',
        status: 'pending',
      })
      .returning();

    setStripeClientForTests(fakeStripeClientReturning(paymentSucceededEvent('pi_webhook_test_1')));
    const res = await request(app)
      .post('/api/stripe/webhook')
      .set('stripe-signature', 'valid-enough-for-the-fake')
      .send({ type: 'payment_intent.succeeded' });
    expect(res.status).toBe(200);

    const [client] = await db.select().from(clients).where(eq(clients.id, clientId));
    expect(client.status).toBe('active');
    expect(client.clientType).toBe('coaching_1_1');
    expect(client.planEndDate).not.toBeNull();
    const expectedEnd = new Date();
    expectedEnd.setDate(expectedEnd.getDate() + 30);
    expect(client.planEndDate).toBe(expectedEnd.toISOString().slice(0, 10));

    const [updatedPayment] = await db.select().from(membershipPayments).where(eq(membershipPayments.id, payment.id));
    expect(updatedPayment.status).toBe('succeeded');
    expect(updatedPayment.succeededAt).not.toBeNull();

    // Reenvío del mismo evento (Stripe puede hacerlo) — no debe reactivar ni
    // recalcular las fechas una segunda vez. Chequeo de caja negra: si
    // succeededAt cambiara, sería evidencia de una segunda activación.
    const firstSucceededAt = updatedPayment.succeededAt;
    const secondRes = await request(app)
      .post('/api/stripe/webhook')
      .set('stripe-signature', 'valid-enough-for-the-fake')
      .send({ type: 'payment_intent.succeeded' });
    expect(secondRes.status).toBe(200);

    const [paymentAfterRedelivery] = await db.select().from(membershipPayments).where(eq(membershipPayments.id, payment.id));
    expect(paymentAfterRedelivery.succeededAt).toEqual(firstSucceededAt);
  });

  it('returns 200 and does nothing for an unrelated event type', async () => {
    setStripeClientForTests(fakeStripeClientReturning({ type: 'payment_intent.created', data: { object: {} as Stripe.PaymentIntent } }));
    const res = await request(app)
      .post('/api/stripe/webhook')
      .set('stripe-signature', 'valid-enough-for-the-fake')
      .send({ type: 'payment_intent.created' });
    expect(res.status).toBe(200);
  });
});
