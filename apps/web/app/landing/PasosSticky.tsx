'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { PASOS } from './content';

function mix(a: number, b: number, k: number) {
  return Math.round(a + (b - a) * k);
}

export function PasosSticky() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [paso, setPaso] = useState(0);
  const [telon, setTelon] = useState(0);

  useEffect(() => {
    let raf: number | null = null;
    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        const el = sectionRef.current;
        if (!el) return;
        const vh = window.innerHeight;
        const r2 = el.getBoundingClientRect();
        const total = Math.max(1, r2.height - vh);
        const q = Math.min(0.999, Math.max(0, -r2.top / total));
        const nextPaso = Math.floor(q * PASOS.length);
        const t = Math.min(1, Math.max(0, (vh - r2.top) / (vh * 0.82)));
        setPaso((prev) => (nextPaso !== prev ? nextPaso : prev));
        setTelon((prev) => (Math.abs(t - prev) > 0.01 ? t : prev));
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Cerca del final del scroll pineado, título/texto/número pasan de tinta
  // oscura a crema para anticipar el fondo oscuro de la sección siguiente.
  const k = Math.min(1, Math.max(0, (telon - 0.8) / 0.14));
  const ink = `rgb(${mix(23, 245, k)},${mix(19, 241, k)},${mix(14, 232, k)})`;
  const inkSoft = `rgba(${mix(23, 245, k)},${mix(19, 241, k)},${mix(14, 232, k)},${(0.7 - k * 0.08).toFixed(2)})`;
  const ordBorder = telon > 0.8 ? 'rgba(201,166,107,0.45)' : 'rgba(140,106,47,0.4)';
  const ordColor = telon > 0.8 ? '#C9A66B' : '#8C6A2F';

  return (
    <section className="pasos-sticky" ref={sectionRef}>
      <div className="pasos-inner">
        <div
          className="telon"
          style={{
            height: `${(Math.min(1, telon * 1.28) * 100).toFixed(1)}%`,
            background: `rgba(16,14,11,${(0.86 + telon * 0.14).toFixed(2)})`,
            borderRadius: `${(1 - telon) * 40}px ${(1 - telon) * 40}px 0 0`,
          }}
        />
        <div className="pasos-grid">
          <div className="pasos-text-wrap">
            {PASOS.map((p, i) => {
              const active = i === paso;
              return (
                <div
                  key={p.ord}
                  className="paso-block"
                  style={{
                    opacity: active ? 1 : 0,
                    transform: `translateY(${active ? 0 : i < paso ? -16 : 16}px)`,
                    pointerEvents: active ? 'auto' : 'none',
                  }}
                >
                  <span className="paso-ord" style={{ borderColor: ordBorder, color: ordColor }}>{p.ord}</span>
                  <h3 className="paso-titulo" style={{ color: ink }}>{p.titulo}</h3>
                  <p className="paso-texto" style={{ color: inkSoft }}>{p.texto}</p>
                </div>
              );
            })}
          </div>

          <div className="pasos-media">
            {PASOS.map((p, i) => {
              const active = i === paso;
              const layerStyle = {
                opacity: active ? 1 : 0,
                transform: `scale(${active ? 1 : 1.03})`,
                pointerEvents: active ? ('auto' as const) : ('none' as const),
              };
              if (i === 2) {
                return (
                  <div key={p.ord} className="pasos-media-layer" style={layerStyle}>
                    <div className="mac-wrap">
                      <div className="mac-body">
                        <div className="mac-lid">
                          <div className="mac-screen">
                            <Image src={p.img} alt={p.alt} fill sizes="380px" style={{ objectFit: 'contain' }} />
                          </div>
                        </div>
                        <div className="mac-notch" />
                        <div className="mac-base" />
                      </div>
                    </div>
                  </div>
                );
              }
              return (
                <div key={p.ord} className="pasos-media-layer" style={layerStyle}>
                  <Image src={p.img} alt={p.alt} fill sizes="(max-width: 700px) 100vw, 520px" style={{ objectFit: 'cover' }} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
