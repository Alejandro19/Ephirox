"use client";

type ChevronStepperProps = {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
};

export default function ChevronStepper({
  value, onChange, min = 0, max, step = 1, label,
}: ChevronStepperProps) {
  return (
    <div>
      {label && (
        <div style={{ display: "flex", alignItems: "center", fontSize: 13, fontWeight: 600,
          color: "var(--ink-soft)", marginBottom: 8 }}>
          <span style={{ marginRight: 6, color: "#5B7A4E", fontSize: 14 }}>🔢</span>
          {label}
        </div>
      )}
      <div style={{ height: 48, display: "flex", alignItems: "center",
        justifyContent: "space-between", border: "1px solid #E7DFC9",
        borderRadius: 12, background: "#FFFFFF", padding: "0 16px", boxSizing: "border-box" }}>
        <span style={{ fontFamily: "Fraunces, Georgia, serif", fontWeight: 700,
          fontSize: 18, color: "#2B2621" }}>{value}</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <button type="button" onClick={() => {
            const n = value + step;
            if (max != null && n > max) return;
            onChange(n);
          }}
            style={{ border: "none", background: "none", padding: 0, lineHeight: 1,
              fontSize: 11, color: "#B0A99C", cursor: "pointer" }}>
            ▲
          </button>
          <button type="button" onClick={() => {
            const n = value - step;
            if (n < min) return;
            onChange(n);
          }}
            style={{ border: "none", background: "none", padding: 0, lineHeight: 1,
              fontSize: 11, color: "#B0A99C", cursor: "pointer" }}>
            ▼
          </button>
        </div>
      </div>
    </div>
  );
}
