"use client";

import { useState } from "react";
import useSWR from "swr";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import type { Stripe } from "@stripe/stripe-js";
import { fetchClient, type ClientDetail } from "@/lib/clients-client";
import {
  getMembershipPrices,
  createMembershipCheckout,
  getMembershipPaymentStatus,
  type MembershipPrice,
} from "@/lib/membership-client";

/**
 * Pago digital de membresías (Stripe) — La Tribu
 *
 * Pago único por periodo fijo, NO suscripción: al vencer, el cliente vuelve
 * a pagar acá. El PaymentIntent nunca activa nada por sí solo — solo el
 * webhook lo hace tras la confirmación real de Stripe (ver
 * apps/api/src/controllers/stripe-webhook.controller.ts). Por eso, tras
 * confirmar el pago en el navegador, esta pantalla consulta el estado real
 * contra nuestro backend (GET /api/account/membership/payments/:id) en vez
 * de asumir éxito por lo que devuelve Stripe Elements del lado del cliente.
 */

const INK = "#1A1712";
const INK_MUTED = "#5A5248";
const GOLD = "#C9A66B";
const BORDER = "#E4DDCE";
const PAGE_BG = "#FAF7F1";

const stripePromise: Promise<Stripe | null> = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

type Plan = {
  clientType: string;
  label: string;
  durations: readonly number[];
};

const PLANS: Plan[] = [
  { clientType: "coaching_1_1", label: "Club Presencial", durations: [1, 3] },
  { clientType: "coaching_online", label: "Club Online", durations: [1, 3] },
  { clientType: "mentoring", label: "Club Elite", durations: [3] },
];

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
}

function formatAmount(cents: number, currency: string): string {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: currency.toUpperCase(), maximumFractionDigits: 0 }).format(cents / 100);
}

// Vigente = ya tiene ESE tier activo y su plan no venció todavía — en ese
// caso no se muestra el formulario de pago, solo la fecha de vencimiento.
function isCurrentlyActiveFor(client: ClientDetail | null | undefined, clientType: string): boolean {
  if (!client) return false;
  return client.clientType === clientType && client.status === "active" && !!client.plan_end_date && client.plan_end_date >= todayStr();
}

