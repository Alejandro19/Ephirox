"use client";

import { IconLock } from "./icons";

type LockedOverlayProps = {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  ctaLabel?: string;
  onCta?: () => void;
};

export default function LockedOverlay({
  children,
  title,
  subtitle,
  ctaLabel = "Desbloquear",
  onCta,
}: LockedOverlayProps) {
  return (
    <div style={{ position: "relative" }}>
      <div
        aria-hidden="true"
        style={{ filter: "blur(3px)", opacity: 0.5, pointerEvents: "none", userSelect: "none" }}
      >
        {children}
      </div>
      <div
        style={{
          background: "var(--paper)",
          border: "1px solid var(--border-hairline)",
          borderRadius: "var(--radius-card)",
          padding: "26px 24px",
          textAlign: "center",
          marginTop: -14,
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 10, color: "var(--ring-accent)" }}>
          <IconLock size={26} />
        </div>
        <h3
          style={{
            fontFamily: "Fraunces, Georgia, serif",
            fontSize: 17,
            margin: "0 0 6px",
            color: "var(--ink)",
          }}
        >
          {title}
        </h3>
        <p style={{ fontSize: 13, color: "var(--ink-secondary)", margin: "0 0 16px" }}>
          {subtitle}
        </p>
        {onCta && (
          <button
            onClick={onCta}
            style={{
              padding: "10px 22px",
              borderRadius: "9999px",
              background: "var(--ring-accent)",
              color: "#fff",
              border: "none",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {ctaLabel}
          </button>
        )}
      </div>
    </div>
  );
}