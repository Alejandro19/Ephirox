'use client';

import Image from 'next/image';
import { PASOS } from './content';
import { useRevealOnScroll } from './useRevealOnScroll';

// Versión mobile de "cómo lo medimos": el scroll pineado de PasosSticky
// depende de 100vh/position:sticky, poco confiable en navegadores móviles
// (barra de direcciones dinámica) y pensado para una interacción de mouse,
// no de swipe. Acá cada paso queda simplemente apilado — imagen, número,
// título y texto — con el efecto de aparición al hacer scroll pedido para
// esta sección (bloque a 200ms, párrafo a 800ms desde que entra en vista).
function PasoMobileItem({ p }: { p: (typeof PASOS)[number] }) {
  const { ref, revealed } = useRevealOnScroll<HTMLDivElement>();
  return (
    <div ref={ref} className={`pasos-mobile-item reveal-block${revealed ? ' is-revealed' : ''}`}>
      <div className="pasos-mobile-media">
        <Image src={p.img} alt={p.alt} fill quality={95} sizes="92vw" style={{ objectFit: 'cover' }} />
      </div>
      <span className="paso-ord">{p.ord}</span>
      <h3 className="paso-titulo">{p.titulo}</h3>
      <p className={`paso-texto reveal-block reveal-paragraph${revealed ? ' is-revealed' : ''}`}>{p.texto}</p>
    </div>
  );
}

export function PasosMobileList() {
  return (
    <div className="pasos-mobile-list">
      {PASOS.map((p) => (
        <PasoMobileItem p={p} key={p.ord} />
      ))}
    </div>
  );
}
