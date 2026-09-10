'use client';

import { useEffect, useRef, useState } from 'react';
import { COSTOS_MOBILE } from './content';

// Versión mobile de la grilla de 3 costos (desktop: .costos-grid en
// LandingPage.tsx, sin tocar) — carrusel de scroll-snap nativo en vez de una
// librería de carrusel con JS, mismo criterio que PasosMobileList.tsx (menos
// peso, accesible: un lector de pantalla sigue leyendo las 3 tarjetas en
// orden de DOM). El indicador de abajo reutiliza las mismas clases que el
// "1 de 3" del hero (HeroStatCard.tsx: .hero-progress/-track/-fill), solo
// que acá el relleno refleja la tarjeta centrada por scroll, no un timer.
//
// Fondo: mientras no haya foto definitiva para cada tarjeta, placeholder de
// color de marca (.costos-mobile-bg) — cuando llegue la imagen, reemplazar
// ese div por <Image fill style={{objectFit:'cover'}} .../> ahí mismo, el
// overlay de gradiente ya está listo para que el texto siga legible encima.
export function CostosMobileCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    function onScroll() {
      const cards = Array.from(track!.querySelectorAll<HTMLElement>('.costos-mobile-card'));
      const trackRect = track!.getBoundingClientRect();
      const center = trackRect.left + trackRect.width / 2;
      let closest = 0;
      let closestDist = Infinity;
      cards.forEach((card, i) => {
        const r = card.getBoundingClientRect();
        const dist = Math.abs(r.left + r.width / 2 - center);
        if (dist < closestDist) {
          closestDist = dist;
          closest = i;
        }
      });
      setActive(closest);
    }

    track.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => track.removeEventListener('scroll', onScroll);
  }, []);

  function goTo(i: number) {
    const card = trackRef.current?.querySelectorAll<HTMLElement>('.costos-mobile-card')[i];
    card?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }

  return (
    <div className="costos-mobile-wrap">
      <div className="costos-mobile-track" ref={trackRef}>
        {COSTOS_MOBILE.map((c) => (
          <div className="costos-mobile-card" key={c.num}>
            <div className="costos-mobile-bg" />
            <div className="costos-mobile-text">
              <span className="num">{c.num}</span>
              <p>{c.texto}</p>
              <span className="src">{c.src}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="hero-progress costos-mobile-dots" role="tablist" aria-label="Posición del carrusel">
        {COSTOS_MOBILE.map((c, i) => (
          <button key={c.num} type="button" role="tab" aria-selected={i === active} aria-label={c.num} onClick={() => goTo(i)}>
            <span className="hero-progress-track">
              <span className="hero-progress-fill" style={{ width: i === active ? '100%' : '0%' }} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default CostosMobileCarousel;
