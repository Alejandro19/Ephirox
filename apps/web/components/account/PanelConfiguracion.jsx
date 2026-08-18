"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR, { useSWRConfig } from "swr";
import {
  User, ShieldCheck, Watch, Bell, Lock, LogOut,
  ChevronRight, Check,
} from "lucide-react";
import { useAuth } from "../../lib/auth-context";
import { MEMBERSHIP_LABELS } from "../../lib/constants";
import { fetchClient, updateClientProfile } from "../../lib/clients-client";
import {
  getLegalAcceptance,
  submitLegalAcceptance,
  uploadAvatar,
  updateNotificationPreferences,
  requestAccountDeletion,
  getAccountExport,
} from "../../lib/account-client";
import { getWearableEstado, getWearableConnectUrl, disconnectWearable } from "../../lib/wearable-client";
import { changePasswordRequest } from "../../lib/api-client";
import AceptacionRegistro from "../auth/AceptacionRegistro";

/**
 * Panel de Configuración del cliente — La Tribu
 *
 * Conectado a datos reales: perfil/membresía reusan la misma key SWR que
 * MemberCard.tsx (['client-detail-for-member-card', clientId]), el resto
 * de las secciones pegan al módulo de cuenta (lib/account-client.ts) y a lo
 * que ya existía (Oura, cambio de contraseña).
 */

const INK = "#1A1712";
const INK_MUTED = "#5A5248";
const GOLD = "#C9A66B";
const BORDER = "#E4DDCE";
const PAGE_BG = "#FAF7F1";

function formatMemberNumber(n) {
  return String(n).padStart(5, "0");
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
}

// plan_end_date es una columna `date` (YYYY-MM-DD, sin hora) — a diferencia
// de formatDate() de arriba, necesita el +"T00:00:00" para no correrse un
// día en zonas con offset UTC negativo.
function formatPlanDate(isoDate) {
  if (!isoDate) return "";
  return new Date(isoDate + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
}

function SectionHeader({ Icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={15} color={GOLD} />
      <h2 className="font-serif text-[16px]" style={{ color: INK }}>{title}</h2>
    </div>
  );
}

function Section({ children, first }) {
  return (
    <div
      className={`py-7 ${first ? "" : "border-t"}`}
      style={{ borderColor: BORDER }}
    >
      {children}
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <label className="block mb-4">
      <span className="block text-[11px] mb-1.5" style={{ color: INK_MUTED }}>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent border-b outline-none text-[14px] pb-2 transition-colors"
        style={{ borderColor: BORDER, color: INK, height: 36 }}
        onFocus={(e) => (e.target.style.borderColor = GOLD)}
        onBlur={(e) => (e.target.style.borderColor = BORDER)}
      />
    </label>
  );
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative flex-shrink-0 rounded-full transition-colors"
      style={{ width: 38, height: 22, background: checked ? INK : "#E4DDCE", opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "pointer" }}
    >
      <span
        className="absolute top-[3px] rounded-full bg-white transition-all"
        style={{ width: 16, height: 16, left: checked ? 19 : 3 }}
      />
    </button>
  );
}

function Row({ title, sub, right }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div>
        <p className="text-[13.5px]" style={{ color: INK }}>{title}</p>
        {sub && <p className="text-[12px] mt-0.5" style={{ color: INK_MUTED }}>{sub}</p>}
      </div>
      {right}
    </div>
  );
}

function Pill({ children, tone = "neutral" }) {
  const styles = {
    neutral: { background: "transparent", border: `1px solid ${BORDER}`, color: INK_MUTED },
    gold: { background: INK, border: `1px solid ${INK}`, color: "#FAF7F1" },
    ok: { background: "transparent", border: "1px solid #A8B89A", color: "#6B8055" },
  };
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px]"
      style={styles[tone]}
    >
      {children}
    </span>
  );
}

