'use client';

import { useId, useState } from 'react';
import { JUNTA_PUNTOS, type JuntaPunto } from './content';

// Mismo diseño que tenía DÍA 90 (riel dorado + filas que se expanden): el
// título del reporte a la izquierda y la lista de puntos a la derecha; al
// elegir un punto (clic o teclado) se despliega su texto descriptivo. Sin
// gráficos ni cifras a pedido de Alejandro (los datos siguen en JUNTA_PUNTOS,
// content.ts, por si se retoman).
export function JuntaSection() {
  const [active, setActive] = useState(0);
  const baseId = useId();

  return (
    <div className="dia90-wrap junta-d90">
      <div className="dia90-head">
        <h2>El reporte que le llevas a tu Junta.</h2>
      </div>

      <div className="dia90-rail-grid">
        <div className="dia90-rail-track">
          <div className="dia90-rail-fill" style={{ height: `${((active + 1) / JUNTA_PUNTOS.length) * 100}%` }} />
        </div>
        <div className="dia90-rows" role="list">
          <p className="rows-hint">Selecciona cada punto para ver el detalle.</p>
          {JUNTA_PUNTOS.map((p, i) => {
            const isActive = i === active;
            const pick = () => setActive(i);
            return (
              <div
                key={p.num}
                role="listitem"
                className={`dia90-row${isActive ? ' is-active' : ''}`}
                tabIndex={0}
                aria-expanded={isActive}
                aria-controls={`${baseId}-d-${i}`}
                onFocus={pick}
                onClick={pick}
                style={{ transform: `translateX(${isActive ? 8 : 0}px)`, opacity: isActive ? 1 : 0.72 }}
              >
                <div className="t" style={{ color: isActive ? '#E3C795' : '#F5F1E8' }}>
                  <span className="junta-index-num">{p.num}</span> {p.titulo}
                </div>
                <div className="d" id={`${baseId}-d-${i}`} aria-hidden={!isActive}>
                  <JuntaDetail punto={p} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function JuntaDetail({ punto }: { punto: JuntaPunto }) {
  return (
    <div className="junta-panel-texto">
      <span className="junta-panel-kicker">{punto.num} — {punto.kicker}</span>
      <p>{punto.texto}</p>
    </div>
  );
}
