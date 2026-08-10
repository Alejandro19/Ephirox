"use client";

import { useState } from "react";
import { createModule } from "../../../lib/roles-client";
import { showToast } from "../../layout/AppShell";

type RolesAddModuleBarProps = {
  onCreated: () => void;
};

export default function RolesAddModuleBar({ onCreated }: RolesAddModuleBarProps) {
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    const trimmed = label.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await createModule(trimmed);
      setLabel("");
      onCreated();
      showToast("Módulo agregado.", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Error al agregar el módulo.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Nombre del nuevo módulo"
        style={{
          flex: 1,
          height: 36,
          borderRadius: 0,
          border: "none",
          borderBottom: "1px solid var(--border-input)",
          background: "transparent",
          padding: "0 2px 6px",
          fontSize: 13,
          color: "var(--ink)",
        }}
      />
      <button
        type="button"
        disabled={saving || !label.trim()}
        onClick={handleAdd}
        style={{
          borderRadius: "9999px",
          border: "none",
          background: "var(--ring-accent)",
          color: "#fff",
          padding: "0 20px",
          fontSize: 13,
          fontWeight: 600,
          cursor: saving ? "not-allowed" : "pointer",
          opacity: saving || !label.trim() ? 0.6 : 1,
        }}
      >
        {saving ? "Agregando…" : "+ Agregar módulo"}
      </button>
    </div>
  );
}
