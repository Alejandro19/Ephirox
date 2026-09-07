import Image from 'next/image';
import { PASOS } from './content';

// Versión mobile de "cómo lo medimos": el scroll pineado de PasosSticky
// depende de 100vh/position:sticky, poco confiable en navegadores móviles
// (barra de direcciones dinámica) y pensado para una interacción de mouse,
// no de swipe. Acá cada paso queda simplemente apilado — imagen, número,
// título y texto siempre visibles, sin animación de scroll — mismo patrón
// de "imagen + texto explicativo corto" pedido explícitamente para mobile.
export function PasosMobileList() {
  return (
    <div className="pasos-mobile-list">
      {PASOS.map((p) => (
        <div className="pasos-mobile-item" key={p.ord}>
          <div className="pasos-mobile-media">
            <Image src={p.img} alt={p.alt} fill quality={95} sizes="92vw" style={{ objectFit: 'cover' }} />
          </div>
          <span className="paso-ord">{p.ord}</span>
          <h3 className="paso-titulo">{p.titulo}</h3>
          <p className="paso-texto">{p.texto}</p>
        </div>
      ))}
    </div>
  );
}
