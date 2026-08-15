"use client";

import { useId } from "react";

type SliderFieldProps = {
  value: number;
  onChange: (val: number) => void;
  min: number;
  max: number;
  label?: string;
  minLabel?: string;
  maxLabel?: string;
  id?: string;
};

export default function SliderField({
  value, onChange, min, max, label, minLabel, maxLabel, id,
}: SliderFieldProps) {
  const autoId = useId();
  const sliderId = id || autoId;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between",
        alignItems: "center", lineHeight: "16px", marginBottom: 4 }}>
        {label && (
          <div style={{ display: "inline-flex", alignItems: "center", fontSize: 12, lineHeight: "16px", fontWeight: 400, color: "var(--ink-secondary)" }}>
            <label htmlFor={sliderId} style={{ cursor: "pointer" }}>{label}</label>
          </div>
        )}
        <span style={{ fontSize: 14.5, lineHeight: "16px", fontWeight: 600, color: "var(--ink)" }}>{value}</span>
      </div>
      <div style={{ height: 36, display: "flex", alignItems: "center", boxSizing: "border-box" }}>
        <input
          type="range"
          id={sliderId}
          min={min} max={max} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ width: "100%", accentColor: "var(--ring-accent)" }}
        />
      </div>
      {(minLabel || maxLabel) && (
        <div style={{ display: "flex", justifyContent: "space-between",
          fontSize: 9, color: "var(--ink-secondary)", marginTop: 4 }}>
          <span>{minLabel || min}</span>
          <span>{maxLabel || max}</span>
        </div>
      )}
    </div>
  );
}
