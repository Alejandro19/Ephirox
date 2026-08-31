"use client";

type BrandRingProps = {
  size?: number;
  // Ya no se usa para recortar un "donut" (el sello es un trazo abierto,
  // no una banda rellena) — se mantiene opcional para no forzar editar los
  // ~8 call sites existentes (topbars, MemberCard, pantallas de auth).
  background?: string;
};

const EPH_ACCENT = "#C9A46A";

// Sello "anillo abierto": dos arcos concéntricos desalineados (cada uno con
// un hueco propio vía stroke-dasharray) + un punto central bronce — la marca
// Ephirox definitiva. Sin degradados ni relleno: solo trazo fino monocromo,
// acorde a la identidad reservada/precisa (nunca el anillo multicolor de
// wellness genérico de la marca anterior).
export default function BrandRing({ size = 24 }: BrandRingProps) {
  const c = size / 2;
  const strokeOuter = Math.max(1, size * 0.045);
  const strokeInner = Math.max(1, size * 0.035);
  const rOuter = c - strokeOuter * 1.4;
  const rInner = rOuter - size * 0.16;
  const circOuter = 2 * Math.PI * rOuter;
  const circInner = 2 * Math.PI * rInner;
  const dotRadius = size * 0.05;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      focusable="false"
      style={{ flexShrink: 0 }}
    >
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
  );
}
