import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const EPH_BG = "#080807";
const EPH_ACCENT = "#C9A46A";

// Mismo sello que icon.tsx, a mayor tamaño para el ícono de pantalla de
// inicio de iOS (que aplica su propio recorte redondeado sobre este bg
// sólido — por eso, a diferencia del favicon, no se usa el halo radial
// del login para no competir con esa máscara).
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

export default function AppleIcon() {
  const markSize = 96;
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
