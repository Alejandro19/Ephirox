'use client';

import { useId, useState } from 'react';
import { JUNTA_PUNTOS, type JuntaBarra, type JuntaPunto } from './content';

// Índice + panel de altura fija (nunca acordeón) — el alto de la sección no
// puede cambiar al pasar de un punto a otro, o empuja la card clara que
// viene justo después. Cada punto tiene su propia forma de gráfico
// (cohorte/barras/timeline/ciclos), no la misma serie repintada — ver
// JUNTA_PUNTOS en content.ts.
export function JuntaSection() {
  const [active, setActive] = useState(0);
  const current = JUNTA_PUNTOS[active];
  const baseId = useId();

  return (
    <div className="junta-wrap">
      <div className="junta-head">
        <h2>El reporte que le llevas a tu Junta.</h2>
      </div>

      <div className="junta-body">
        <div className="junta-index-col">
          <p className="rows-hint">Selecciona cada punto para ver el detalle.</p>
          <div className="junta-index" role="tablist" aria-label="Puntos del acta">
            {JUNTA_PUNTOS.map((p, i) => {
              const isActive = i === active;
              return (
                <button
                  key={p.num}
                  type="button"
                  role="tab"
                  id={`${baseId}-tab-${i}`}
                  aria-selected={isActive}
                  aria-controls={`${baseId}-panel`}
                  className={`junta-index-row${isActive ? ' is-active' : ''}`}
                  onClick={() => setActive(i)}
                >
                  <span className="junta-index-num">{p.num}</span>
                  <span className="junta-index-titulo">{p.titulo}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div
          className="junta-panel"
          role="tabpanel"
          id={`${baseId}-panel`}
          aria-labelledby={`${baseId}-tab-${active}`}
          key={active}
        >
          <div className="junta-panel-texto">
            <span className="junta-panel-kicker">{current.num} — {current.kicker}</span>
            <p>{current.texto}</p>
          </div>

          <div className="junta-panel-cifra">
            <span className="junta-cifra">{current.cifra}</span>
            <div className="junta-glosa-col">
              <p className="junta-glosa">{current.glosa}</p>
              {current.fuente && <span className="junta-fuente">{current.fuente}</span>}
            </div>
          </div>

          {current.chart !== 'none' && (
            <div className="junta-panel-chart">
              <JuntaChartVisual punto={current} />
              <span className="junta-chart-pie">{current.pie}</span>
            </div>
          )}
        </div>
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
