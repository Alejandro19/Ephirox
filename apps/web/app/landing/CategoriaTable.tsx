import { COMPARACION } from './content';

export function CategoriaTable() {
  return (
    <>
      <div className="table-scroll-wrap">
        <div className="table-card">
          <div className="compare-head-row">
            <span>Indicador</span>
            <span>Enfoque tradicional (Colombia/LATAM)</span>
            <span className="ephirox-col">Ephirox</span>
            <span>Diferencial</span>
          </div>
          {COMPARACION.map((row) => (
            <div className={`compare-row-card${row.mobileHide ? ' mobile-hide-row' : ''}`} key={row.indicador}>
              <span className="cell-capacidad">{row.indicador}</span>
              <span className="cell-field">
                <em className="mobile-field-label">Tradicional</em>
                <span className="trad-full">{row.trad}</span>
                <span className="trad-mobile">{row.tradMobile ?? row.trad}</span>
              </span>
              <span className="cell-field cell-ephirox">
                <em className="mobile-field-label" style={{ color: '#8C6A2F' }}>Ephirox</em>
                <span className="ephirox-text">{row.eph}</span>
              </span>
              <span className="cell-field">
                <em className="mobile-field-label" style={{ color: '#8C6A2F' }}>Diferencial</em>
                {row.dif}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="image-card">
        <div className="image-card-inner">
          <img src="/landing/tablero-mockup.jpg" alt="Dashboard de biomarcadores en tablet" className="image-card-img" />
          <div className="image-card-shade" />
        </div>
      </div>
    </>
  );
}
