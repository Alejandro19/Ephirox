'use client';

import useSWR from 'swr';
import { getWellnessIndex, type WellnessIndexResult } from '../../lib/wellness-index-client';
import RingProgress from '../ui/RingProgress';

const TREND_COPY: Record<WellnessIndexResult['trend'], string> = {
  up: 'Estás mejorando',
  down: 'Es momento de ajustar',
  stable: 'Manteniendo el ritmo',
  none: 'Primera medición',
};

function DeltaLine({ delta }: { delta: number }) {
  const up = delta > 0;
  return (
    <p className="mt-1.5 text-[11.5px] font-semibold" style={{ color: 'var(--hero-piedra-accent)' }}>
      {up ? '▲' : '▼'} {up ? '+' : ''}
      {delta} vs. semana pasada
    </p>
  );
}

export function WellnessIndexCard({ clientId }: { clientId: string }) {
  const { data } = useSWR(['wellness-index', clientId], () => getWellnessIndex(clientId));

  if (!data) return null;

  return (
    <div
      className="mb-8 flex items-center gap-5 rounded-[var(--radius-hero)] p-7"
      style={{ background: 'linear-gradient(135deg, var(--hero-piedra-start), var(--hero-piedra-end))', color: 'var(--hero-piedra-text)' }}
    >
      <RingProgress value={data.value} size={76} strokeWidth={7} color="piedra">
        <div className="flex flex-col items-center justify-center">
          <span className="font-serif text-2xl font-bold leading-none">{data.value}</span>
          <span className="mt-0.5 text-[9px]" style={{ color: 'var(--hero-piedra-text-muted)' }}>/ 100</span>
        </div>
      </RingProgress>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--hero-piedra-accent)' }}>
          Índice de bienestar
        </p>
        <p className="mt-1 font-serif text-lg font-semibold">{TREND_COPY[data.trend]}</p>
        {data.delta != null && <DeltaLine delta={data.delta} />}
      </div>
    </div>
  );
}
