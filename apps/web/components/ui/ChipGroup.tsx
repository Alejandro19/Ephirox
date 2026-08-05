"use client";

type ChipGroupProps = {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (vals: string[]) => void;
  label?: string;
  max?: number;
};

export default function ChipGroup({ options, selected, onChange, label, max }: ChipGroupProps) {
  const toggle = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter((v) => v !== val));
    } else {
      if (max && selected.length >= max) return;
      onChange([...selected, val]);
    }
  };

  return (
    <div>
      {label && (
        <div style={{ display: "flex", alignItems: "center", fontSize: 13, fontWeight: 600,
          color: "var(--ink-soft)", marginBottom: 8 }}>
          <span style={{ marginRight: 6, color: "#5B7A4E", fontSize: 14 }}>🏷️</span>
          {label}
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {options.map((opt) => {
          const isSel = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              style={{
                padding: "6px 14px", borderRadius: 10, fontSize: 12, fontWeight: 500,
                border: isSel ? "1px solid var(--terracota)" : "1px solid var(--line)",
                background: isSel ? "var(--terracota)" : "var(--cream)",
                color: isSel ? "#fff" : "var(--ink-soft)",
                cursor: "pointer", transition: "all .15s ease",
              }}
            >
              {opt.label} {isSel ? "✓" : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}
