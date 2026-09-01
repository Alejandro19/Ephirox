"use client";

type BrandRingProps = {
  size?: number;
  // Ya no se usa para recortar un "donut" (el sello es un trazo abierto,
  // no una banda rellena) — se mantiene opcional para no forzar editar los
  // ~8 call sites existentes (topbars, MemberCard, pantallas de auth).
  background?: string;
};

type RingConfig = { strokeWidth: number; dotR: number; showInner: boolean };

// Tabla exacta del isotipo (spec Prompt 02 §1.1, "no negociable"): a menor
// tamaño el trazo engrosa y se pierde el anillo interior (legibilidad) —
// nunca al revés. r=62/47/4 y los dasharray/rotate son fijos en las 132
// unidades del viewBox; solo cambian por tamaño el grosor del trazo, el
// radio del punto y si el anillo interior se muestra.
function ringConfig(size: number): RingConfig {
  if (size >= 100) return { strokeWidth: 1.4, dotR: 4, showInner: true }; // Login (118)
  if (size >= 55) return { strokeWidth: 1.6, dotR: 5, showInner: true }; // Header de app (74)
  if (size >= 33) return { strokeWidth: 3, dotR: 6, showInner: false }; // Membresía / documento (34)
  return { strokeWidth: 4, dotR: 7, showInner: false }; // Ícono de app / favicon (24–40)
}

// Sello "anillo abierto": dos arcos concéntricos de trazo fino, cada uno
// con su propia abertura (stroke-dasharray) y rotados en direcciones
// opuestas, más un punto central — la marca Ephirox definitiva. Sin
// relleno, sin glow, sin degradado detrás, sin puntas redondeadas.
//
// Dos tonos, nunca uno: el anillo exterior va en --eph-accent (oro); el
// interior NUNCA en oro — va en --eph-faint (--tx4, ya semitransparente),
// visiblemente más apagado. Ese contraste entre anillos es la marca; con
// un solo tono el logo se vuelve genérico.
//
// El color se fija por CSS (style, var(--eph-*)), nunca por atributo de
// presentación — así el isotipo hereda el tema (spec §4.1) y queda
// idéntico píxel a píxel entre los 3 temas salvo el color del trazo.
export default function BrandRing({ size = 24 }: BrandRingProps) {
  const { strokeWidth, dotR, showInner } = ringConfig(size);
  return (
    <svg width={size} height={size} viewBox="0 0 132 132" fill="none" aria-label="Ephirox" style={{ flexShrink: 0 }}>
      <circle
        cx={66}
        cy={66}
        r={62}
        style={{ stroke: "var(--eph-accent)" }}
        strokeWidth={strokeWidth}
        strokeDasharray="330 60"
        transform="rotate(-58 66 66)"
      />
      {showInner && (
        <circle
          cx={66}
          cy={66}
          r={47}
          style={{ stroke: "var(--eph-faint)" }}
          strokeWidth={strokeWidth}
          strokeDasharray="250 45"
          transform="rotate(122 66 66)"
        />
      )}
      <circle cx={66} cy={66} r={dotR} style={{ fill: "var(--eph-accent)" }} />
    </svg>
  );
}
