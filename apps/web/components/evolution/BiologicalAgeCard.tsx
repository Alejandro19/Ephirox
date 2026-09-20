'use client';

import useSWR from 'swr';
import { listLabPanels } from '../../lib/lab-panels-client';

// Ephi-Metrics · Edad Biológica (PhenoAge, Levine et al. 2018) — ver
// biological-age.service.ts. Deliberadamente NO se muestran acá "Ritmo de
// envejecimiento" ni "Ancho de banda cognitivo" (fuera de alcance de esta
// entrega). Nunca usar el término "Edad epigenética" — es una tecnología y
// un concepto científico distintos.
//
// Rediseño (spec 27.5): mismo dato de siempre (listLabPanels, el checkpoint
// aprobado más reciente con PhenoAge calculado) — solo cambia el render, a
// hero number + píldora de diferencia + barra de tendencia de los últimos 3
// cortes con edad biológica calculada.
export function BiologicalAgeCard({ clientId }: { clientId: string }) {
  const { data: panels } = useSWR(['lab-panels', clientId], () => listLabPanels(clientId));

  if (!panels) return null;

  const withAge = panels
    .filter((p) => p.status === 'aprobado' && p.edadBiologica != null && p.edadCronologicaCalculo != null)
    .sort((a, b) => a.semanaNumero - b.semanaNumero);
  const latest = withAge[withAge.length - 1];

  if (!latest) {
    return (
      <section style={{ marginTop: 16 }}>
        <span style={{ fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--eph-steel)' }}>
          Edad biológica
        </span>
        <p style={{ marginTop: 12, fontSize: 13, color: 'var(--eph-muted)' }}>
          Aún no tienes un laboratorio aprobado con los 9 biomarcadores necesarios (Albúmina, Creatinina, Glucosa,
          PCR, % Linfocitos, VCM, RDW, Fosfatasa Alcalina y Leucocitos) para calcular tu Edad Biológica.
        </p>
      </section>
    );
  }

  const bio = latest.edadBiologica!;
  const chrono = latest.edadCronologicaCalculo!;
  const gap = chrono - bio; // positivo = biológica menor a cronológica (bueno)
  const isGood = gap >= 0;

  // Últimos 3 cortes con dato — barras escaladas al mayor gap absoluto del
  // set, para que se note visualmente si la brecha se amplía o se cierra.
  const lastThree = withAge.slice(-3);
  const gaps = lastThree.map((p) => (p.edadCronologicaCalculo as number) - (p.edadBiologica as number));
  const maxAbsGap = Math.max(1, ...gaps.map((g) => Math.abs(g)));

  return (
    <section style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 28, alignItems: 'center' }}>
      <div>
        <span style={{ fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--eph-steel)' }}>
          Edad biológica
        </span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 8 }}>
          <span className="eph-num" style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 52, color: 'var(--eph-text)' }}>{bio.toFixed(1)}</span>
          <span style={{ fontSize: 13, color: 'var(--eph-muted)' }}>vs. <b style={{ color: 'var(--eph-text)' }}>{chrono}</b> cronológica</span>
        </div>
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, padding: '6px 13px', borderRadius: 999,
            fontSize: 12.5, fontWeight: 700,
            background: isGood ? 'color-mix(in srgb, var(--eph-good) 14%, transparent)' : 'color-mix(in srgb, var(--eph-warn) 14%, transparent)',
            color: isGood ? 'var(--eph-good)' : 'var(--eph-warn)',
            border: `1px solid color-mix(in srgb, ${isGood ? 'var(--eph-good)' : 'var(--eph-warn)'} 35%, transparent)`,
          }}
        >
          {isGood ? '▼' : '▲'} {Math.abs(gap).toFixed(1)} años {isGood ? 'menor' : 'mayor'}
        </span>
      </div>
      {lastThree.length >= 2 && (
        <div>
          <p style={{ fontSize: 10, color: 'var(--eph-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            Brecha — últimos {lastThree.length} cortes
          </p>
          <div style={{ display: 'flex', gap: 5, alignItems: 'flex-end', height: 34 }}>
            {gaps.map((g, i) => (
              <div
                key={i}
                style={{
                  width: 14,
                  height: Math.max(4, (Math.abs(g) / maxAbsGap) * 34),
                  borderRadius: '3px 3px 0 0',
                  background: g >= 0 ? 'var(--eph-good)' : 'var(--eph-warn)',
                }}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
