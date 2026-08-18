import type { Request, Response } from 'express';
import type Stripe from 'stripe';
import { stripeClient, requireStripeWebhookSecret } from '../services/stripe.service.js';
import * as membershipPaymentsService from '../services/membership-payments.service.js';
import * as clientsService from '../services/clients.service.js';

// Único punto de la app que activa una membresía pagada por Stripe — el
// endpoint que crea el PaymentIntent (account.controller.ts) nunca lo hace
// directamente. req.body acá es el buffer crudo (ver stripe-webhook.routes.ts,
// montado con express.raw() antes del express.json() global de app.ts):
// Stripe exige el body sin parsear para poder verificar la firma.
export async function handleStripeWebhook(req: Request, res: Response) {
  const signature = req.headers['stripe-signature'];
  if (!signature || typeof signature !== 'string') {
    return res.status(400).json({ success: false, error: 'Falta la firma de Stripe.' });
  }

  let event: Stripe.Event;
  try {
    event = stripeClient().webhooks.constructEvent(req.body, signature, requireStripeWebhookSecret());
  } catch {
    return res.status(400).json({ success: false, error: 'Firma inválida.' });
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as Stripe.PaymentIntent;
    const payment = await membershipPaymentsService.findByStripePaymentIntentId(intent.id);
    // Idempotente: si ya estaba 'succeeded' (Stripe puede reenviar el mismo
    // evento más de una vez), no se vuelve a activar ni a extender el plan.
    if (payment && payment.status !== 'succeeded') {
      const durationDays = payment.durationMonths === 1 ? 30 : 90;
      await clientsService.activatePaidPlan(payment.clientId, {
        clientType: payment.clientType,
        durationDays,
      });
      await membershipPaymentsService.markSucceeded(payment.id);
    }
  }

  // Cualquier otro tipo de evento: 200 sin acción, para que Stripe no reintente.
  return res.status(200).json({ received: true });
}
