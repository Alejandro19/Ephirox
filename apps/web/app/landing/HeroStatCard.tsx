'use client';

import type { CSSProperties } from 'react';
import { HERO_STATS, HERO_INTERVAL_MS } from './content';
import { useAutoRotate } from './useAutoRotate';

export function HeroStatCard({ className = '', style }: { className?: string; style?: CSSProperties } = {}) {
  const { active, running, pick, pause, resume } = useAutoRotate(HERO_STATS.length, HERO_INTERVAL_MS);

  return (
    <div className={`hero-stat-card${className ? ` ${className}` : ''}`} style={style} onMouseEnter={pause} onMouseLeave={resume}>
      <div className="hero-card-stack">
        {HERO_STATS.map((h, i) => {
          const isActive = i === active;
          return (
            <div
              key={h.cifra}
              className="stat-block"
              style={{
                opacity: isActive ? 1 : 0,
                transform: `translateX(${isActive ? 0 : i < active ? 24 : -18}px)`,
                pointerEvents: isActive ? 'auto' : 'none',
              }}
            >
              <span className="stat-num">{h.cifra}</span>
              <div className="stat-text-wrap">
                <p>{h.texto}</p>
                <span className="stat-source">{h.fuente}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="hero-progress">
        {HERO_STATS.map((h, i) => {
          const isActive = i === active;
          return (
            <button key={h.cifra} type="button" aria-label={h.cifra} onClick={() => pick(i)}>
              <span className="hero-progress-track">
                <span
                  className="hero-progress-fill"
                  style={{
                    width: isActive ? '100%' : '0%',
                    transitionDuration: `${isActive ? (running ? HERO_INTERVAL_MS : 500) : 320}ms`,
                    transitionTimingFunction: 'linear',
                  }}
                />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
