import { z } from 'zod';

// Los 3 tipos de cliente que se pueden pagar (lead_wellness es gratis, no
// tiene precio ni checkout).
export const PAYABLE_CLIENT_TYPES = ['coaching_1_1', 'coaching_online', 'mentoring'] as const;
export type PayableClientType = (typeof PAYABLE_CLIENT_TYPES)[number];

export const MembershipPricePatchSchema = z.object({
  amount_cents: z.coerce.number().int().nonnegative(),
});
export type MembershipPricePatch = z.infer<typeof MembershipPricePatchSchema>;

// Presencial/Online eligen 1 o 3 meses; Elite (mentoring) siempre 3 — se
// valida acá, nunca confiando en lo que mande el cliente, porque el monto a
// cobrar depende de esta combinación.
export const MembershipCheckoutInputSchema = z
  .object({
    client_type: z.enum(PAYABLE_CLIENT_TYPES),
    duration_months: z.union([z.literal(1), z.literal(3)]),
  })
  .refine((input) => input.client_type !== 'mentoring' || input.duration_months === 3, {
    message: 'Club Elite solo se paga por 3 meses.',
  });
export type MembershipCheckoutInput = z.infer<typeof MembershipCheckoutInputSchema>;
