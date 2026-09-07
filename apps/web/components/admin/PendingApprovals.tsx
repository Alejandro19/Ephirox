"use client";

import { useState } from "react";
import { approveClient, rejectClient, type ClientSummary } from "../../lib/clients-client";
import { showToast } from "../layout/AppShell";

// Cola de registros que se crearon en 'pending' al intentar entrar por
// Google/Apple sin cuenta previa (ver googleLogin/appleLogin en
// auth.controller.ts) — no hace su propio fetch, recibe la misma lista que
// AdminClientList.tsx ya carga con fetchClients() para no duplicar la llamada.
export default function PendingApprovals({ clients, onChanged }: { clients: ClientSummary[]; onChanged: () => void }) {
  const pending = clients.filter((c) => c.status === "pending");
  const [actingId, setActingId] = useState<string | null>(null);

  if (pending.length === 0) return null;

  async function handleApprove(id: string) {
    setActingId(id);
    try {
      await approveClient(id);
      showToast("Cliente aprobado.", "success");
      onChanged();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Error al aprobar.", "error");
    } finally {
      setActingId(null);
    }
  }

  async function handleReject(id: string) {
    setActingId(id);
    try {
      await rejectClient(id);
      showToast("Registro rechazado.", "success");
      onChanged();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Error al rechazar.", "error");
    } finally {
      setActingId(null);
    }
  }

  return (
    <div style={{
      background: "var(--eph-surface)", border: "1px solid var(--eph-accent)",
      borderRadius: 0, padding: "22px 24px", marginBottom: 20,
    }}>
      <h3 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: 18, fontWeight: 400, color: "var(--eph-text)", margin: "0 0 4px" }}>
        Registros pendientes de aprobación
      </h3>
      <p className="font-mono" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--eph-muted)", margin: "0 0 16px" }}>
        Intentaron entrar con Google/Apple sin cuenta previa.
      </p>
      <div style={{ display: "grid", gap: 10 }}>
        {pending.map((c) => (
          <div key={c.id} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: 12, padding: "12px 14px",
            border: "1px solid var(--eph-line)",
          }}>
            <div>
              <span style={{ fontWeight: 600, fontSize: 13.5, color: "var(--eph-text)" }}>{c.name}</span>
              <span style={{ display: "block", fontSize: 12.5, color: "var(--eph-muted)" }}>{c.email}</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => handleApprove(c.id)}
                disabled={actingId === c.id}
                className="font-mono"
                style={{
                  border: "1px solid var(--eph-accent)", background: "transparent", color: "var(--eph-accent)",
                  borderRadius: 0, padding: "8px 16px", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em",
                  cursor: actingId === c.id ? "not-allowed" : "pointer", opacity: actingId === c.id ? 0.6 : 1,
                }}
              >
                Aprobar
              </button>
              <button
                onClick={() => handleReject(c.id)}
                disabled={actingId === c.id}
                className="font-mono"
                style={{
                  border: "1px solid var(--eph-line-2)", background: "transparent", color: "var(--eph-muted)",
                  borderRadius: 0, padding: "8px 16px", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em",
                  cursor: actingId === c.id ? "not-allowed" : "pointer", opacity: actingId === c.id ? 0.6 : 1,
                }}
              >
                Rechazar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
