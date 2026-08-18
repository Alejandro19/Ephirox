import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { eq, and } from 'drizzle-orm';
import type Stripe from 'stripe';
import { createApp } from '../src/app.js';
import { db } from '../src/db/index.js';
import { admins, clients, membershipPrices, membershipPayments } from '../src/models/schema.js';
import { hashPassword, signToken } from '../src/services/auth.service.js';
import { setStripeClientForTests } from '../src/services/stripe.service.js';

function fakeStripeClient(paymentIntentId: string): Stripe {
  return {
    paymentIntents: {
      create: async () => ({ id: paymentIntentId, client_secret: `secret_${paymentIntentId}` }),
    },
  } as unknown as Stripe;
}

describe('account membership checkout', () => {
  const app = createApp();
  const clientEmail = `checkout-client-${Date.now()}@example.com`;
  let clientId: string;
  let clientToken: string;

  beforeAll(async () => {
    const [client] = await db
      .insert(clients)
      .values({ name: 'Checkout Client', email: clientEmail, passwordHash: await hashPassword('x'), status: 'active', clientType: 'coaching_online' })
      .returning();
    clientId = client.id;
    clientToken = signToken({ id: clientId, role: 'cliente', name: 'Checkout Client', email: clientEmail, clientType: client.clientType });

    // Precio real para coaching_online-1, para no depender del seed en 0.
    await db
      .update(membershipPrices)
      .set({ amountCents: 9900 })
      .where(and(eq(membershipPrices.clientType, 'coaching_online'), eq(membershipPrices.durationMonths, 1)));
  });

  afterAll(async () => {
    await db.delete(membershipPayments).where(eq(membershipPayments.clientId, clientId));
    await db.delete(clients).where(eq(clients.id, clientId));
    await db
      .update(membershipPrices)
      .set({ amountCents: 0 })
      .where(and(eq(membershipPrices.clientType, 'coaching_online'), eq(membershipPrices.durationMonths, 1)));
  });

  beforeEach(() => {
    setStripeClientForTests(null);
  });

  it('rejects mentoring with a 1-month duration (server-side, never trusts the client)', async () => {
    const res = await request(app)
      .post('/api/account/membership/checkout')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ client_type: 'mentoring', duration_months: 1 });
    expect(res.status).toBe(400);
  });

  it('rejects a plan with no real price configured yet', async () => {
    setStripeClientForTests(fakeStripeClient('pi_unused'));
    const res = await request(app)
      .post('/api/account/membership/checkout')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ client_type: 'mentoring', duration_months: 3 }); // sigue en 0 por defecto
    expect(res.status).toBe(409);
  });

  it('creates a PaymentIntent and a pending payment row, and lets the client poll its own status', async () => {
    setStripeClientForTests(fakeStripeClient('pi_checkout_test_1'));
    const checkoutRes = await request(app)
      .post('/api/account/membership/checkout')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ client_type: 'coaching_online', duration_months: 1 });
    expect(checkoutRes.status).toBe(201);
    expect(checkoutRes.body.clientSecret).toBe('secret_pi_checkout_test_1');
    const { membershipPaymentId } = checkoutRes.body;

    const [row] = await db.select().from(membershipPayments).where(eq(membershipPayments.id, membershipPaymentId));
    expect(row.status).toBe('pending');
    expect(row.amountCents).toBe(9900);

    const statusRes = await request(app)
      .get(`/api/account/membership/payments/${membershipPaymentId}`)
      .set('Authorization', `Bearer ${clientToken}`);
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.status).toBe('pending');
  });

  it("rejects reading another client's payment status", async () => {
    setStripeClientForTests(fakeStripeClient('pi_checkout_test_2'));
    const checkoutRes = await request(app)
      .post('/api/account/membership/checkout')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ client_type: 'coaching_online', duration_months: 1 });
    const { membershipPaymentId } = checkoutRes.body;

    const [otherClient] = await db
      .insert(clients)
      .values({ name: 'Other Checkout Client', email: `other-checkout-${Date.now()}@example.com`, passwordHash: await hashPassword('x'), status: 'active' })
      .returning();
    const otherToken = signToken({ id: otherClient.id, role: 'cliente', name: 'Other', email: otherClient.email, clientType: otherClient.clientType });

    const res = await request(app)
      .get(`/api/account/membership/payments/${membershipPaymentId}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(404);

    await db.delete(clients).where(eq(clients.id, otherClient.id));
  });
});
