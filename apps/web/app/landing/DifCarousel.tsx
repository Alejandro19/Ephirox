'use client';

import { DIF } from './content';
import { ScrollReveal } from './ScrollReveal';
import { useAutoRotate } from './useAutoRotate';

const ROTATE_MS = 5000;

export function DifCarousel() {
  const { active } = useAutoRotate(DIF.length, ROTATE_MS);

  return (
    <ScrollReveal className="dif-outer" threshold={0.35} distance={12}>
      <div className="dif-card">
        <div className="dif-card-head">
          <span className="eyebrow">CÓMO OPERA EL SISTEMA</span>
          <div className="dif-dots">
            {DIF.map((txt, i) => (
              <span key={txt} className={`dif-dot${i === active ? ' is-active' : ''}`} />
            ))}
          </div>
        </div>
        <div className="dif-rotator">
          {DIF.map((txt, i) => (
            <p key={txt} className={`dif-text${i === active ? ' is-active' : ''}`}>{txt}</p>
          ))}
        </div>
        {/* key={active} reinicia la animación de la barra en cada rotación
            — mismo criterio que .junta-bar (transitionDelay por índice):
            un elemento nuevo por ciclo, no un reset manual de la barra. */}
        <div className="dif-progress">
          <div key={active} className="dif-progress-fill" style={{ animationDuration: `${ROTATE_MS}ms` }} />
        </div>
      </div>
    </ScrollReveal>
  );
}