export default function PanelConfiguracion({ clientId }) {
  const router = useRouter();
  const { logout } = useAuth();
  const { mutate } = useSWRConfig();
  const clientKey = ["client-detail-for-member-card", clientId];
  const { data: client } = useSWR(clientKey, () => fetchClient(clientId));
  const { data: acceptance } = useSWR(["account-legal-acceptance", clientId], getLegalAcceptance);
  const { data: wearables } = useSWR(["account-wearable-estado", clientId], () => getWearableEstado(clientId));

  const refreshClient = () => mutate(clientKey);

  // --- Perfil ---
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [profileError, setProfileError] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    if (client) {
      setNombre(client.name);
      setEmail(client.email);
    }
  }, [client?.name, client?.email]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileError(null);
    try {
      await updateClientProfile(clientId, { name: nombre, email });
      await refreshClient();
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : "Error al guardar los cambios.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      await uploadAvatar(file);
      await refreshClient();
    } catch {
      // Silencioso: el input vuelve a su estado y el usuario puede reintentar.
    } finally {
      setAvatarUploading(false);
      e.target.value = "";
    }
  };

  // --- Privacidad y datos ---
  const [reacceptOpen, setReacceptOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleteStep, setDeleteStep] = useState("idle"); // idle | confirming | sent

  useEffect(() => {
    if (client?.deletionRequestedAt) setDeleteStep("sent");
  }, [client?.deletionRequestedAt]);

  const handleReacceptComplete = async (payload) => {
    await submitLegalAcceptance(payload);
    await mutate(["account-legal-acceptance", clientId]);
    setTimeout(() => setReacceptOpen(false), 1500);
  };

  const handleDownloadData = async () => {
    setExporting(true);
    try {
      const data = await getAccountExport();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mis-datos-la-tribu-${clientId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const handleSendDeletionRequest = async () => {
    try {
      await requestAccountDeletion();
      setDeleteStep("sent");
    } catch {
      // Se queda en "confirming" — el usuario puede reintentar.
    }
  };

  // --- Dispositivos ---
  const oura = wearables?.find((w) => w.dispositivo === "oura");

  const handleDisconnectOura = async () => {
    await disconnectWearable(clientId, "oura");
    await mutate(["account-wearable-estado", clientId]);
  };

  // --- Notificaciones ---
  const prefs = client?.notificationPreferences ?? { streakReminders: true, events: true, news: false };
  const [savingPref, setSavingPref] = useState(null);

  const handleTogglePref = async (key, value) => {
    setSavingPref(key);
    try {
      await updateNotificationPreferences({ [key]: value });
      await refreshClient();
    } finally {
      setSavingPref(null);
    }
  };

  // --- Seguridad ---
  const [pwOpen, setPwOpen] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwError, setPwError] = useState(null);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwDone, setPwDone] = useState(false);

  const handleChangePassword = async () => {
    setPwSaving(true);
    setPwError(null);
    try {
      const result = await changePasswordRequest(pwCurrent, pwNew);
      if (!result.success) throw new Error(result.error || "No se pudo cambiar la contraseña.");
      setPwDone(true);
      setPwCurrent("");
      setPwNew("");
    } catch (e) {
      setPwError(e instanceof Error ? e.message : "No se pudo cambiar la contraseña.");
    } finally {
      setPwSaving(false);
    }
  };

  const linkedProvider = client?.googleId ? "Google" : client?.appleId ? "Apple" : null;

  const initials = (client?.name || "?")
    .split(" ")
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");

  return (
    <div className="min-h-[800px]" style={{ background: PAGE_BG }}>
      <div className="max-w-[640px] mx-auto px-5 py-12">
        <p className="text-[11px] tracking-[0.12em] uppercase mb-2" style={{ color: "#9C7A3C" }}>Tu cuenta</p>
        <h1 className="font-serif text-[26px] mb-1.5" style={{ color: INK }}>Configuración</h1>
        <p className="text-[13.5px] mb-2" style={{ color: INK_MUTED }}>
          Tu perfil, tu membresía y tus datos en La Tribu.
        </p>

        {/* Perfil */}
        <Section first>
          <SectionHeader Icon={User} title="Mi perfil" />
          <div className="flex items-center gap-4 mb-6">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center font-serif text-[18px] overflow-hidden"
              style={{ background: "#EDE7D9", color: INK }}
            >
              {client?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={client.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : initials}
            </div>
            <label className="text-[12.5px] underline cursor-pointer" style={{ color: INK_MUTED }}>
              {avatarUploading ? "Subiendo…" : "Cambiar foto"}
              <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={handlePhotoChange} disabled={avatarUploading} />
            </label>
          </div>
          <Field label="Nombre completo" value={nombre} onChange={setNombre} />
          <Field label="Correo electrónico" value={email} onChange={setEmail} />
          {profileError && <p className="text-[12px] mb-2" style={{ color: "#A6533F" }}>{profileError}</p>}
          <button
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className="rounded-full text-[13px] font-medium px-5 mt-2"
            style={{ height: 42, background: INK, color: PAGE_BG, opacity: savingProfile ? 0.6 : 1, cursor: savingProfile ? "not-allowed" : "pointer" }}
          >
            {savingProfile ? "Guardando…" : "Guardar cambios"}
          </button>
        </Section>

        {/* Membresía */}
        <Section>
          <SectionHeader Icon={ShieldCheck} title="Membresía" />
          {client && (
            <>
              <Row
                title={MEMBERSHIP_LABELS[client.clientType] || client.clientType}
                sub={[
                  client.memberNumber != null ? `Miembro N.º ${formatMemberNumber(client.memberNumber)}` : null,
                  client.activatedAt ? `Ingresaste el ${formatDate(client.activatedAt)}` : null,
                  client.plan_end_date
                    ? `${new Date().toISOString().slice(0, 10) > client.plan_end_date ? "Venció" : "Vence"} el ${formatPlanDate(client.plan_end_date)}`
                    : null,
                ].filter(Boolean).join(" · ")}
                right={<Pill tone={client.status === "active" ? "gold" : "neutral"}>{client.status === "active" ? "Activa" : "Inactiva"}</Pill>}
              />
              <button
                type="button"
                onClick={() => router.push("/configuracion/membresias")}
                className="w-full flex items-center justify-between py-2.5 text-left"
              >
                <div>
                  <p className="text-[13.5px]" style={{ color: INK }}>Gestionar membresía</p>
                  <p className="text-[12px] mt-0.5" style={{ color: INK_MUTED }}>Renovar, cambiar de plan o subir a Club Elite</p>
                </div>
                <ChevronRight size={16} color={INK_MUTED} />
              </button>
            </>
          )}
        </Section>

        {/* Privacidad y datos */}
        <Section>
          <SectionHeader Icon={Lock} title="Privacidad y datos" />
          {acceptance ? (
            <>
              <p className="text-[12.5px] mb-4" style={{ color: INK_MUTED }}>
                Aceptaste estos documentos el {formatDate(acceptance.acceptedAt)}.
              </p>
              <Row title="Política de Tratamiento de Datos" sub={acceptance.dataPolicyVersion} right={null} />
              <Row title="Términos y Condiciones de Uso" sub={acceptance.termsVersion} right={null} />
            </>
          ) : (
            <p className="text-[12.5px] mb-4" style={{ color: INK_MUTED }}>Cargando tu consentimiento…</p>
          )}
          <div className="mt-4 pt-4 border-t" style={{ borderColor: BORDER }}>
            <p className="text-[11px] mb-3" style={{ color: INK_MUTED }}>
              Tus derechos según la Ley 1581 de 2012:
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleDownloadData}
                disabled={exporting}
                className="text-[12px] underline"
                style={{ color: INK, cursor: exporting ? "not-allowed" : "pointer" }}
              >
                {exporting ? "Generando…" : "Descargar mis datos"}
              </button>
              <span style={{ color: BORDER }}>·</span>
              <button type="button" className="text-[12px] underline" style={{ color: INK }} onClick={() => setReacceptOpen(true)}>
                Actualizar mi autorización
              </button>
              <span style={{ color: BORDER }}>·</span>
              {deleteStep === "idle" && (
                <button
                  type="button"
                  className="text-[12px] underline"
                  style={{ color: "#A6533F" }}
                  onClick={() => setDeleteStep("confirming")}
                >
                  Solicitar eliminación de mi cuenta
                </button>
              )}
            </div>

            {deleteStep === "confirming" && (
              <div className="mt-3 rounded-lg p-4" style={{ background: "#FBEFEA", border: "1px solid #E8CFC2" }}>
                <p className="text-[12.5px] mb-2 font-medium" style={{ color: "#7A3B26" }}>
                  Antes de confirmar, esto es lo que pasa:
                </p>
                <ul className="text-[12px] mb-3 space-y-1 list-none pl-0" style={{ color: "#7A3B26" }}>
                  <li>· Tu membresía se pausa de inmediato.</li>
                  <li>· Tu mentor o terapeuta pierde acceso a tu historial.</li>
                  <li>· Tus datos se eliminan dentro de los 15 días hábiles siguientes, conforme a la ley.</li>
                </ul>
                <p className="text-[12px] mb-3" style={{ color: "#7A3B26" }}>
                  Esto no borra nada al instante — le llega a nuestro equipo, que puede contactarte antes de procesarlo.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="text-[12.5px] px-4 py-2 rounded-full"
                    style={{ background: "#A6533F", color: "#FFF8F5" }}
                    onClick={handleSendDeletionRequest}
                  >
                    Enviar solicitud
                  </button>
                  <button
                    type="button"
                    className="text-[12.5px] px-4 py-2 rounded-full"
                    style={{ border: `1px solid ${BORDER}`, color: INK_MUTED }}
                    onClick={() => setDeleteStep("idle")}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {deleteStep === "sent" && (
              <div className="mt-3 rounded-lg p-4 flex items-start gap-2" style={{ background: "#F3F6EE", border: "1px solid #D3E0C4" }}>
                <Check size={14} color="#5B7A3E" style={{ marginTop: 2, flexShrink: 0 }} />
                <p className="text-[12px]" style={{ color: "#4A6231" }}>
                  Solicitud enviada. Un asesor te contactará antes de los 15 días hábiles.
                </p>
              </div>
            )}
          </div>
        </Section>

        {/* Dispositivos */}
        <Section>
          <SectionHeader Icon={Watch} title="Dispositivos conectados" />
          <Row
            title="Oura Ring"
            sub={oura?.conectado ? "Sincronizando sueño y recuperación" : "No conectado"}
            right={
              oura?.conectado ? (
                <div className="flex items-center gap-2">
                  <Pill tone="ok"><Check size={11} /> Conectado</Pill>
                  <button type="button" onClick={handleDisconnectOura} className="text-[11.5px] underline" style={{ color: INK_MUTED }}>
                    Desconectar
                  </button>
                </div>
              ) : (
                <a href={getWearableConnectUrl("oura", clientId)} className="text-[12.5px] underline" style={{ color: INK }}>
                  Conectar
                </a>
              )
            }
          />
        </Section>

        {/* Notificaciones */}
        <Section>
          <SectionHeader Icon={Bell} title="Notificaciones" />
          <Row
            title="Recordatorios de racha"
            sub="Cuando tu racha está en riesgo"
            right={<Toggle checked={prefs.streakReminders} disabled={savingPref === "streakReminders"} onChange={(v) => handleTogglePref("streakReminders", v)} />}
          />
          <Row
            title="Eventos y retiros del Club"
            sub="Nuevas fechas disponibles"
            right={<Toggle checked={prefs.events} disabled={savingPref === "events"} onChange={(v) => handleTogglePref("events", v)} />}
          />
          <Row
            title="Novedades de La Tribu"
            sub="Anuncios generales"
            right={<Toggle checked={prefs.news} disabled={savingPref === "news"} onChange={(v) => handleTogglePref("news", v)} />}
          />
        </Section>

        {/* Seguridad */}
        <Section>
          <SectionHeader Icon={Lock} title="Seguridad" />
          <Row
            title="Contraseña"
            sub={pwDone ? "Actualizada" : "Cámbiala cuando quieras"}
            right={
              <button type="button" className="text-[12.5px] underline" style={{ color: INK }} onClick={() => setPwOpen((v) => !v)}>
                {pwOpen ? "Cerrar" : "Cambiar"}
              </button>
            }
          />
          {pwOpen && (
            <div className="mt-2 mb-4 pl-0">
              <Field label="Contraseña actual" value={pwCurrent} onChange={setPwCurrent} />
              <Field label="Nueva contraseña" value={pwNew} onChange={setPwNew} />
              {pwError && <p className="text-[12px] mb-2" style={{ color: "#A6533F" }}>{pwError}</p>}
              <button
                type="button"
                onClick={handleChangePassword}
                disabled={pwSaving || !pwCurrent || !pwNew}
                className="rounded-full text-[12.5px] font-medium px-4"
                style={{ height: 38, background: INK, color: PAGE_BG, opacity: pwSaving || !pwCurrent || !pwNew ? 0.6 : 1 }}
              >
                {pwSaving ? "Guardando…" : "Confirmar cambio"}
              </button>
            </div>
          )}
          <Row
            title="Cuentas vinculadas"
            sub={linkedProvider || "Ninguna"}
            right={linkedProvider ? <Pill tone="ok"><Check size={11} /> Conectada</Pill> : null}
          />
        </Section>

        {/* Zona de cuenta */}
        <Section>
          <button className="flex items-center gap-2 text-[13.5px]" style={{ color: INK }} onClick={logout}>
            <LogOut size={15} /> Cerrar sesión
          </button>
        </Section>
      </div>

      {reacceptOpen && (
        <div className="fixed inset-0 z-[200] overflow-y-auto" style={{ background: "rgba(26,23,18,0.55)" }}>
          <div className="max-w-[560px] mx-auto pt-6 px-4">
            <button
              type="button"
              onClick={() => setReacceptOpen(false)}
              className="text-[12.5px] underline mb-3"
              style={{ color: "#FAF7F1" }}
            >
              ← Volver a Configuración
            </button>
            <AceptacionRegistro onComplete={handleReacceptComplete} />
          </div>
        </div>
      )}
    </div>
  );
}
