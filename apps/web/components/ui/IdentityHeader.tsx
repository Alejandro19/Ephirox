"use client";

type IdentityHeaderProps = {
  title: string;
  subtitle?: string;
};

export default function IdentityHeader({ title, subtitle }: IdentityHeaderProps) {
  return (
    <div
      className="font-display"
      style={{ marginBottom: 32, paddingBottom: 20, borderBottom: "1px solid var(--eph-line)" }}
    >
      <h1
        style={{
          fontSize: "clamp(28px, 3.2vw, 38px)",
          fontWeight: 400,
          margin: "0 0 8px",
          color: "var(--eph-text)",
          lineHeight: 1.15,
        }}
      >
        {title}
      </h1>
      {subtitle && (
        <p
          className="font-mono"
          style={{
            fontSize: 11,
            color: "var(--eph-muted)",
            margin: 0,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            fontWeight: 400,
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
