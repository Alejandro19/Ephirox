"use client";

import type { ReactNode } from "react";

type MetricValueSize = "default" | "secondary";

type MetricValueProps = {
  value: ReactNode;
  unit?: string;
  size?: MetricValueSize;
};

// Cifra + unidad de toda fila de KPIs/índice/métrica (spec §3.3). "default"
// es el KPI de rejilla (44px); "secondary" cubre métricas más chicas (HRV,
// cortisol, recuperación) a 32px. La cifra usa Cormorant con figuras
// tabulares (.eph-num, tema.css) — nunca corregir el desnivel con otra
// familia, más peso o escalado manual.
const SIZE_CONFIG: Record<MetricValueSize, { valuePx: number; gap: number }> = {
  default: { valuePx: 44, gap: 8 },
  secondary: { valuePx: 32, gap: 6 },
};

export default function MetricValue({ value, unit, size = "default" }: MetricValueProps) {
  const { valuePx, gap } = SIZE_CONFIG[size];
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap }}>
      <span
        className="eph-num"
        style={{
          fontFamily: "var(--font-cormorant), serif",
          fontWeight: 300,
          fontSize: valuePx,
          lineHeight: 1,
          color: "var(--eph-text)",
        }}
      >
        {value}
      </span>
      {unit && (
        <span
          className="font-mono"
          style={{
            fontSize: 11,
            fontWeight: 400,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--eph-muted)",
          }}
        >
          {unit}
        </span>
      )}
    </span>
  );
}
