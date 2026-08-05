"use client";

type SliderFieldProps = {
  value: number;
  onChange: (val: number) => void;
  min: number;
  max: number;
  label?: string;
  minLabel?: string;
  maxLabel?: string;
};

export default function SliderField({
  value, onChange, min, max, label, minLabel, maxLabel,
}: SliderFieldProps) {
  return (
    <div
      style={{
        background: "#FFFFFF", border: "1px solid #E7DFC9",
        borderRadius: 12, padding: "14px 16px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: 8 }}>
        {label && (
          <span style={{ display: "inline-flex", alignItems: "center",
            fontSize: 12, fontWeight: 600, color: "#2B2621" }}>
            <span style={{ marginRight: 6, color: "#5B7A4E", fontSize: 14 }}>🎚️</span>
            {label}
          </span>
        )}
        <span style={{ fontFamily: "Fraunces, Georgia, serif", fontWeight: 700,
          fontSize: 18, color: "#5B7A4E" }}>{value}</span>
      </div>
      <input
        type="range"
        min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "#5B7A4E" }}
      />
      {(minLabel || maxLabel) && (
        <div style={{ display: "flex", justifyContent: "space-between",
          fontSize: 9, color: "#B0A99C", marginTop: 4 }}>
          <span>{minLabel || min}</span>
          <span>{maxLabel || max}</span>
        </div>
      )}
    </div>
  );
}
