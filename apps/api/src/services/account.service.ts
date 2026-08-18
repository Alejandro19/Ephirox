import { db } from '../db/index.js';
import { uploadFile } from '../storage/index.js';
import * as clientsService from './clients.service.js';
import * as legalAcceptanceService from './legal-acceptance.service.js';
import * as membershipPricesService from './membership-prices.service.js';
import * as membershipPaymentsService from './membership-payments.service.js';
import { stripeClient } from './stripe.service.js';
import type { LegalAcceptanceInput } from './legal-acceptance.service.js';
import type { Client } from '../models/schema.js';

export async function getLatestLegalAcceptance(clientId: string) {
  return legalAcceptanceService.findLatestAcceptanceByClientId(clientId);
}

// Cada re-aceptación (ej. tras editar el consentimiento desde el panel de
// cuenta) es una fila nueva — recordLegalAcceptance nunca actualiza ni borra.
export async function submitLegalAcceptance(clientId: string, input: LegalAcceptanceInput): Promise<void> {
  await legalAcceptanceService.recordLegalAcceptance(db, clientId, input);
}

type UploadedFile = { buffer: Buffer; mimetype: string; originalname: string };

export async function uploadAvatar(clientId: string, file: UploadedFile): Promise<Client | null> {
  const avatarUrl = await uploadFile(`clients/${clientId}/avatar`, file.buffer, file.mimetype, file.originalname);
  return clientsService.updateClient(clientId, { avatarUrl });
}

export async function updateNotificationPreferences(
  clientId: string,
  patch: Record<string, boolean>
): Promise<Client | null> {
  const existing = await clientsService.findClientById(clientId);
  const current = (existing?.notificationPreferences as Record<string, boolean>) ?? {};
  return clientsService.updateClient(clientId, { notificationPreferences: { ...current, ...patch } });
}

export async function requestDeletion(clientId: string): Promise<Client | null> {
  return clientsService.requestAccountDeletion(clientId);
}

export type AccountExport = {
  profile: { name: string; email: string; avatarUrl: string | null };
  membership: {
    clientType: string;
    memberNumber: number | null;
    activatedAt: Date | null;
    status: string;
    plan: string;
  };
  legalAcceptances: Awaited<ReturnType<typeof legalAcceptanceService.findAllAcceptancesByClientId>>;
  exportedAt: string;
};

// Alcance mínimo acordado: perfil, membresía e historial de aceptaciones
// legales — nada de mediciones/Oura/nutrición en esta entrega.
export async function exportAccountData(clientId: string): Promise<AccountExport | null> {
  const [client, acceptances] = await Promise.all([
    clientsService.findClientById(clientId),
    legalAcceptanceService.findAllAcceptancesByClientId(clientId),
  ]);
  if (!client) return null;
  return {
    profile: { name: client.name, email: client.email, avatarUrl: client.avatarUrl },
    membership: {
      clientType: client.clientType,
      memberNumber: client.memberNumber,
      activatedAt: client.activatedAt,
      status: client.status,
      plan: client.plan,
    },
    legalAcceptances: acceptances,
    exportedAt: new Date().toISOString(),
  };
}

export class PriceNotConfiguredError extends Error {
  constructor() {
    super('Este plan todavía no tiene un precio configurado. Contacta al administrador.');
    this.name = 'PriceNotConfiguredError';
  }
}

export type MembershipCheckout = { clientSecret: string; membershipPaymentId: string };

// Crea el PaymentIntent y la fila 'pending' correspondiente. NUNCA activa la
// membresía acá — eso solo lo hace el webhook (stripe-webhook.controller.ts)
// tras confirmar el pago con Stripe.
export async function createMembershipCheckout(
  clientId: string,
  input: { clientType: string; durationMonths: number }
): Promise<MembershipCheckout> {
  const price = await membershipPricesService.findPrice(input.clientType, input.durationMonths);
  if (!price || price.amountCents <= 0) throw new PriceNotConfiguredError();

  const paymentIntent = await stripeClient().paymentIntents.create({
    amount: price.amountCents,
    currency: price.currency,
    automatic_payment_methods: { enabled: true },
    metadata: { clientId, clientType: input.clientType, durationMonths: String(input.durationMonths) },
  });
  if (!paymentIntent.client_secret) throw new Error('Stripe no devolvió un client_secret.');

  const payment = await membershipPaymentsService.createPendingPayment({
    clientId,
    clientType: input.clientType,
    durationMonths: input.durationMonths,
    amountCents: price.amountCents,
    currency: price.currency,
    stripePaymentIntentId: paymentIntent.id,
  });

  return { clientSecret: paymentIntent.client_secret, membershipPaymentId: payment.id };
}

// Lo consulta el frontend mientras espera la confirmación real — nunca se
// asume éxito solo porque Stripe Elements devolvió "succeeded" del lado del
// cliente (ver PanelMembresias.tsx).
export async function getMembershipPaymentStatus(clientId: string, paymentId: string): Promise<{ status: string } | null> {
  const payment = await membershipPaymentsService.findById(paymentId);
  if (!payment || payment.clientId !== clientId) return null;
  return { status: payment.status };
}
