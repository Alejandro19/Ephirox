'use client';

import { useId, useState } from 'react';
import { JUNTA_PUNTOS, type JuntaBarra, type JuntaPunto } from './content';

// Mismo diseño que tenía DÍA 90 (riel dorado + filas que se expanden): el
// título del reporte a la izquierda y la lista de puntos a la derecha; al
// elegir un punto (clic o teclado) se despliega su detalle completo (texto,
// cifra, glosa, fuente y gráfico). Cada punto tiene su propia forma de
// gráfico (cohorte/barras/timeline/ciclos) — ver JUNTA_PUNTOS en content.ts.
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
    <div className="junta-detail">
      <div className="junta-panel-texto">
        <span className="junta-panel-kicker">{punto.num} — {punto.kicker}</span>
        <p>{punto.texto}</p>
      </div>

      <div className="junta-detail-side">
        <div className="junta-panel-cifra">
          <span className="junta-cifra">{punto.cifra}</span>
          <div className="junta-glosa-col">
            <p className="junta-glosa">{punto.glosa}</p>
            {punto.fuente && <span className="junta-fuente">{punto.fuente}</span>}
          </div>
        </div>

        {punto.chart !== 'none' && (
          <div className="junta-panel-chart">
            <JuntaChartVisual punto={punto} />
            <span className="junta-chart-pie">{punto.pie}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function JuntaChartVisual({ punto }: { punto: JuntaPunto }) {
  switch (punto.chart) {
    case 'cohorte':
      return <CohorteChart barras={punto.barras} highlight={punto.highlight} />;
    case 'barras':
      return <BarrasChart filas={punto.filas} />;
    case 'timeline':
      return <TimelineChart fill={punto.fill} leftLabel={punto.leftLabel} rightLabel={punto.rightLabel} />;
    case 'ciclos':
      return <CiclosChart total={punto.total} activos={punto.activos} />;
    case 'none':
      return null;
  }
}

function CohorteChart({ barras, highlight }: { barras: number[]; highlight: number[] }) {
  return (
    <div className="junta-chart-cohorte">
      {barras.map((h, i) => (
        <div
          key={i}
          className={`junta-bar-v${highlight.includes(i) ? ' is-active' : ''}`}
          style={{ height: `${Math.round(h * 100)}%` }}
        />
      ))}
    </div>
  );
}

function BarrasChart({ filas }: { filas: JuntaBarra[] }) {
  return (
    <div className="junta-chart-barras">
      {filas.map((f) => (
        <div className="junta-barra-row" key={f.label}>
          <div className="junta-barra-label-row">
            <span className="junta-barra-label">{f.label}</span>
            <span className="junta-barra-value">{f.value}</span>
          </div>
          <div className="junta-barra-riel">
            <div className={`junta-barra-fill${f.gold ? ' is-gold' : ''}`} style={{ width: `${f.width}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function TimelineChart({ fill, leftLabel, rightLabel }: { fill: number; leftLabel: string; rightLabel: string }) {
  return (
    <div className="junta-chart-timeline">
      <div className="junta-timeline-riel">
        <div className="junta-timeline-fill" style={{ width: `${fill}%` }} />
      </div>
      <div className="junta-timeline-labels">
        <span className="is-gold">{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );
}

function CiclosChart({ total, activos }: { total: number; activos: number }) {
  return (
    <div className="junta-chart-ciclos">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`junta-ciclo${i < activos ? ' is-active' : ''}`} />
      ))}
    </div>
  );
}
