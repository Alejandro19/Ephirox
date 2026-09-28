'use client';

import { useEffect, useRef, useState } from 'react';

// Se revela una sola vez y deja de observar (a diferencia de epix.ai, que
// reinicia el efecto cada vez que el elemento sale y vuelve a entrar en el
// viewport — acá se decidió no replicar eso, por sentirse repetitivo en un
// sitio con tantos detalles narrativos ya cuidados). No usa un <div>
// envolvente (a diferencia de ScrollReveal.tsx): el ref va directo sobre el
// elemento existente, así no cambia el flujo/layout de kickers que hoy
// viven como <span> sueltos dentro de un flex/grid.
export function useRevealOnScroll<T extends HTMLElement = HTMLElement>(threshold = 0.15) {
  const ref = useRef<T | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setRevealed(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, revealed };
}
