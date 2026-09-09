'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { PASOS } from './content';

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

// Fracción de la zona de scroll de un paso que se usa para la cortina de
// entrada/salida — 0.35 quiere decir que la cortina termina de cubrir al
// anterior bastante antes de llegar al final de su propia zona, dejando un
// tramo de scroll "en reposo" con el paso ya asentado. El clip-path se
// recalcula en cada frame de scroll directamente a partir de la posición
// (nunca una animación por tiempo compitiendo contra el scroll).
const CURTAIN_FRACTION = 0.35;

// Cuánto entró YA el propio bloque (0 = todavía no arrancó, 1 = totalmente
// revelado). Para el índice 0 esto ya da 1 desde progress=0 — no hace falta
// caso especial: su ventana de entrada [-CURTAIN_FRACTION, 0] ya quedó atrás.
function entranceFor(index: number, progress: number): number {
  const start = index - CURTAIN_FRACTION;
  return clamp01((progress - start) / CURTAIN_FRACTION);
}

// Cuánto lo empezó a tapar el SIGUIENTE (0 = todavía no, 1 = totalmente
// cubierto). El último paso no tiene quién lo tape.
function exitFor(index: number, progress: number, total: number): number {
  if (index === total - 1) return 0;
  const start = index + 1 - CURTAIN_FRACTION;
  return clamp01((progress - start) / CURTAIN_FRACTION);
}

// .paso-block y .pasos-media-layer no tienen fondo opaco propio (el fondo
// de sección se ve alrededor del contenido), así que dos cortinas que
// revelan cada una "su propio % inferior" desde el MISMO borde quedan
// ANIDADAS, no adyacentes — la más chica cae siempre dentro de la más
// grande, y esa zona compartida muestra las dos a la vez (el texto
// entrelazado que se veía). La cortina real necesita que el bloque que
// SALE se recorte desde ARRIBA hacia abajo (bottom-inset creciendo) justo
// cuando el que ENTRA se recorta desde ABAJO hacia arriba (top-inset
// bajando) — así las dos regiones visibles quedan pegadas una a la otra,
// nunca superpuestas, sin importar la altura real de cada bloque.
function clipPathFor(index: number, progress: number, total: number): string {
  const topInset = (1 - entranceFor(index, progress)) * 100;
  const bottomInset = exitFor(index, progress, total) * 100;
  return `inset(${topInset.toFixed(2)}% 0% ${bottomInset.toFixed(2)}% 0%)`;
}

// El texto no puede seguir el mismo recorte continuo que la imagen: un
// párrafo cortado a la mitad se lee como una frase incompleta (el título
// de un paso mezclado con el párrafo del otro), aunque geométricamente no
// haya superposición de píxeles — a diferencia de una foto, que se sigue
// leyendo bien aunque se vea solo la mitad. Por eso el texto cambia de
// golpe, como una sola unidad. TEXT_SWAP_AT cerca de 1 (no 0.5) a propósito
// — con 0.5 el texto cambiaba a mitad de la cortina de imagen, mientras
// esta todavía tenía la mitad del recorrido por delante: se sentía como si
// el texto se adelantara antes de terminar de ver la card. Ahora cambia
// justo cuando la imagen ya casi terminó de asentarse.
const TEXT_SWAP_AT = 0.96;

function textVisible(index: number, progress: number, total: number): boolean {
  return entranceFor(index, progress) >= TEXT_SWAP_AT && exitFor(index, progress, total) < TEXT_SWAP_AT;
}

export function PasosSticky() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [progress, setProgress] = useState(0);

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
        setProgress(q * PASOS.length);
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

  const activeIndex = Math.min(PASOS.length - 1, Math.floor(progress));

  return (
    <section className="pasos-sticky" ref={sectionRef}>
      <div className="pasos-inner">
        <div className="pasos-grid">
          <div className="pasos-text-wrap">
            {PASOS.map((p, i) => {
              const active = i === activeIndex;
              const visible = textVisible(i, progress, PASOS.length);
              return (
                <div
                  key={p.ord}
                  className="paso-block"
                  style={{
                    clipPath: visible ? 'inset(0% 0% 0% 0%)' : 'inset(100% 0% 0% 0%)',
                    pointerEvents: active ? 'auto' : 'none',
                  }}
                >
                  <div className="paso-block-inner">
                    <span className="paso-ord">{p.ord}</span>
                    <h3 className="paso-titulo">{p.titulo}</h3>
                    <p className="paso-texto">{p.texto}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pasos-media">
            {PASOS.map((p, i) => {
              const active = i === activeIndex;
              const layerStyle = {
                clipPath: clipPathFor(i, progress, PASOS.length),
                pointerEvents: active ? ('auto' as const) : ('none' as const),
              };
              if (i === 2) {
                return (
                  <div key={p.ord} className="pasos-media-layer" style={layerStyle}>
                    <div className="mac-wrap">
                      <div className="mac-body">
                        <div className="mac-lid">
                          <div className="mac-screen">
                            <Image src={p.img} alt={p.alt} fill quality={95} sizes="380px" style={{ objectFit: 'contain' }} />
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
                  <Image src={p.img} alt={p.alt} fill quality={95} sizes="(max-width: 700px) 100vw, 520px" style={{ objectFit: 'cover' }} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
