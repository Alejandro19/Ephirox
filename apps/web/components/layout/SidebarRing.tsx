"use client";

import { MODULE_THEME } from "../../lib/constants";

type SidebarRingProps = {
  viewKey: string;
};

// El anillo ya no codifica el módulo por color (puntos/arcos de color por
// módulo quedaron eliminados del sistema de diseño) — es una marca decorativa
// fija en --ring-accent; solo la leyenda de abajo cambia según el módulo.
export default function SidebarRing({ viewKey }: SidebarRingProps) {
  const cfg = MODULE_THEME[viewKey];
  const ringLabel = cfg?.ringLabel ?? "La Tribu";

  return (
    <div className="sidebar-ring-wrap" style={{ textAlign: "center", margin: "4px 0 22px" }}>
      <svg viewBox="0 0 100 100" width="80" height="80" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border-hairline)" strokeWidth="8" />
        <circle cx="50" cy="50" r="40" fill="none" stroke="var(--ring-accent)" strokeWidth="8" strokeLinecap="round" strokeDasharray="205 251" />
      </svg>
      <div
        className="sidebar-ring-label"
        style={{
          fontSize: "10.5px",
          color: "var(--ink-secondary)",
          textAlign: "center",
          marginTop: "8px",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {ringLabel}
      </div>
    </div>
  );
}