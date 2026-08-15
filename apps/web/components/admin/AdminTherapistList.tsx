"use client";

import { useEffect, useState, useCallback } from "react";
import {
  adminListTherapists,
  adminUpdateTherapist,
  adminDeleteTherapist,
  type Therapist,
} from "../../lib/blindspot-client";
import { showToast } from "../layout/AppShell";

const inputStyle: React.CSSProperties = {
  width: "100%", height: 32, borderRadius: 0,
  border: "none", borderBottom: "1px solid var(--border-input)", padding: "0 2px 6px", fontSize: 13,
  fontWeight: 600, background: "transparent", color: "var(--ink)", outline: "none",
  boxSizing: "border-box",
};

const thStyle: React.CSSProperties = {
  textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 600,
  color: "var(--ink-secondary)", textTransform: "uppercase",
  letterSpacing: "0.04em", borderBottom: "1px solid var(--border-hairline)",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 16px", fontSize: 13, color: "var(--ink)",
  verticalAlign: "middle",
};

function statusBadgeStyle(active: boolean): React.CSSProperties {
  return {
    display: "inline-block", padding: "3px 10px", borderRadius: "9999px",
    fontSize: 11, fontWeight: 600,
    background: active ? "rgba(201,166,107,.14)" : "var(--border-hairline)",
    color: active ? "var(--ring-accent)" : "var(--ink-secondary)",
  };
}

type EditDraft = { name: string; email: string; specialty: string; phone: string };

function draftFromTherapist(t: Therapist): EditDraft {
  return { name: t.name, email: t.email, specialty: t.specialty || "", phone: t.phone || "" };
}

