'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

export function ScrollReveal({
  children,
  className = '',
  delayMs = 0,
  threshold = 0.2,
  distance = 24,
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  threshold?: number;
  distance?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin: '0px 0px -10% 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  const style: CSSProperties = {
    ['--reveal-distance' as unknown as string]: `${distance}px`,
    ...(visible ? { transitionDelay: `${delayMs}ms` } : {}),
  };

  return (
    <div ref={ref} className={`reveal-on-scroll${visible ? ' is-visible' : ''}${className ? ` ${className}` : ''}`} style={style}>
      {children}
    </div>
  );
}
