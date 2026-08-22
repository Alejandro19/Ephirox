"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  fetchClient,
  activateClient,
  deactivateClient,
  saveClientType,
  resolveDeletionRequest,
  fetchMembershipPayments,
  approveMembershipPayment,
  type ClientDetail,
  type MembershipPayment,
} from "../../lib/clients-client";
import {
  getPersonalInfo,
  type PersonalInfo,
} from "../../lib/personal-info-client";
import { showToast } from "../layout/AppShell";
import { OnboardingSummaryAccordion } from "./OnboardingSummaryAccordion";

const cardStyle: React.CSSProperties = {
  background: "var(--paper)", border: "1px solid var(--border-hairline)",
  borderRadius: "var(--radius-card)", padding: "22px 24px", marginBottom: 20,
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: 15, fontWeight: 700, color: "var(--ink)",
  margin: "0 0 16px",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 400,
  color: "var(--ink-secondary)", marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: "100%", height: 36, borderRadius: 0,
  border: "none", borderBottom: "1px solid var(--border-input)", padding: "0 2px 6px", fontSize: 14.5,
  fontWeight: 600, background: "transparent", color: "var(--ink)", outline: "none",
  boxSizing: "border-box",
};

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: currency.toUpperCase(), maximumFractionDigits: 0 }).format(cents / 100);
}

function formatDateEs(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
}

const PAYMENT_STATUS_LABELS: Record<string, string> = { pending: "Pendiente", succeeded: "Aprobado", failed: "Rechazado" };

// Concatena paquete + plazo en un solo campo legible, ej. "12 clases / 3
// meses" (Presencial) o "3 meses" (Online/Elite, sin paquete).
function formatPlanDetail(payment: { packageSize: number | null; durationMonths: number }): string {
  const duration = `${payment.durationMonths} ${payment.durationMonths === 1 ? "mes" : "meses"}`;
  return payment.packageSize != null ? `${payment.packageSize} clases / ${duration}` : duration;
}

