'use client';

import { useEffect, useRef, useState } from 'react';

export function WordReveal({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement | null>(null);
  const [progress, setProgress] = useState(0);
  const words = text.split(' ');

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setProgress(1); return; }

    let raf: number | null = null;
    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        const el = ref.current;
        if (!el) return;
        const vh = window.innerHeight;
        const r = el.getBoundingClientRect();
        const span = r.height + vh * 0.32;
        const p = Math.min(1, Math.max(0, (vh * 0.82 - r.top) / span));
        setProgress((prev) => (Math.abs(p - prev) > 0.008 ? p : prev));
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

  return (
    <p className="frase" ref={ref}>
      {words.map((w, i) => {
        const lit = progress >= (i + 0.6) / (words.length + 2);
        return (
          <span key={i} style={{ transition: 'color 420ms ease-out', color: lit ? '#17130E' : 'rgba(23,19,14,0.24)' }}>
            {w}{' '}
          </span>
        );
      })}
    </p>
  );
}
