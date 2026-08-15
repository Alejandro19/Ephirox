"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import ClientTopbar from "./ClientTopbar";
import AdminTopbar from "./AdminTopbar";
import PlanExpiredScreen from "./PlanExpiredScreen";
import { useAuth } from "../../lib/auth-context";
import {
  captureIncomingDeepLink,
  getPendingAction,
  clearPendingAction,
} from "../../lib/deep-link";
import { PATH_TO_VIEW } from "../../lib/constants";
import { IconAlertTriangle, IconCheckCircle } from "../ui/icons";

// ─── Toast System ─────────────────────────────────────────────

type Toast = { id: string; message: string; type?: "success" | "error" | "info" };
let toastId = 0;
const TOAST_LISTENERS = new Set<(toasts: Toast[]) => void>();
let currentToasts: Toast[] = [];

export function showToast(message: string, type: "success" | "error" | "info" = "info") {
  const toast: Toast = { id: String(++toastId), message, type };
  currentToasts = [...currentToasts, toast];
  TOAST_LISTENERS.forEach((fn) => fn(currentToasts));
  setTimeout(() => {
    currentToasts = currentToasts.filter((t) => t.id !== toast.id);
    TOAST_LISTENERS.forEach((fn) => fn(currentToasts));
  }, 4000);
}

// ─── Error Fallback ───────────────────────────────────────────

function ErrorFallback({ error, onReset }: { error: Error; onReset: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", background: "var(--page-bg)", padding: 24 }}>
      <div style={{ maxWidth: 400, width: "100%", background: "var(--paper)",
        border: "1px solid var(--border-hairline)", borderRadius: "20px",
        padding: "32px 28px", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12, color: "var(--danger)" }}>
          <IconAlertTriangle size={28} />
        </div>
        <h2 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 18,
          fontWeight: 700, color: "var(--ink)", margin: "0 0 8px" }}>
          Algo salió mal
        </h2>
        <p style={{ fontSize: 13, color: "var(--ink-secondary)", lineHeight: 1.5,
          margin: "0 0 20px" }}>
          {error.message || "Ha ocurrido un error inesperado."}
        </p>
        <button onClick={onReset}
          style={{ display: "inline-flex", alignItems: "center", gap: 6,
            borderRadius: "9999px", background: "var(--ring-accent)", color: "#fff",
            border: "none", padding: "10px 24px", fontSize: 13, fontWeight: 600,
            cursor: "pointer" }}>
          Reintentar
        </button>
      </div>
    </div>
  );
}

// ─── AppShell Component ───────────────────────────────────────

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, isLoading, planExpired, token } = useAuth();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [boundaryError, setBoundaryError] = useState<Error | null>(null);

  // ── Toast subscription ──
  useEffect(() => {
    TOAST_LISTENERS.add(setToasts);
    return () => { TOAST_LISTENERS.delete(setToasts); };
  }, []);

  // ── Deep link handler ──
  useEffect(() => {
    if (isLoading) return;
    captureIncomingDeepLink(window.location.search);
    const pending = getPendingAction();
    if (pending) {
      clearPendingAction();
      if (pending.m === "entrenamiento" && pending.a === "confirmar") {
        router.push("/training");
      }
    }
  }, [isLoading, router]);

  // ── Auth guard ──
  // logout() (UserChip) solo limpia el token en memoria/storage, no navega —
  // sin esto, cerrar sesión desde una ruta ya montada (ej. /training) deja al
  // usuario viendo la misma página con estado vacío en vez de mandarlo a
  // /login. Cubre logout y expiración/invalidez de token (refreshAuth falla).
  useEffect(() => {
    if (!isLoading && !token) router.push("/login");
  }, [isLoading, token, router]);

  if (!isLoading && !token) return null;

  // ── Plan expired takeover ──
  if (planExpired && role === "cliente") return <PlanExpiredScreen />;

  // ── Error boundary ──
  if (boundaryError) {
    return (
      <ErrorFallback
        error={boundaryError}
        onReset={() => setBoundaryError(null)}
      />
    );
  }

  // ── Loading ──
  // Mismo anillo (mañana/tarde/noche) que la pantalla transitoria del login,
  // para que no haya un salto visual entre "entrando" y "cargando sesión".
  if (isLoading) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 20,
        background: "var(--cream)",
      }}>
        <svg className="animate-spin" viewBox="0 0 100 100" width="64" height="64" aria-hidden="true" style={{ animationDuration: "1.4s" }}>
          <circle cx="50" cy="50" r="40" fill="none" strokeWidth="8" strokeLinecap="round" strokeDasharray="76 176" strokeDashoffset="0" opacity=".7" stroke="var(--ring-morning)" />
          <circle cx="50" cy="50" r="40" fill="none" strokeWidth="8" strokeLinecap="round" strokeDasharray="76 176" strokeDashoffset="-83.8" opacity=".7" stroke="var(--ring-afternoon)" />
          <circle cx="50" cy="50" r="40" fill="none" strokeWidth="8" strokeLinecap="round" strokeDasharray="76 176" strokeDashoffset="-167.6" opacity=".7" stroke="var(--ring-evening)" />
        </svg>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <p style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 20, fontWeight: 700, color: "var(--ink)", margin: 0 }}>La Tribu</p>
          <p style={{ fontSize: 14, color: "var(--ink-soft)", margin: 0 }}>Cargando sesión…</p>
        </div>
      </div>
    );
  }

  const viewKey = PATH_TO_VIEW[pathname] ?? "training";
  const isAdmin = role === "admin";

  return (
    <div style={{ display: "flex", minHeight: "100vh", position: "relative", flexDirection: "column" }}>
      {isAdmin ? <AdminTopbar viewKey={viewKey} /> : <ClientTopbar viewKey={viewKey} />}
      <main
        id="main-content"
        className="app-main-content"
        style={{
          flex: 1, overflowY: "auto",
          background: "var(--page-bg)",
        }}
      >
        {children}
      </main>

      {/* ── Toasts ── */}
      {toasts.length > 0 && (
        <div style={{
          position: "fixed", left: "50%", bottom: 30,
          transform: "translateX(-50%)",
          display: "flex", flexDirection: "column", gap: 8,
          zIndex: 2000, pointerEvents: "none",
        }}>
          {toasts.map((toast) => (
            <div
              key={toast.id}
              style={{
                background: "#2B2621", color: "#F3EFE6",
                padding: "12px 20px", borderRadius: "100px",
                fontSize: "12.5px", fontWeight: 600,
                display: "flex", alignItems: "center", gap: 8,
                boxShadow: "0 10px 30px rgba(0,0,0,.4)",
                animation: "toast-in 0.35s ease",
              }}
            >
              {toast.type === "error" && <IconAlertTriangle size={14} />}
              {toast.type === "success" && <IconCheckCircle size={14} />}
              {toast.message}
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .app-main-content {
          padding: 36px 44px;
        }
        @media (max-width: 640px) {
          .app-main-content {
            padding: 20px 16px;
          }
        }
      `}</style>
    </div>
  );
}

