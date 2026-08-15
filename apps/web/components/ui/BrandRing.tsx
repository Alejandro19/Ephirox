"use client";

type BrandRingProps = {
  size?: number;
  background: string;
};

// Mismo anillo degradado que BrandRing en las pantallas de login (y el
// spinner de carga de AppShell) — acá como marca estática junto al wordmark
// "La Tribu" en los topbars. `background` debe matchear el fondo detrás del
// anillo (el topbar, no el panel oscuro del login) para que el círculo
// interior se vea como un "donut" recortado en vez de un cuadrado visible.
export default function BrandRing({ size = 24, background }: BrandRingProps) {
  const thickness = Math.round(size * 0.12);
  return (
    <div aria-hidden style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <div
        style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: "conic-gradient(from 0deg, #D9B77E, #D97E5F, #8A5FA0, #5B8F6B, #D9B77E)",
        }}
      />
      <div style={{ position: "absolute", inset: thickness, borderRadius: "50%", background }} />
    </div>
  );
}
