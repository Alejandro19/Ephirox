import { COMPARACION } from './content';

export function CategoriaTable() {
  return (
    <>
      <div className="table-scroll">
        <div className="compare-table">
          <div className="compare-head">
            <span>Indicador</span>
            <span>Enfoque tradicional (Colombia/LATAM)</span>
            <span className="ephirox-col">Ephirox</span>
            <span>Diferencial</span>
          </div>
          {COMPARACION.map((row) => (
            <div className="compare-row" key={row.indicador}>
              <span>{row.indicador}</span>
              <span className="trad">{row.trad}</span>
              <span className="eph">{row.eph}</span>
              <span className="dif">{row.dif}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="compare-mobile-list">
        {COMPARACION.map((row) => (
          <div className="compare-card" key={row.indicador}>
            <h3>{row.indicador}</h3>
            <div className="compare-card-field">
              <span className="label">Enfoque tradicional</span>
              <p className="trad">{row.trad}</p>
            </div>
            <div className="compare-card-field eph">
              <span className="label">Ephirox</span>
              <p>{row.eph}</p>
            </div>
            <div className="compare-card-field dif">
              <span className="label">Diferencial</span>
              <p>{row.dif}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
