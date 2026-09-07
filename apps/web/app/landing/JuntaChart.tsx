'use client';

import { useState } from 'react';
import { JUNTA, JUNTA_INITIAL_INDEX } from './content';

// Dueño de todo el .junta-wrap (no solo del gráfico) porque el estado de
// "cuál fila está activa" maneja tanto las barras como el título — y en el
// markup original .junta-rows es hermano de .junta-left, no hijo, así que
// no se puede partir en dos componentes que solo devuelvan su propio pedazo.
export function JuntaSection() {
  const [active, setActive] = useState(JUNTA_INITIAL_INDEX);
  const current = JUNTA[active];

  return (
    <div className="junta-wrap">
      <div className="junta-left">
        <h2>Esto es lo que vas a poder mostrarle a tu Junta en 90 días.</h2>
        <div className="junta-chart">
          <div className="junta-bars">
            {current.barras.map((h, i) => (
              <div
                key={i}
                className="junta-bar"
                style={{
                  height: `${Math.round(h * 100)}%`,
                  background: h > 0.72 ? '#C9A66B' : 'rgba(201,166,107,0.3)',
                  transitionDelay: `${i * 34}ms`,
                }}
              />
            ))}
          </div>
          <span className="junta-pie">{current.pie}</span>
        </div>
      </div>
      <div className="junta-rows">
        {JUNTA.map((j, i) => {
          const isActive = i === active;
          const pick = () => setActive(i);
          return (
            <div
              key={j.titulo}
              className="junta-row"
              tabIndex={0}
              onMouseEnter={pick}
              onFocus={pick}
              onClick={pick}
              style={{ borderTopColor: isActive ? 'rgba(201,166,107,0.45)' : 'rgba(255,255,255,0.07)', opacity: isActive ? 1 : 0.66 }}
            >
              <span className="t" style={{ color: isActive ? '#E3C795' : '#F5F1E8' }}>{j.titulo}</span>
              <span className="x">{j.texto}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
