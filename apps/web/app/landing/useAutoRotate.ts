'use client';

import { useEffect, useRef, useState } from 'react';

// Mismo patrón de auto-avance-con-pausa-en-hover que usan la tarjeta de
// estadísticas del hero y el carrusel de diferenciadores en
// docs/ephirox-landing.html — extraído una sola vez porque ambos lo
// necesitan idéntico.
export function useAutoRotate(length: number, intervalMs: number) {
  const [active, setActive] = useState(0);
  const [running, setRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reduceRef = useRef(false);

  useEffect(() => {
    reduceRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  function start() {
    if (timerRef.current || reduceRef.current) return;
    setRunning(true);
    timerRef.current = setInterval(() => {
      setActive((i) => (i + 1) % length);
    }, intervalMs);
  }
  function stop() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRunning(false);
  }

  useEffect(() => {
    start();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [length, intervalMs]);

  function pick(i: number) {
    stop();
    setActive(i);
  }

  return { active, running, pick, pause: stop, resume: start };
}
