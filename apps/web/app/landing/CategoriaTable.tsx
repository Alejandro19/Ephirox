import { COMPARACION } from './content';

export function CategoriaTable() {
  return (
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
  );
}
