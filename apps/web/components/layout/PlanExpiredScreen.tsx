"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import { IconLock } from "../ui/icons";

export default function PlanExpiredScreen() {
  const router = useRouter();
  const { planEndDate } = useAuth();

  const endDateStr = planEndDate
    ? new Date(planEndDate + "T00:00:00").toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 3000,
        background: "var(--page-bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      {/* Oura-style card: clean, no shadow, subtle border, pill-radius */}
      <div
        style={{
          maxWidth: 440,
          width: "100%",
          background: "var(--paper)",
          border: "1px solid var(--border-hairline)",
          borderRadius: "20px",
          padding: "40px 32px",
          textAlign: "center",
        }}
      >
        {/* Lock icon — Oura-style visual anchor */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "rgba(201,166,107,.14)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            color: "var(--ring-accent)",
          }}
        >
          <IconLock size={24} />
        </div>

        <h2
          style={{
            fontFamily: "Fraunces, Georgia, serif",
            fontSize: 22,
            fontWeight: 700,
            color: "var(--ink)",
            margin: "0 0 12px",
          }}
        >
          Tu plan ha vencido
        </h2>

        <p
          style={{
            fontSize: 14,
            color: "var(--ink-secondary)",
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          {endDateStr
            ? `Tu membresía venció el ${endDateStr}. `
            : ""}
          Renová tu plan para recuperar el acceso a la plataforma, o contacta
          a tu coach.
        </p>

        <button
          type="button"
          onClick={() => router.push("/configuracion/membresias")}
          style={{
            marginTop: 24,
            width: "100%",
            height: 46,
            borderRadius: "9999px",
            border: "none",
            background: "var(--ink)",
            color: "var(--page-bg)",
            fontSize: 13.5,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Renovar membresía
        </button>
      </div>
    </div>
  );
}
