"use client";

import { useId } from "react";

type ChevronStepperProps = {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  id?: string;
};

export default function ChevronStepper({
  value, onChange, min = 0, max, step = 1, label, id,
}: ChevronStepperProps) {
  const autoId = useId();
  const outputId = id || autoId;
  return (
    <div>
      {label && (
        <div style={{ display: "flex", alignItems: "center", fontSize: 12, fontWeight: 400,
          color: "var(--ink-secondary)", marginBottom: 8 }}>
          <label htmlFor={outputId}>{label}</label>
        </div>
      )}
      <div style={{ height: 36, display: "flex", alignItems: "center",
        justifyContent: "space-between", borderBottom: "1px solid var(--border-input)",
        padding: "0 2px", boxSizing: "border-box" }}>
        <output id={outputId} style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)" }}>{value}</output>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <button type="button" aria-label={label ? `Aumentar ${label}` : "Aumentar"} onClick={() => {
            const n = value + step;
            if (max != null && n > max) return;
            onChange(n);
          }}
            style={{ border: "none", background: "none", padding: 0, lineHeight: 1,
              fontSize: 11, color: "var(--ink-secondary)", cursor: "pointer" }}>
            ▲
          </button>
          <button type="button" aria-label={label ? `Disminuir ${label}` : "Disminuir"} onClick={() => {
            const n = value - step;
            if (n < min) return;
            onChange(n);
          }}
            style={{ border: "none", background: "none", padding: 0, lineHeight: 1,
              fontSize: 11, color: "var(--ink-secondary)", cursor: "pointer" }}>
            ▼
          </button>
        </div>
      </div>
    </div>
  );
}