function CheckoutForm({ membershipPaymentId, onConfirmed }: { membershipPaymentId: string; onConfirmed: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [phase, setPhase] = useState<"paying" | "confirming">("paying");
  const [error, setError] = useState<string | null>(null);

  const pollUntilSucceeded = async (paymentId: string) => {
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      let status: string;
      try {
        status = (await getMembershipPaymentStatus(paymentId)).status;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue;
      }
      if (status === "succeeded") {
        onConfirmed();
        return;
      }
      if (status === "failed") {
        setPhase("paying");
        setError("El pago no se pudo confirmar. Intenta de nuevo.");
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    setError("Esto está tardando más de lo normal — se confirmará solo. Podés cerrar esta pantalla y volver más tarde.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setError(null);
    const { error: stripeError } = await stripe.confirmPayment({ elements, redirect: "if_required" });
    if (stripeError) {
      setError(stripeError.message || "No se pudo procesar el pago.");
      return;
    }
    // stripe.confirmPayment() sin error NO es la confirmación real — esa
    // solo llega por el webhook. Se pasa a "confirmando" y se consulta
    // nuestro propio backend hasta que lo refleje.
    setPhase("confirming");
    pollUntilSucceeded(membershipPaymentId);
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      {error && <p className="text-[12px] mt-3" style={{ color: "#A6533F" }}>{error}</p>}
      <button
        type="submit"
        disabled={!stripe || phase === "confirming"}
        className="w-full mt-4 rounded-full text-[13px] font-medium"
        style={{
          height: 42, background: INK, color: PAGE_BG,
          opacity: phase === "confirming" ? 0.6 : 1,
          cursor: phase === "confirming" ? "not-allowed" : "pointer",
        }}
      >
        {phase === "confirming" ? "Confirmando tu pago…" : "Pagar"}
      </button>
    </form>
  );
}

function MembershipCard({
  plan,
  prices,
  client,
  onPurchased,
}: {
  plan: Plan;
  prices: MembershipPrice[];
  client: ClientDetail | null | undefined;
  onPurchased: () => void;
}) {
  const [duration, setDuration] = useState<number>(plan.durations[0]);
  const [checkout, setCheckout] = useState<{ clientSecret: string; membershipPaymentId: string } | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justConfirmed, setJustConfirmed] = useState(false);

  const price = prices.find((p) => p.clientType === plan.clientType && p.durationMonths === duration) ?? null;
  const active = isCurrentlyActiveFor(client, plan.clientType);

  const handleStartCheckout = async () => {
    setStarting(true);
    setError(null);
    try {
      const result = await createMembershipCheckout(plan.clientType, duration);
      setCheckout(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo iniciar el pago.");
    } finally {
      setStarting(false);
    }
  };

  return (
    <div
      className="rounded-2xl border p-6"
      style={{ borderColor: BORDER, background: "#FFFEFB" }}
    >
      <h3 className="font-serif text-[17px] mb-1" style={{ color: INK }}>{plan.label}</h3>

      {active && client?.plan_end_date ? (
        <p className="text-[13px] mt-3" style={{ color: INK_MUTED }}>
          Vigente hasta <span style={{ color: GOLD, fontWeight: 600 }}>{formatDate(client.plan_end_date)}</span>.
        </p>
      ) : justConfirmed ? (
        <p className="text-[13px] mt-3" style={{ color: "#6B8055" }}>Pago confirmado — tu membresía ya está activa.</p>
      ) : checkout ? (
        <div className="mt-3">
          <Elements stripe={stripePromise} options={{ clientSecret: checkout.clientSecret }}>
            <CheckoutForm
              membershipPaymentId={checkout.membershipPaymentId}
              onConfirmed={() => {
                setJustConfirmed(true);
                onPurchased();
              }}
            />
          </Elements>
        </div>
      ) : (
        <>
          {plan.durations.length > 1 && (
            <div className="flex gap-2 mt-3 mb-2">
              {plan.durations.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className="px-3.5 py-1.5 rounded-full text-[12px] border"
                  style={
                    duration === d
                      ? { background: INK, borderColor: INK, color: PAGE_BG }
                      : { background: "transparent", borderColor: BORDER, color: INK_MUTED }
                  }
                >
                  {d} {d === 1 ? "mes" : "meses"}
                </button>
              ))}
            </div>
          )}
          {plan.durations.length === 1 && (
            <p className="text-[12px] mt-3 mb-2" style={{ color: INK_MUTED }}>3 meses</p>
          )}
          <p className="font-serif text-[22px] mb-3" style={{ color: INK }}>
            {price && price.amountCents > 0 ? formatAmount(price.amountCents, price.currency) : "Precio no disponible"}
          </p>
          {error && <p className="text-[12px] mb-2" style={{ color: "#A6533F" }}>{error}</p>}
          <button
            type="button"
            onClick={handleStartCheckout}
            disabled={starting || !price || price.amountCents <= 0}
            className="w-full rounded-full text-[13px] font-medium"
            style={{
              height: 42, background: INK, color: PAGE_BG,
              opacity: starting || !price || price.amountCents <= 0 ? 0.5 : 1,
              cursor: starting || !price || price.amountCents <= 0 ? "not-allowed" : "pointer",
            }}
          >
            {starting ? "Preparando el pago…" : "Pagar"}
          </button>
        </>
      )}
    </div>
  );
}

export default function PanelMembresias({ clientId }: { clientId: string }) {
  const clientKey = ["client-detail-for-member-card", clientId];
  const { data: client, mutate } = useSWR(clientKey, () => fetchClient(clientId));
  const { data: prices } = useSWR(["membership-prices"], getMembershipPrices);

  return (
    <div className="min-h-[600px]" style={{ background: PAGE_BG }}>
      <div className="max-w-[900px] mx-auto px-5 py-12">
        <p className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#9C7A3C" }}>Tu cuenta</p>
        <h1 className="font-serif text-[26px] mb-1.5" style={{ color: INK }}>Membresías</h1>
        <p className="text-[13.5px] mb-8" style={{ color: INK_MUTED }}>
          Pago único por periodo — sin cobro automático. Al vencer, volvés a pagar acá.
        </p>

        <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          {PLANS.map((plan) => (
            <MembershipCard
              key={plan.clientType}
              plan={plan}
              prices={prices ?? []}
              client={client}
              onPurchased={() => mutate()}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
