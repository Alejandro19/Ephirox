import { z } from 'zod';

// Los 3 tipos de cliente que se pueden pagar (lead_wellness es gratis, no
// tiene precio ni checkout).
export const PAYABLE_CLIENT_TYPES = ['coaching_1_1', 'coaching_online', 'mentoring'] as const;
export type PayableClientType = (typeof PAYABLE_CLIENT_TYPES)[number];

// Wompi es el proveedor activo hoy; Stripe queda construido pero inactivo
// hasta tener una llave real (ver apps/api/src/services/payment-providers/).
export const SUPPORTED_PROVIDERS = ['wompi', 'stripe'] as const;
export type SupportedProviderName = (typeof SUPPORTED_PROVIDERS)[number];

export const MembershipPricePatchSchema = z.object({
  amount_cents: z.coerce.number().int().nonnegative(),
});
export type MembershipPricePatch = z.infer<typeof MembershipPricePatchSchema>;

// Presencial/Online eligen 1 o 3 meses; Elite (mentoring) siempre 3 — se
// valida acá, nunca confiando en lo que mande el cliente, porque el monto a
// cobrar depende de esta combinación. `provider` ya NO lo manda el cliente —
// lo resuelve el servidor (ver payment-providers/tier-routing.ts), para que
// nunca pueda desincronizarse de la config central tier→proveedor.
// `package_size` solo aplica (y es obligatorio) para Presencial — 3ra
// dimensión de precio junto con la duración.
export const MembershipCheckoutInputSchema = z
  .object({
    client_type: z.enum(PAYABLE_CLIENT_TYPES),
    duration_months: z.union([z.literal(1), z.literal(3)]),
    package_size: z.union([z.literal(8), z.literal(12), z.literal(16)]).optional(),
  })
  .refine((input) => input.client_type !== 'mentoring' || input.duration_months === 3, {
    message: 'Club Elite solo se paga por 3 meses.',
  })
  .refine((input) => (input.client_type === 'coaching_1_1') === (input.package_size != null), {
    message: 'Club Presencial requiere elegir un paquete de clases; los demás tiers no lo usan.',
  });
export type MembershipCheckoutInput = z.infer<typeof MembershipCheckoutInputSchema>;
