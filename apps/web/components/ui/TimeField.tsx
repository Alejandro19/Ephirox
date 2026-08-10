"use client";

import { useId } from "react";

type TimeFieldProps = {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  id?: string;
};

export default function TimeField({ value, onChange, label, id }: TimeFieldProps) {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <div>
      {label && (
        <div style={{ display: "flex", alignItems: "center", fontSize: 12, fontWeight: 400,
          color: "var(--ink-secondary)", marginBottom: 8 }}>
          <label htmlFor={fieldId} style={{ cursor: "pointer" }}>{label}</label>
        </div>
      )}
      <div style={{ background: "transparent", borderBottom: "1px solid var(--border-input)",
        borderRadius: 0, height: 36, display: "flex", alignItems: "center",
        padding: "0 2px", boxSizing: "border-box" }}>
        <input
          type="time"
          id={fieldId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ border: "none", background: "transparent", fontWeight: 600,
            color: "var(--ink)", fontSize: 14.5, width: "100%", height: "100%", padding: 0 }}
        />
      </div>
    </div>
  );
}
