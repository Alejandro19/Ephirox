"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  fetchClient,
  activateClient,
  deactivateClient,
  saveClientType,
  type ClientDetail,
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

export default function AdminClientDetail({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState("");
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [c, info] = await Promise.all([
        fetchClient(clientId),
        getPersonalInfo(clientId).catch(() => null),
      ]);
      setClient(c);
      setPersonalInfo(info);
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

  if (loading) return <p style={{ color: "var(--ink-secondary)" }}>Cargando…</p>;
  if (error || !client) return <p style={{ color: "var(--danger)" }}>{error || "Cliente no encontrado."}</p>;

  const isLead = (client.client_type || client.clientType) === "lead_wellness";

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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
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
                {client.plan_duration_days ? `${client.plan_duration_days} días` : "Sin plan"}</span>
            </div>
            <div>
              <span style={labelStyle}>Inicio</span>
              <span style={{ fontSize: 14, color: "var(--ink)" }}>
                {client.plan_start_date || "-"}</span>
            </div>
            <div>
              <span style={labelStyle}>Vence</span>
              <span style={{ fontSize: 14, color: "var(--ink)" }}>
                {client.plan_end_date || "-"}</span>
            </div>
          </div>
        </div>
      )}
      {/* Módulos asignados card */}
      <div style={cardStyle}>
        <h3 style={cardTitleStyle}>Módulos asignados</h3>
        {[
          { key: "personal-info", label: "Información Personal", desc: "Respuestas del formulario inicial" },
          { key: "training", label: "Entrenamiento", desc: client.training_days ? `${client.training_days} día(s)/semana` : "Sin configurar" },
          { key: "nutrition", label: "Nutrición", desc: "Plan y suplementación" },
          { key: "cortisol", label: "Gestión de Cortisol", desc: "Técnicas y constancia" },
          { key: "rest", label: "Hackeando el sueño", desc: "Protocolo de sueño" },
          { key: "evolution", label: "Mi Evolución", desc: "Progreso y check-ins" },
        ].map((mod) => (
          <div key={mod.key} style={{ display: "flex", alignItems: "center",
            justifyContent: "space-between", padding: "12px 0",
            borderBottom: "1px solid var(--border-hairline)" }}>
            <div>
              <strong style={{ fontSize: 13, color: "var(--ink)" }}>{mod.label}</strong>
              <div style={{ fontSize: 12, color: "var(--ink-secondary)", marginTop: 2 }}>{mod.desc}</div>
            </div>
            <span style={{ display: "inline-flex", padding: "4px 12px",
              borderRadius: "9999px", fontSize: 11, fontWeight: 600,
              background: "rgba(201,166,107,.14)", color: "var(--ring-accent)" }}>Ver</span>
          </div>
        ))}
      </div>

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