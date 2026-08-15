"use client";

import type { ReactNode } from "react";

type RingProgressColor = "gradient" | "espresso" | "piedra";

type RingProgressProps = {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: RingProgressColor;
  trackColor?: string;
  children?: ReactNode;
};

const GRADIENT_ID = "ring-progress-gradient";

const SOLID_STROKE: Record<Exclude<RingProgressColor, "gradient">, string> = {
  espresso: "var(--hero-espresso-accent)",
  piedra: "var(--hero-piedra-accent)",
};

export default function RingProgress({
  value,
  size = 64,
  strokeWidth = 5,
  color = "piedra",
  trackColor = "var(--border-hairline)",
  children,
}: RingProgressProps) {
  const pct = Math.max(0, Math.min(100, value));
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const filled = (pct / 100) * circ;
  const stroke = color === "gradient" ? `url(#${GRADIENT_ID})` : SOLID_STROKE[color];

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        style={{ transform: "rotate(-90deg)" }}
      >
        {color === "gradient" && (
          <defs>
            <linearGradient id={GRADIENT_ID} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D9B77E" />
              <stop offset="35%" stopColor="#D97E5F" />
              <stop offset="68%" stopColor="#8A5FA0" />
              <stop offset="100%" stopColor="#5B8F6B" />
            </linearGradient>
          </defs>
        )}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={trackColor} strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={`${filled.toFixed(1)} ${circ.toFixed(1)}`}
        />
      </svg>
      {children !== undefined ? (
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          alignItems: "center", justifyContent: "center",
        }}>
          {children}
        </div>
      ) : (
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          alignItems: "center", justifyContent: "center",
          fontSize: size * 0.22, fontWeight: 700, color: "var(--ink)",
        }}>
          {Math.round(pct)}%
        </div>
      )}
    </div>
  );
}
