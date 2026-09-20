'use client';

import { useEffect, useRef, useState } from 'react';

// Anima el trazo de una <polyline>/<path> dibujándose progresivamente vía
// stroke-dasharray/dashoffset — mismo patrón que docs/evolution-module-mockup.html.
export function useDrawIn<T extends SVGPathElement | SVGPolylineElement>(dep: unknown) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    // jsdom (entorno de tests) no implementa getTotalLength() — sin esta
    // guarda, cualquier test que renderice una gráfica con esta animación
    // revienta. En un navegador real la función siempre existe.
    if (!el || typeof el.getTotalLength !== 'function') return;
    const length = el.getTotalLength();
    el.style.transition = 'none';
    el.style.strokeDasharray = `${length}`;
    el.style.strokeDashoffset = `${length}`;
    // Fuerza un reflow para que el navegador registre el estado inicial
    // antes de animar — sin esto la transición no se dispara.
    el.getBoundingClientRect();
    const id = requestAnimationFrame(() => {
      el.style.transition = 'stroke-dashoffset 900ms cubic-bezier(.2,.8,.2,1)';
      el.style.strokeDashoffset = '0';
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dep]);
  return ref;
}

// Dispara animaciones de entrada (barras que crecen, proportion-bars que se
// llenan) recién después del primer render, para que no "salten" antes de
// que el layout esté listo.
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return mounted;
}
