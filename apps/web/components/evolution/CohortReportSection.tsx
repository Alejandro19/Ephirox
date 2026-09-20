'use client';

import { useRef, useState } from 'react';
import useSWR from 'swr';
import { getCohortReport } from '../../lib/evolution-cohort-client';
import { PermissionDeniedError } from '../../lib/api-client';
import EmptyState from '../ui/EmptyState';
import { Trend, type TrendPoint } from './charts/Trend';
import { BarChart, type BarChartGroup } from './charts/BarChart';
import { ProportionBar } from './charts/ProportionBar';
import { KpiTile, StatRow, ChartCard, ChartGrid } from './charts/Layout';
import { CategorySection, CategoryFilterBar, type EvolutionCategory } from './charts/CategorySection';
import ChartTooltip, { type TooltipHandle } from './charts/Tooltip';

const CATEGORIES: EvolutionCategory[] = [
  { key: 'todas', label: 'Todas', color: 'var(--eph-muted)' },
  { key: 'riesgo', label: 'Riesgo', color: 'var(--eph-low)' },
  { key: 'stress', label: 'Stress', color: 'var(--eph-pillar-stress)' },
  { key: 'recuperacion', label: 'Recuperación', color: 'var(--eph-pillar-recovery)' },
];

const subHeadingStyle: React.CSSProperties = { fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: 16, fontWeight: 400, color: 'var(--eph-text)', margin: '0 0 12px' };

export function CohortReportSection({ clientId }: { clientId: string }) {
  const [activeCat, setActiveCat] = useState('todas');
  const tip = useRef<TooltipHandle>(null);
  const { data: report, error, isLoading } = useSWR(['cohort-report', clientId], () => getCohortReport(clientId));

  if (isLoading) return <p style={{ color: 'var(--eph-muted)', fontSize: 14 }}>Cargando el reporte de tu equipo…</p>;
  if (error instanceof PermissionDeniedError) {
    return <EmptyState message="Reporte de mi equipo no está habilitado para tu cuenta." />;
  }
  if (error) return <p role="alert" style={{ color: 'var(--eph-danger)' }}>{(error as Error).message}</p>;
  if (!report) return null;

  if (report.memberCount === 0) {
    return <EmptyState message="Aún no hay miembros de tu equipo con datos disponibles para este reporte." />;
  }

  const memberGroups: BarChartGroup[] = report.members.map((m) => ({
    label: m.label.replace('Miembro ', 'M'),
    bars: [{ value: m.regulationDeficit, color: m.atRisk ? 'var(--eph-low)' : 'var(--eph-good)', name: m.label }],
  }));

  const riskSegments = [
    { label: 'En riesgo', value: report.atRiskCount, color: 'var(--eph-low)' },
    { label: 'Sin riesgo', value: Math.max(0, report.memberCount - report.atRiskCount), color: 'var(--eph-good)' },
  ];

  const pillarGroups: BarChartGroup[] = report.signalsByPillar.map((p) => ({
    label: p.label,
    bars: [{ value: p.value, color: p.colorKey === 'stress' ? 'var(--eph-pillar-stress)' : 'var(--eph-pillar-recovery)' }],
  }));

  const atRiskTrendPoints: TrendPoint[] = report.atRiskByWeek.map((w) => ({ label: w.label, value: w.value }));
  const regulationTrendPoints: TrendPoint[] = report.avgRegulationByWeek.map((w) => ({ label: w.label, value: w.value }));
  const recoveryTrendPoints: TrendPoint[] = report.avgRecoveryByWeek.map((w) => ({ label: w.label, value: w.value }));

  return (
    <div>
      <ChartTooltip ref={tip} />
      <StatRow>
        <KpiTile label="Miembros en el equipo" value={report.memberCount} variant="gradient" />
        <KpiTile label="En riesgo esta semana" value={`${report.atRiskCount} de ${report.memberCount}`} variant="risk" />
        <KpiTile label="Recovery score promedio" value={report.avgRecoveryScore ?? '—'} unit={report.avgRecoveryScore != null ? '/100' : undefined} variant="gradient" />
      </StatRow>

      <CategoryFilterBar cats={CATEGORIES} active={activeCat} onChange={setActiveCat} />

      <CategorySection catKey="riesgo" active={activeCat} color="var(--eph-low)" label="Riesgo">
        <ChartGrid>
          <ChartCard title="Distancia bajo su propio típico — por miembro" caption="Cada barra es un miembro anonimizado; nunca se muestra su nombre.">
            <BarChart groups={memberGroups} unit=" pts" tip={tip} />
          </ChartCard>
          <ChartCard title="Distribución de riesgo del equipo">
            <ProportionBar segments={riskSegments} tip={tip} />
          </ChartCard>
        </ChartGrid>
        <div style={{ marginTop: 16 }}>
          <ChartCard title="Miembros en riesgo por semana">
            <Trend points={atRiskTrendPoints} tip={tip} color="var(--eph-low)" emptyMessage="Necesitas más semanas de historial del equipo." />
          </ChartCard>
        </div>
        <div style={{ marginTop: 16 }}>
          <ChartCard title="Señales de riesgo por pilar — esta semana" caption="Solo Stress y Recuperación tienen hoy un umbral de riesgo validado en el producto.">
            <BarChart groups={pillarGroups} tip={tip} />
          </ChartCard>
        </div>
      </CategorySection>

      <CategorySection catKey="stress" active={activeCat} color="var(--eph-pillar-stress)" label="Stress">
        <h3 style={subHeadingStyle}>Capacidad de regulación promedio del equipo</h3>
        <ChartCard title="Por semana">
          <Trend points={regulationTrendPoints} tip={tip} color="var(--eph-pillar-stress)" emptyMessage="Necesitas más semanas de historial del equipo." />
        </ChartCard>
      </CategorySection>

      <CategorySection catKey="recuperacion" active={activeCat} color="var(--eph-pillar-recovery)" label="Recuperación">
        <h3 style={subHeadingStyle}>Recovery score promedio del equipo</h3>
        <ChartCard title="Por semana">
          <Trend points={recoveryTrendPoints} tip={tip} color="var(--eph-pillar-recovery)" emptyMessage="Necesitas más semanas de historial del equipo." />
        </ChartCard>
      </CategorySection>

      <p style={{ fontSize: 11.5, color: 'var(--eph-muted)', lineHeight: 1.6, marginTop: 28 }}>
        Todo este dashboard es agregado por equipo — nunca se muestra el nombre de un miembro individual. Solo entran los miembros con consentimiento de investigación confirmado.
      </p>
    </div>
  );
}
