import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

const EPH_BG = "#080807";
const EPH_ACCENT = "#C9A46A";

// Mismo sello "anillo abierto" que BrandRing.tsx (dos arcos concéntricos
// desalineados + punto central) — geometría recalculada a mano porque
// ImageResponse/Satori no puede montar el componente React original,
// solo JSX estático evaluado en request-time.
function ring(size: number) {
  const c = size / 2;
  const strokeOuter = Math.max(1, size * 0.05);
  const strokeInner = Math.max(1, size * 0.04);
  const rOuter = c - strokeOuter * 1.4;
  const rInner = rOuter - size * 0.18;
  const circOuter = 2 * Math.PI * rOuter;
  const circInner = 2 * Math.PI * rInner;
  const dotRadius = size * 0.06;
  return { c, strokeOuter, strokeInner, rOuter, rInner, circOuter, circInner, dotRadius };
}

export default function Icon() {
  const markSize = 24;
  const { c, strokeOuter, strokeInner, rOuter, rInner, circOuter, circInner, dotRadius } = ring(markSize);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: EPH_BG,
        }}
      >
        <svg width={markSize} height={markSize} viewBox={`0 0 ${markSize} ${markSize}`}>
          <circle
            cx={c}
            cy={c}
            r={rOuter}
            fill="none"
            stroke={EPH_ACCENT}
            strokeWidth={strokeOuter}
            strokeDasharray={`${circOuter * 0.86} ${circOuter * 0.14}`}
            transform={`rotate(-90 ${c} ${c})`}
          />
          <circle
            cx={c}
            cy={c}
            r={rInner}
            fill="none"
            stroke={EPH_ACCENT}
            strokeWidth={strokeInner}
            strokeDasharray={`${circInner * 0.78} ${circInner * 0.22}`}
            transform={`rotate(70 ${c} ${c})`}
          />
          <circle cx={c} cy={c} r={dotRadius} fill={EPH_ACCENT} />
        </svg>
      </div>
    ),
    { ...size }
  );
}
