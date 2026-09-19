import type { ReactNode, CSSProperties } from "react";

const subCardStyle: CSSProperties = {
  background: "color-mix(in srgb, var(--eph-surface) 55%, var(--eph-surface-2) 45%)",
  border: "1px solid var(--eph-line)",
  borderRadius: 12,
  padding: "20px 24px",
  marginBottom: 20,
};

const kickerStyle: CSSProperties = {
  display: "block",
  fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "var(--eph-accent)",
  marginBottom: 14,
};

// Caja visual reutilizable para separar grupos de campos dentro de un panel
// grande (spec 26.1) — ningún grupo debe "flotar suelto" en un contenedor
// único; cada uno lleva su propio fondo, borde y kicker dorado.
export default function SubCard({
  kicker,
  children,
  style,
}: {
  kicker: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div style={{ ...subCardStyle, ...style }}>
      <span style={kickerStyle}>{kicker}</span>
      {children}
    </div>
  );
}
