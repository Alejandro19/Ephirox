"use client";

type SelectFieldProps = {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  label?: string;
  placeholder?: string;
};

export default function SelectField({ value, onChange, options, label, placeholder }: SelectFieldProps) {
  return (
    <div>
      {label && (
        <div style={{ display: "flex", alignItems: "center", fontSize: 13, fontWeight: 600,
          color: "var(--ink-soft)", marginBottom: 8 }}>
          <span style={{ marginRight: 6, color: "#5B7A4E", fontSize: 14 }}>📋</span>
          {label}
        </div>
      )}
      <div style={{ position: "relative", background: "#FFFFFF", border: "1px solid #E7DFC9",
        borderRadius: 12, height: 48, boxSizing: "border-box" }}>
        <select value={value} onChange={(e) => onChange(e.target.value)}
          style={{ width: "100%", height: "100%", appearance: "none",
            WebkitAppearance: "none", background: "transparent", border: "none",
            padding: "0 34px 0 14px", fontSize: 15, color: "#2B2621" }}>
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <span style={{ position: "absolute", right: 14, top: "50%",
          transform: "translateY(-50%)", color: "#B0A99C",
          pointerEvents: "none", fontSize: 12 }}>▼</span>
      </div>
    </div>
  );
}
