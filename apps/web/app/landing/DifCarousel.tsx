import { DIF } from './content';
import { ScrollReveal } from './ScrollReveal';

export function DifCarousel() {
  return (
    <div className="dif-outer">
      <div className="dif-card">
        <span className="eyebrow">CÓMO OPERA EL SISTEMA</span>
        <div className="dif-grid">
          {DIF.map((txt, i) => (
            <ScrollReveal className="dif-item" delayMs={i * 140} threshold={0.35} distance={12} key={txt}>
              <p className="dif-text">{txt}</p>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </div>
  );
}
