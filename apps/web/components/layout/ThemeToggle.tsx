"use client";

import { useThemeMode } from "./ThemeRoot";

// Píldora CARBÓN/CLARO — spec §1.3 y §5.7. Se coloca en la barra superior,
// a la izquierda del contador de notificaciones (ClientTopbar, paso
// siguiente). No se renderiza en pantallas de marca (dark-brand).
export default function ThemeToggle() {
  const { mode, toggleMode, isBrandLocked } = useThemeMode();

  if (isBrandLocked) return null;

  const label = mode === "light" ? "CLARO" : "CARBÓN";

  return (
    <button
      type="button"
      onClick={toggleMode}
      aria-pressed={mode === "light"}
      aria-label="Cambiar entre tema carbón y tema claro"
      className="inline-flex flex-shrink-0 items-center justify-center"
      style={{ minWidth: 44, minHeight: 44 }}
    >
      <span
        className="inline-flex items-center justify-center rounded-[999px] border font-mono text-[10px] uppercase tracking-[0.18em]"
        style={{
          height: 34,
          padding: "0 14px",
          borderColor: "var(--eph-accent-line)",
          color: "var(--eph-text)",
          background: "var(--eph-accent-soft)",
        }}
      >
        {label}
      </span>
    </button>
  );
}
