'use client';

import type { ReactNode } from 'react';
import { useRevealOnScroll } from './useRevealOnScroll';

// Todos los kickers/eyebrow de la landing pasan por acá — mismo efecto en
// los 8+ lugares donde aparecen (EL COSTO DE NO ACTUAR, EL ENEMIGO
// INVISIBLE, Y ESO SE TRADUCE EN, ¿CÓMO LO MEDIMOS?, ¿POR QUÉ EPHIROX?,
// PROGRAMA/CONTACTO del footer) sin repetir la llamada al hook en cada uno.
// No incluye los kickers del modal del Executive Score (es un overlay que
// se abre de golpe, no algo que se "cruza" al hacer scroll) ni el kicker
// chico de cada punto de la Junta Directiva (junta-panel-kicker: es una
// etiqueta de fila que ya queda visible junto con su panel activo, no un
// encabezado de sección).
export function RevealKicker({ children, className = '' }: { children: ReactNode; className?: string }) {
  const { ref, revealed } = useRevealOnScroll<HTMLSpanElement>();
  return (
    <span ref={ref} className={`reveal-kicker${revealed ? ' is-revealed' : ''}${className ? ` ${className}` : ''}`}>
      {children}
    </span>
  );
}
