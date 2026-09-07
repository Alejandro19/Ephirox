'use client';

import { useState } from 'react';
import { HITOS } from './content';

export function Dia90Rail() {
  const [active, setActive] = useState(0);

  return (
    <div className="dia90-rail-grid">
      <div className="dia90-rail-track">
        <div className="dia90-rail-fill" style={{ height: `${((active + 1) / HITOS.length) * 100}%` }} />
      </div>
      <div className="dia90-rows">
        {HITOS.map((h, i) => {
          const isActive = i === active;
          const pick = () => setActive(i);
          return (
            <div
              key={h.titulo}
              className={`dia90-row${isActive ? ' is-active' : ''}`}
              tabIndex={0}
              onMouseEnter={pick}
              onFocus={pick}
              onClick={pick}
              style={{ transform: `translateX(${isActive ? 8 : 0}px)`, opacity: isActive ? 1 : 0.72 }}
            >
              <span className="t" style={{ color: isActive ? '#E3C795' : '#F5F1E8' }}>{h.titulo}</span>
              <span className="d">{h.detalle}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
