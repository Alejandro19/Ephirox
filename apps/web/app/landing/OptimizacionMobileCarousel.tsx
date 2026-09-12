'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { OPTIMIZACION } from './content';

// Carrusel mobile de "Con tu estado ya medido..." — mismo patrón que
// CostosMobileCarousel.tsx (scroll-snap nativo en vez de una librería con
// JS, indicador de abajo reutilizando .hero-progress del hero).
export function OptimizacionMobileCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    function onScroll() {
      const cards = Array.from(track!.querySelectorAll<HTMLElement>('.opt-mobile-card'));
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
    const card = trackRef.current?.querySelectorAll<HTMLElement>('.opt-mobile-card')[i];
    card?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }

  return (
    <div className="opt-mobile-wrap">
      <div className="opt-mobile-track" ref={trackRef}>
        {OPTIMIZACION.map((o) => (
          <div className="opt-mobile-card" key={o.label}>
            <Image src={o.img} alt={o.alt} fill quality={82} sizes="90vw" style={{ objectFit: 'cover', objectPosition: 'center' }} className="opt-mobile-bg" />
            <div className="opt-mobile-text">
              <span className="label">{o.label}</span>
              <p>{o.texto}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="hero-progress opt-mobile-dots" role="tablist" aria-label="Posición del carrusel">
        {OPTIMIZACION.map((o, i) => (
          <button key={o.label} type="button" role="tab" aria-selected={i === active} aria-label={o.label} onClick={() => goTo(i)}>
            <span className="hero-progress-track">
              <span className="hero-progress-fill" style={{ width: i === active ? '100%' : '0%' }} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default OptimizacionMobileCarousel;
