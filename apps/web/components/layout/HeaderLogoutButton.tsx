"use client";

import { useState } from "react";

// Acceso directo de logout en la cabecera (spec §7.4) — mismo tratamiento
// fantasma que la campana (34×34, borde solo en hover). No reemplaza el
// "Cerrar sesión" del menú de la cuenta, solo agrega un atajo. Compartido
// entre ClientTopbar y AdminTopbar — antes solo vivía en el primero.
export default function HeaderLogoutButton({ onClick }: { onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label="Cerrar sesión"
      style={{
        width: 34,
        height: 34,
        background: "transparent",
        border: `1px solid ${hover ? "var(--eph-line-2)" : "transparent"}`,
        borderRadius: "50%",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: hover ? "var(--eph-text)" : "var(--eph-body)",
        transition: "color 180ms ease, border-color 180ms ease",
        flexShrink: 0,
      }}
    >
      <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.2 4.6H18a1.4 1.4 0 0 1 1.4 1.4v12a1.4 1.4 0 0 1-1.4 1.4h-3.8" />
        <path d="M9.6 8.4 5.4 12l4.2 3.6M5.4 12h9" />
      </svg>
    </button>
  );
}