export default function AdminClientDetail({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo | null>(null);
  const [payments, setPayments] = useState<MembershipPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState("");
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [c, info, pays] = await Promise.all([
        fetchClient(clientId),
        getPersonalInfo(clientId).catch(() => null),
        fetchMembershipPayments(clientId).catch(() => []),
      ]);
      setClient(c);
      setPersonalInfo(info);
      setPayments(pays);
      setSelectedType(c.client_type || c.clientType || "");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al cargar.");
    } finally { setLoading(false); }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const handleActivate = async () => {
    if (!selectedType) { showToast("Elige el tipo de cliente antes de activar.", "error"); return; }
    setActing(true);
    try { setClient(await activateClient(clientId, selectedType)); showToast("Cliente activado.", "success"); }
    catch (e: unknown) { showToast(e instanceof Error ? e.message : "Error.", "error"); }
    finally { setActing(false); }
  };

  const handleDeactivate = async () => {
    setActing(true);
    try { setClient(await deactivateClient(clientId)); showToast("Cliente desactivado.", "success"); }
    catch (e: unknown) { showToast(e instanceof Error ? e.message : "Error.", "error"); }
    finally { setActing(false); }
  };

  const handleSaveType = async () => {
    setActing(true);
    try { setClient(await saveClientType(clientId, selectedType)); showToast("Tipo guardado.", "success"); }
    catch (e: unknown) { showToast(e instanceof Error ? e.message : "Error.", "error"); }
    finally { setActing(false); }
  };

  const handleResolveDeletionRequest = async () => {
    setActing(true);
    try { setClient(await resolveDeletionRequest(clientId)); showToast("Solicitud marcada como resuelta.", "success"); }
    catch (e: unknown) { showToast(e instanceof Error ? e.message : "Error.", "error"); }
    finally { setActing(false); }
  };

  const handleApprovePayment = async (paymentId: string) => {
    setActing(true);
    try {
      setClient(await approveMembershipPayment(clientId, paymentId));
      await load();
      showToast("Pago aprobado — membresía activada.", "success");
    }
    catch (e: unknown) { showToast(e instanceof Error ? e.message : "Error.", "error"); }
    finally { setActing(false); }
  };

  if (loading) return <p style={{ color: "var(--ink-secondary)" }}>Cargando…</p>;
  if (error || !client) return <p style={{ color: "var(--danger)" }}>{error || "Cliente no encontrado."}</p>;

  const isLead = (client.client_type || client.clientType) === "lead_wellness";
  const latestPayment = payments[0] ?? null;
  const pendingApprovalPayment = payments.find((p) => p.status === "succeeded" && p.requiresApproval && !p.appliedAt) ?? null;

  return (
    <div>
      <h1 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 26,
        fontWeight: 700, color: "var(--ink)", margin: "0 0 4px" }}>{client.name}</h1>
      <p style={{ fontSize: 14, color: "var(--ink-secondary)", margin: "0 0 24px" }}>{client.email}</p>
      <button onClick={() => router.push("/admin/clients")}
        style={{ background: "none", border: "none", color: "var(--ink-secondary)",
          fontSize: 13, fontWeight: 500, cursor: "pointer", padding: 0, marginBottom: 24,
          textDecoration: "underline", textUnderlineOffset: 4 }}>
        ← Volver a clientes</button>

      {/* Cuenta card */}
      <div style={cardStyle}>
        <h3 style={cardTitleStyle}>Cuenta</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
          <div>
            <span style={labelStyle}>Estado</span>
            <span style={{ display: "inline-block", padding: "4px 12px",
              borderRadius: "9999px", fontSize: 12, fontWeight: 600,
              background: client.status === "inactive" ? "var(--border-hairline)" : "rgba(201,166,107,.14)",
              color: client.status === "inactive" ? "var(--ink-secondary)" : "var(--ring-accent)" }}>
              {client.status}</span>
            <div style={{ marginTop: 10 }}>
              {client.status === "inactive" ? (
                <button onClick={handleActivate} disabled={acting}
                  style={{ padding: "6px 16px", borderRadius: "9999px", border: "1px solid var(--ring-accent)",
                    background: "transparent", color: "var(--ring-accent)", fontSize: 12, fontWeight: 600,
                    cursor: acting ? "not-allowed" : "pointer", opacity: acting ? 0.6 : 1 }}>
                  Activar cliente</button>
              ) : (
                <button onClick={handleDeactivate} disabled={acting}
                  style={{ padding: "6px 16px", borderRadius: "9999px", border: "1px solid var(--danger)",
                    background: "transparent", color: "var(--danger)", fontSize: 12, fontWeight: 600,
                    cursor: acting ? "not-allowed" : "pointer", opacity: acting ? 0.6 : 1 }}>
                  Desactivar cliente</button>
              )}
            </div>
          </div>
          <div>
            <span style={labelStyle}>Tipo de cliente</span>
            <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}
              style={{ ...inputStyle, height: 44 }}>
              <option value="">Sin clasificar</option>
              <option value="coaching_1_1">Coaching 1:1</option>
              <option value="coaching_online">Coaching Online</option>
              <option value="lead_wellness">Leads Wellness</option>
              <option value="mentoring">Mentoring</option>
            </select>
            <button onClick={handleSaveType} disabled={acting}
              style={{ marginTop: 10, padding: "6px 16px", borderRadius: "9999px",
                border: "1px solid var(--border-hairline)", background: "transparent",
                color: "var(--ink-secondary)", fontSize: 12, fontWeight: 500,
                cursor: acting ? "not-allowed" : "pointer" }}>
              Guardar tipo</button>
          </div>
        </div>
      </div>

      {/* Membresía card */}
      {!isLead && (
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>Membresía</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14 }}>
            <div>
              <span style={labelStyle}>Plan contratado</span>
              <span style={{ display: "inline-block", padding: "4px 12px",
                borderRadius: "9999px", fontSize: 12, fontWeight: 600,
                background: "var(--page-bg)", color: "var(--ink)" }}>
                {client.planDurationDays ? `${client.planDurationDays} días` : "Sin plan"}</span>
            </div>
            <div>
              <span style={labelStyle}>Inicio</span>
              <span style={{ fontSize: 14, color: "var(--ink)" }}>
                {client.planStartDate || "-"}</span>
            </div>
            <div>
              <span style={labelStyle}>Vence</span>
              <span style={{ fontSize: 14, color: "var(--ink)" }}>
                {client.planEndDate || "-"}</span>
            </div>
            {client.clientType === "coaching_1_1" && client.sessionsTotal != null && (
              <div>
                <span style={labelStyle}>Clases</span>
                <span style={{ fontSize: 14, color: "var(--ink)" }}>
                  Quedan {client.sessionsRemaining} de {client.sessionsTotal}</span>
              </div>
            )}
            {latestPayment && (
              <>
                <div>
                  <span style={labelStyle}>Proveedor</span>
                  <span style={{ fontSize: 14, color: "var(--ink)", textTransform: "capitalize" }}>{latestPayment.provider}</span>
                </div>
                <div>
                  <span style={labelStyle}>Último monto pagado</span>
                  <span style={{ fontSize: 14, color: "var(--ink)" }}>{formatMoney(latestPayment.amountCents, latestPayment.currency)}</span>
                </div>
                <div>
                  <span style={labelStyle}>Plan pagado</span>
                  <span style={{ fontSize: 14, color: "var(--ink)" }}>{formatPlanDetail(latestPayment)}</span>
                </div>
                {latestPayment.trmUsed != null && (
                  <>
                    <div>
                      <span style={labelStyle}>TRM usada (puente Elite)</span>
                      <span style={{ fontSize: 14, color: "var(--ink)" }}>${Number(latestPayment.trmUsed).toLocaleString("es-CO")} COP{latestPayment.trmDate ? ` · ${latestPayment.trmDate}` : ""}</span>
                    </div>
                    <div>
                      <span style={labelStyle}>Margen aplicado</span>
                      <span style={{ fontSize: 14, color: "var(--ink)" }}>{latestPayment.marginApplied != null ? `${(Number(latestPayment.marginApplied) * 100).toFixed(1)}%` : "-"}</span>
                    </div>
                    <div>
                      <span style={labelStyle}>USD de referencia vs. cobrado</span>
                      <span style={{ fontSize: 14, color: "var(--ink)" }}>$4.000 USD → {formatMoney(latestPayment.amountCents, latestPayment.currency)}</span>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Pago pendiente de aprobación — primera membresía paga del cliente */}
      {pendingApprovalPayment && (
        <div style={{ ...cardStyle, border: "1px solid #E8CFC2", background: "#FBEFEA" }}>
          <h3 style={{ ...cardTitleStyle, color: "#7A3B26" }}>Pago recibido, pendiente de aprobación</h3>
          <p style={{ fontSize: 13, color: "#7A3B26", margin: "0 0 14px" }}>
            {client.name} pagó {formatMoney(pendingApprovalPayment.amountCents, pendingApprovalPayment.currency)} por primera vez
            ({pendingApprovalPayment.clientType}) vía {pendingApprovalPayment.provider}, confirmado el {pendingApprovalPayment.succeededAt ? formatDateEs(pendingApprovalPayment.succeededAt) : "-"}.
            Como es su primera membresía paga, no se activa sola — revisala y aprobala acá.
          </p>
          <button onClick={() => handleApprovePayment(pendingApprovalPayment.id)} disabled={acting}
            style={{ padding: "6px 16px", borderRadius: "9999px", border: "1px solid var(--ring-accent)",
              background: "transparent", color: "var(--ring-accent)", fontSize: 12, fontWeight: 600,
              cursor: acting ? "not-allowed" : "pointer", opacity: acting ? 0.6 : 1 }}>
            Aprobar y activar</button>
        </div>
      )}

      {/* Historial de pagos */}
      {payments.length > 0 && (
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>Historial de pagos</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Fecha", "Tier", "Plan", "Monto", "Proveedor", "Estado"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 10px", fontSize: 11, fontWeight: 600,
                      color: "var(--ink-secondary)", textTransform: "uppercase", borderBottom: "1px solid var(--border-hairline)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid var(--border-hairline)" }}>
                    <td style={{ padding: "8px 10px", color: "var(--ink)" }}>{formatDateEs(p.createdAt)}</td>
                    <td style={{ padding: "8px 10px", color: "var(--ink)" }}>{p.clientType}</td>
                    <td style={{ padding: "8px 10px", color: "var(--ink)" }}>{formatPlanDetail(p)}</td>
                    <td style={{ padding: "8px 10px", color: "var(--ink)" }}>{formatMoney(p.amountCents, p.currency)}</td>
                    <td style={{ padding: "8px 10px", color: "var(--ink)", textTransform: "capitalize" }}>{p.provider}</td>
                    <td style={{ padding: "8px 10px", color: "var(--ink)" }}>{PAYMENT_STATUS_LABELS[p.status] ?? p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Solicitud de eliminación de cuenta */}
      {client.deletionRequestedAt && (
        <div style={{ ...cardStyle, border: "1px solid #E8CFC2", background: "#FBEFEA" }}>
          <h3 style={{ ...cardTitleStyle, color: "#7A3B26" }}>Solicitud de eliminación pendiente</h3>
          <p style={{ fontSize: 13, color: "#7A3B26", margin: "0 0 14px" }}>
            {client.name} solicitó eliminar su cuenta el {new Date(client.deletionRequestedAt).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}.
            Contáctalo antes de procesar cualquier cambio.
          </p>
          <button onClick={handleResolveDeletionRequest} disabled={acting}
            style={{ padding: "6px 16px", borderRadius: "9999px", border: "1px solid #A6533F",
              background: "transparent", color: "#A6533F", fontSize: 12, fontWeight: 600,
              cursor: acting ? "not-allowed" : "pointer", opacity: acting ? 0.6 : 1 }}>
            Marcar como resuelta</button>
        </div>
      )}

      {/* Resumen onboarding */}
      <div style={cardStyle}>
        <h3 style={cardTitleStyle}>Resumen de onboarding</h3>
        <OnboardingSummaryAccordion
          personalInfo={personalInfo}
          clientType={client.client_type || client.clientType || null}
          clientId={clientId}
        />
      </div>
    </div>
  );
}