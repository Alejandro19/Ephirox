"use client";

type DotState = "done" | "pending" | "shield" | "default";

type WeekDotsProps = {
  days: { label: string; state: DotState }[];
};

function dotStyle(s: DotState): React.CSSProperties {
  const base: React.CSSProperties = {
    width: 34, height: 34, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 13, flexShrink: 0, transition: "all .3s ease",
  };
  switch (s) {
    case "done":   return { ...base, background: "var(--hero-espresso-accent)", border: "1px solid var(--hero-espresso-accent)", color: "#fff" };
    case "pending": return { ...base, border: "1px solid var(--border-input)", color: "var(--ink-secondary)", fontWeight: 700 };
    case "shield": return { ...base, background: "#F1EAF7", border: "1px solid #E1D5EE", color: "#8A5FA0" };
    default:       return { ...base, background: "var(--page-bg)", border: "1px solid var(--border-hairline)", color: "var(--ink-secondary)" };
  }
}

export default function WeekDots({ days }: WeekDotsProps) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      {days.map((d, i) => (
        <span key={i} style={dotStyle(d.state)} title={d.label}>
          {d.label}
        </span>
      ))}
    </div>
  );
}
