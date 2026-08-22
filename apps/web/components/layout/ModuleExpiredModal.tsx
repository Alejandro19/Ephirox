"use client";

import { useRouter } from "next/navigation";
import { CrownBadge } from "../ui/CrownBadge";

export function ModuleExpiredModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 2500,
        background: "rgba(26,23,18,.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 380, width: "100%", background: "var(--paper)",
          border: "1px solid var(--border-hairline)", borderRadius: "20px",
          padding: "32px 28px", textAlign: "center",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <CrownBadge circleSize={44} iconSize={22} />
        </div>
        <p style={{ fontSize: 14, color: "var(--ink)", lineHeight: 1.6, margin: "0 0 24px" }}>
          Este módulo está incluido en tu membresía. Renueva tu pago para volver a acceder.
        </p>
        <button
          type="button"
          onClick={() => router.push("/configuracion/membresias")}
          style={{
            width: "100%", height: 44, borderRadius: "9999px", border: "none",
            background: "var(--ink)", color: "var(--page-bg)",
            fontSize: 13.5, fontWeight: 600, cursor: "pointer", marginBottom: 8,
          }}
        >
          Renovar membresía
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{
            width: "100%", height: 40, borderRadius: "9999px", border: "none",
            background: "transparent", color: "var(--ink-secondary)",
            fontSize: 13, fontWeight: 500, cursor: "pointer",
          }}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
