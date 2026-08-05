"use client";

type SegmentedControlProps = {
  options: { value: string; label: string }[];
  value: string;
  onChange: (val: string) => void;
};

export default function SegmentedControl({ options, value, onChange }: SegmentedControlProps) {
  return (
    <div style={{ display: "flex", height: 48, gap: 6 }}>
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              flex: 1, height: "100%", borderRadius: 12,
              border: selected ? "1px solid #2B2621" : "1px solid #E7DFC9",
              background: selected ? "#2B2621" : "#FFFFFF",
              fontFamily: "Fraunces, Georgia, serif", fontWeight: 600,
              fontSize: 14, color: selected ? "#F3EFE6" : "#8A8377",
              cursor: "pointer", transition: "all .15s ease",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
