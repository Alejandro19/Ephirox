import type { ReactNode, CSSProperties } from 'react';

// Unifica las 3 variantes casi-duplicadas del mockup (oura-stat/kpi-tile/
// risk-kpi) en un componente con variant — "cifra grande + label + típico"
// (spec 27.1).
export function KpiTile({
  label,
  value,
  unit,
  typical,
  variant = 'default',
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  typical?: ReactNode;
  variant?: 'default' | 'gradient' | 'risk';
}) {
  const style: CSSProperties =
    variant === 'gradient'
      ? { background: 'linear-gradient(160deg, var(--eph-surface-2) 0%, var(--eph-surface) 100%)', border: '1px solid var(--eph-line-2)', borderRadius: 12, padding: '16px 18px', flex: '1 1 160px' }
      : variant === 'risk'
        ? { background: 'var(--eph-surface)', border: '1px solid color-mix(in srgb, var(--eph-low) 35%, var(--eph-line-2))', borderRadius: 12, padding: '16px 18px', flex: '1 1 200px' }
        : { padding: '0 20px', flex: '1 1 140px' };
  return (
    <div style={style}>
      <div style={{ fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace', fontSize: 11, color: 'var(--eph-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
        {label}
      </div>
      <div className="eph-num" style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 28, color: 'var(--eph-text)', marginTop: 8 }}>
        {value}
        {unit && <span style={{ fontSize: 14, color: 'var(--eph-muted)', fontWeight: 400, marginLeft: 2 }}>{unit}</span>}
      </div>
      {typical != null && (
        <div style={{ fontSize: 11.5, color: 'var(--eph-faint)', marginTop: 6 }}>
          Tu típico: <b style={{ color: 'var(--eph-muted)', fontWeight: 700 }}>{typical}</b>
        </div>
      )}
    </div>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 18, paddingBottom: 18, borderBottom: '1px solid var(--eph-line)' }}>
      {children}
    </div>
  );
}

export function ChartCard({ title, caption, children }: { title: string; caption?: string; children: ReactNode }) {
  return (
    <div style={{ background: 'var(--eph-surface)', border: '1px solid var(--eph-line)', borderRadius: 14, padding: '20px 22px' }}>
      <div style={{ fontSize: 12.5, color: 'var(--eph-text)', fontWeight: 700 }}>{title}</div>
      {children}
      {caption && <p style={{ fontSize: 12, color: 'var(--eph-faint)', lineHeight: 1.55, marginTop: 12 }}>{caption}</p>}
    </div>
  );
}

export function ChartGrid({ children }: { children: ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginTop: 16 }}>{children}</div>;
}
