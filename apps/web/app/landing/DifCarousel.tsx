'use client';

import { DIF, DIF_INTERVAL_MS } from './content';
import { useAutoRotate } from './useAutoRotate';

export function DifCarousel() {
  const { active, pick, pause, resume } = useAutoRotate(DIF.length, DIF_INTERVAL_MS);

  return (
    <div className="dif-outer">
      <div className="dif-card" onMouseEnter={pause} onMouseLeave={resume}>
        <span className="eyebrow">CÓMO OPERA EL SISTEMA</span>
        <div className="dif-stack">
          {DIF.map((txt, i) => {
            const isActive = i === active;
            return (
              <p key={txt} className="dif-text" style={{ opacity: isActive ? 1 : 0, transform: `translateY(${isActive ? 0 : 10}px)`, pointerEvents: isActive ? 'auto' : 'none' }}>
                {txt}
              </p>
            );
          })}
        </div>
        <div className="dif-footer">
          <div className="dif-dots">
            {DIF.map((txt, i) => {
              const isActive = i === active;
              return (
                <button
                  key={txt}
                  type="button"
                  className="dif-dot"
                  aria-label={txt}
                  onClick={() => pick(i)}
                  style={{ width: isActive ? 22 : 7, background: isActive ? '#C9A66B' : 'rgba(245,241,232,0.22)' }}
                />
              );
            })}
          </div>
          <a className="link-hover underline-link go-llevarlo" href="#llevarlo">Ver cómo se abre una cohorte en mi empresa</a>
        </div>
      </div>
    </div>
  );
}
