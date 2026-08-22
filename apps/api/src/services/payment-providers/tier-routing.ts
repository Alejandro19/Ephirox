import type { PayableClientType } from '@latribu/shared-types';
import { getProvider } from './index.js';
import type { SupportedProvider } from './types.js';

// Único lugar donde se decide qué proveedor cobra cada tier — nunca lógica
// repartida en componentes/controllers. Presencial y Online quedan fijos en
// Wompi (Presencial de forma PERMANENTE — clientes colombianos, no hay
// motivo para moverlo a Stripe nunca; Online queda en Wompi de forma
// temporal, sin auto-switch todavía porque el precio en USD para Stripe
// todavía no está definido). Elite sí se apaga solo hacia Stripe en cuanto
// exista STRIPE_SECRET_KEY (mismo chequeo de disponibilidad que ya usa el
// resto del sistema) — mientras tanto cobra vía el puente TRM (ver
// trm.service.ts).
const TIER_PROVIDER_RESOLVERS: Record<PayableClientType, () => SupportedProvider> = {
  coaching_1_1: () => 'wompi',
  coaching_online: () => 'wompi',
  mentoring: () => (getProvider('stripe').isAvailable() ? 'stripe' : 'wompi'),
};

export function resolveProviderForTier(clientType: PayableClientType): SupportedProvider {
  return TIER_PROVIDER_RESOLVERS[clientType]();
}