export default function AdminTherapistList() {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setTherapists(await adminListTherapists()); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Error al cargar terapeutas."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function startEdit(t: Therapist) {
    setEditingId(t.id);
    setEditDraft(draftFromTherapist(t));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft(null);
  }

  async function handleSaveEdit(id: string) {
    if (!editDraft || !editDraft.name.trim() || !editDraft.email.trim()) {
      showToast("Nombre y email son obligatorios.", "error");
      return;
    }
    setSaving(true);
    try {
      await adminUpdateTherapist(id, {
        name: editDraft.name.trim(),
        email: editDraft.email.trim(),
        specialty: editDraft.specialty.trim() || null,
        phone: editDraft.phone.trim() || null,
      });
      showToast("Terapeuta actualizado.", "success");
      cancelEdit();
      await load();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Error al actualizar el terapeuta.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(t: Therapist) {
    try {
      await adminUpdateTherapist(t.id, { active: !t.active });
      await load();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Error al actualizar el terapeuta.", "error");
    }
  }

  async function handleDelete(t: Therapist) {
    if (!window.confirm(`¿Eliminar a "${t.name}" del sistema? Esta acción no se puede deshacer.`)) return;
    try {
      await adminDeleteTherapist(t.id);
      showToast("Terapeuta eliminado.", "success");
      await load();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Error al eliminar el terapeuta.", "error");
    }
  }

  if (loading) return <p style={{ color: "var(--ink-secondary)", fontSize: 14 }}>Cargando terapeutas…</p>;
  if (error) return <p style={{ color: "var(--danger)", fontSize: 14 }}>{error}</p>;

  return (
    <div style={{
      background: "var(--paper)", border: "1px solid var(--border-hairline)",
      borderRadius: "var(--radius-card)", padding: "22px 24px", marginTop: 20,
    }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", margin: "0 0 16px" }}>Terapeutas</h3>
      <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 640 }}>
        <thead>
          <tr>{["Nombre", "Email", "Especialidad", "Teléfono", "Estado", ""].map((h) => (
            <th key={h} style={thStyle}>{h}</th>))}</tr>
        </thead>
        <tbody>
          {therapists.map((t) => {
            const editing = editingId === t.id;
            return (
              <tr key={t.id} style={{ borderBottom: "1px solid var(--border-hairline)" }}>
                {editing && editDraft ? (
                  <>
                    <td style={tdStyle}>
                      <input aria-label={`Nombre-${t.id}`} style={inputStyle} value={editDraft.name}
                        onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })} />
                    </td>
                    <td style={tdStyle}>
                      <input aria-label={`Email-${t.id}`} style={inputStyle} value={editDraft.email}
                        onChange={(e) => setEditDraft({ ...editDraft, email: e.target.value })} />
                    </td>
                    <td style={tdStyle}>
                      <input aria-label={`Especialidad-${t.id}`} style={inputStyle} value={editDraft.specialty}
                        onChange={(e) => setEditDraft({ ...editDraft, specialty: e.target.value })} />
                    </td>
                    <td style={tdStyle}>
                      <input aria-label={`Teléfono-${t.id}`} style={inputStyle} value={editDraft.phone}
                        onChange={(e) => setEditDraft({ ...editDraft, phone: e.target.value })} />
                    </td>
                    <td style={tdStyle}><span style={statusBadgeStyle(t.active)}>{t.active ? "activo" : "inactivo"}</span></td>
                    <td style={{ ...tdStyle, textAlign: "right", whiteSpace: "nowrap" }}>
                      <button type="button" disabled={saving} onClick={() => handleSaveEdit(t.id)}
                        style={{ marginRight: 6, borderRadius: "9999px", border: "none", background: "var(--ring-accent)",
                          color: "#fff", fontSize: 12, fontWeight: 600, padding: "6px 14px", cursor: "pointer" }}>
                        {saving ? "Guardando…" : "Guardar"}
                      </button>
                      <button type="button" onClick={cancelEdit}
                        style={{ borderRadius: "9999px", border: "1px solid var(--border-hairline)", background: "transparent",
                          color: "var(--ink-secondary)", fontSize: 12, fontWeight: 600, padding: "6px 14px", cursor: "pointer" }}>
                        Cancelar
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={tdStyle}><span style={{ fontWeight: 600 }}>{t.name}</span></td>
                    <td style={tdStyle}><span style={{ color: "var(--ink-secondary)" }}>{t.email}</span></td>
                    <td style={tdStyle}>{t.specialty || "—"}</td>
                    <td style={tdStyle}>{t.phone || "—"}</td>
                    <td style={tdStyle}><span style={statusBadgeStyle(t.active)}>{t.active ? "activo" : "inactivo"}</span></td>
                    <td style={{ ...tdStyle, textAlign: "right", whiteSpace: "nowrap" }}>
                      <button type="button" onClick={() => startEdit(t)}
                        style={{ marginRight: 6, borderRadius: "9999px", border: "1px solid var(--border-hairline)", background: "transparent",
                          color: "var(--ink-secondary)", fontSize: 12, fontWeight: 600, padding: "6px 14px", cursor: "pointer" }}>
                        Editar
                      </button>
                      <button type="button" onClick={() => handleToggleActive(t)}
                        style={{ marginRight: 6, borderRadius: "9999px", border: "1px solid var(--border-hairline)", background: "transparent",
                          color: "var(--ink-secondary)", fontSize: 12, fontWeight: 600, padding: "6px 14px", cursor: "pointer" }}>
                        {t.active ? "Desactivar" : "Activar"}
                      </button>
                      <button type="button" onClick={() => handleDelete(t)}
                        style={{ borderRadius: "9999px", border: "1px solid var(--danger)", background: "transparent",
                          color: "var(--danger)", fontSize: 12, fontWeight: 600, padding: "6px 14px", cursor: "pointer" }}>
                        Eliminar
                      </button>
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
      {therapists.length === 0 && <p style={{ textAlign: "center",
        color: "var(--ink-secondary)", fontSize: 13, padding: "32px 0" }}>
        No hay terapeutas registrados.</p>}
    </div>
  );
}
