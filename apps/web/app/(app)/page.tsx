"use client";

import useSWR from "swr";
import { useAuth } from "@/lib/auth-context";
import { VIEW_TO_PATH } from "@/lib/constants";
import { MemberCard } from "@/components/member/MemberCard";
import { WellnessIndexCard } from "@/components/home/WellnessIndexCard";
import { fetchClient } from "@/lib/clients-client";
import { getNutrition } from "@/lib/nutrition-client";
import { getWearableEstado } from "@/lib/wearable-client";
import { getProtocol } from "@/lib/sleep-client";
import { getEvolutionData } from "@/lib/evolution-client";
import { listEvents } from "@/lib/events-client";
import { listTherapies } from "@/lib/therapies-client";
import { listRetreats } from "@/lib/retreats-client";
import Link from "next/link";

const ALL_CLIENT_QUICK_LINKS = [
  { key: "training", label: "Entrenamiento", desc: "Tu plan de entrenamiento diario" },
  { key: "nutrition", label: "Nutrición", desc: "Plan alimenticio y comidas" },
  { key: "community", label: "Club Wellness", desc: "Eventos y terapias grupales" },
  { key: "rest", label: "Hackea tu Sueño", desc: "Tu recuperación nocturna, medida por tu wearable" },
  { key: "evolution", label: "Mi Evolución", desc: "Tu proceso, en cifras" },
] as const;

type QuickLinkKey = (typeof ALL_CLIENT_QUICK_LINKS)[number]["key"];

// Nutrición, Descanso, Mi Evolución y Club Wellness — chequeo "¿hay algo
// cargado?" reusando los mismos fetchers que ya usa cada panel, en vez de
// duplicar lógica de negocio acá. Club Wellness es distinto a los otros:
// sus eventos/terapias/retiros son de toda la plataforma, no por cliente —
// "tiene datos" acá significa "hay al menos uno activo publicado ahora".
async function fetchQuickAccessSignals(clientId: string): Promise<Record<Exclude<QuickLinkKey, "training">, boolean>> {
  const [nutrition, wearables, protocol, evolution, events, therapies, retreats] = await Promise.all([
    getNutrition(clientId).catch(() => null),
    getWearableEstado(clientId).catch(() => []),
    getProtocol(clientId).catch(() => null),
    getEvolutionData(clientId).catch(() => null),
    listEvents().catch(() => []),
    listTherapies().catch(() => []),
    listRetreats().catch(() => []),
  ]);
  return {
    nutrition: Boolean(nutrition?.plan && "id" in nutrition.plan && nutrition.plan.id),
    rest: wearables.length > 0 || Boolean(protocol),
    evolution: Boolean(evolution) && (evolution!.checkins.length > 0 || evolution!.anthropometrics.length > 0 || evolution!.inbody.length > 0),
    community: events.length > 0 || therapies.length > 0 || retreats.length > 0,
  };
}

export default function InicioPage() {
  const { user, role, clientType, onboardingComplete } = useAuth();

  const isAdmin = role === "admin";
  // lead_wellness no ve accesos rápidos en absoluto (esos módulos están
  // bloqueados para ese tipo, ver ClientTopbar/moduleAccess); el resto de
  // los tipos de cliente sí, pero solo la card de cada módulo que ya
  // tenga datos cargados para este cliente específico.
  const showQuickAccessGate = !isAdmin && clientType !== null && clientType !== "lead_wellness";

  // Misma key que MemberCard.tsx — SWR la reusa sin pedirla dos veces.
  const { data: clientDetail } = useSWR(
    showQuickAccessGate && user?.id ? ["client-detail-for-member-card", user.id] : null,
    () => fetchClient(user!.id)
  );
  const { data: otherSignals } = useSWR(
    showQuickAccessGate && user?.id ? ["quick-access-signals", user.id] : null,
    () => fetchQuickAccessSignals(user!.id)
  );

  const signals: Record<QuickLinkKey, boolean> | null =
    showQuickAccessGate && otherSignals
      ? { training: Boolean(clientDetail?.trainingDays), ...otherSignals }
      : null;

  const quickLinks = isAdmin
    ? [
        { key: "admin-clients", label: "Clientes", desc: "Gestionar clientes y permisos" },
        { key: "admin-quotes", label: "Frases", desc: "Administrar frases motivacionales" },
        { key: "community", label: "Club Wellness", desc: "Gestionar eventos y terapias" },
      ]
    : signals
      ? ALL_CLIENT_QUICK_LINKS.filter((link) => signals[link.key])
      : [];

  return (
    <div className="fade-anim">
      {/* Welcome header */}
      <div style={{ marginBottom: 32 }}>
        <h1
          style={{
            fontFamily: "Fraunces, Georgia, serif",
            fontSize: 28,
            fontWeight: 700,
            color: "var(--ink)",
            margin: "0 0 6px",
          }}
        >
          ¡Hola{user?.name ? `, ${user.name.split(" ")[0]}` : ""}!
        </h1>
        <p style={{ fontSize: 14, color: "var(--ink-soft)", margin: 0 }}>
          {isAdmin
            ? "Panel de administración de La Tribu"
            : "Tu espacio de bienestar y alto rendimiento"}
        </p>
      </div>

      {!isAdmin && user?.id && clientType !== "lead_wellness" && <WellnessIndexCard clientId={user.id} />}
      {!isAdmin && user?.id && <MemberCard clientId={user.id} />}

      {/* Quick-access cards grid — Oura style: no shadow, subtle border, pill-radius */}
      {quickLinks.length > 0 && (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 16,
        }}
      >
        {quickLinks.map((link) => {
          const path = VIEW_TO_PATH[link.key] || `/${link.key}`;
          return (
            <Link
              key={link.key}
              href={path}
              style={{
                display: "block",
                background: "var(--paper)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius)",
                padding: "20px 20px",
                textDecoration: "none",
                transition: "border-color 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--gold)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--line)";
              }}
            >
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--ink)",
                  marginBottom: 4,
                }}
              >
                {link.label}
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                {link.desc}
              </div>
            </Link>
          );
        })}
      </div>
      )}
    </div>
  );
}
