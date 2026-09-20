'use client';

import { useRef, useState } from 'react';
import useSWR from 'swr';
import { getEvolutionData } from '../../lib/evolution-client';
import { fetchClient, type ClientDetail } from '../../lib/clients-client';
import { PermissionDeniedError } from '../../lib/api-client';
import { getWellnessIndex, getWellnessIndexHistory } from '../../lib/wellness-index-client';
import { listCompletions, getRegulationCapacityOverview, type StressCompletion, type RegulationCapacityOverview } from '../../lib/stress-client';
import { getMetricas, type WearableMetrica } from '../../lib/wearable-client';
import IdentityHeader from '../ui/IdentityHeader';
import LockedBenefit from '../ui/LockedBenefit';
import { EvolucionFisicaSection, ComposicionCorporalSection, IndiceRendimientoSection } from './EvolutionVisuals';
import { StressEvolutionSection, SleepEvolutionSection, RecoveryEvolutionSection } from './EvolutionExtraCategories';
import { CheckinAccordion } from './CheckinAccordion';
import { InsightsSection } from '../insights/InsightsSection';
import { ClientLabCheckpoints } from './ClientLabCheckpoints';
import { BiologicalAgeCard } from './BiologicalAgeCard';
import ChartTooltip, { type TooltipHandle } from './charts/Tooltip';
import { CategorySection, CategoryFilterBar, type EvolutionCategory } from './charts/CategorySection';

const RANGE_OPTIONS = [7, 30, 90] as const;
// Ventana fija para las gráficas de Stress/Sleep/Recuperación (8 semanas de
// wearable/completions) — el selector 7/30/90 solo controla Índice de
// rendimiento por ahora, igual límite que ya tenía el propio mockup.
const EXTRA_CATEGORY_DAYS = 56;

const CATEGORIES: EvolutionCategory[] = [
  { key: 'todas', label: 'Todas', color: 'var(--eph-muted)' },
  { key: 'rendimiento', label: 'Rendimiento', color: 'var(--eph-accent)' },
  { key: 'fisico', label: 'Físico', color: 'var(--eph-pillar-workout)' },
  { key: 'stress', label: 'Stress', color: 'var(--eph-pillar-stress)' },
  { key: 'sleep', label: 'Sleep', color: 'var(--eph-pillar-sleep)' },
  { key: 'recuperacion', label: 'Recuperación', color: 'var(--eph-pillar-recovery)' },
  { key: 'salud', label: 'Salud', color: 'var(--eph-accent-hi)' },
];

const subHeadingStyle: React.CSSProperties = { fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: 16, fontWeight: 400, color: 'var(--eph-text)', margin: '0 0 12px' };

async function fetchEvolutionBundle(clientId: string, days: number) {
  const [evo, fullClient, wellnessIndex, wellnessHistory, completions, regulationCapacity, wearableMetrics] = await Promise.all([
    getEvolutionData(clientId),
    fetchClient(clientId).catch(() => null as ClientDetail | null),
    getWellnessIndex(clientId).catch(() => null),
    getWellnessIndexHistory(clientId, days).catch(() => ({ points: [], typical: null })),
    listCompletions(clientId).catch(() => [] as StressCompletion[]),
    getRegulationCapacityOverview(clientId).catch(() => null as RegulationCapacityOverview | null),
    getMetricas(clientId, EXTRA_CATEGORY_DAYS).catch(() => ({ total: 0, promedios: {}, data: [] as WearableMetrica[] })),
  ]);
  return { evo, fullClient, wellnessIndex, wellnessHistory, completions, regulationCapacity, wearableMetrics: wearableMetrics.data };
}

export function ClientEvolutionPanel({ clientId }: { clientId: string }) {
  const [range, setRange] = useState<(typeof RANGE_OPTIONS)[number]>(30);
  const [activeCat, setActiveCat] = useState('todas');
  const tip = useRef<TooltipHandle>(null);
  const { data, error, isLoading, mutate } = useSWR(['evolution-bundle', clientId, range], () =>
    fetchEvolutionBundle(clientId, range),
  );

  const header = <IdentityHeader title="Evolution" subtitle="Tu trayectoria medible hacia el máximo rendimiento sostenible." />;

  if (isLoading) {
    return (
      <div>
        {header}
        <p className="text-sm text-[var(--eph-muted)]">Cargando tu evolución…</p>
      </div>
    );
  }
  if (error && error instanceof PermissionDeniedError) {
    return (
      <div>
        {header}
        <LockedBenefit benefit="tu Índice de Rendimiento y tu evolución" />
      </div>
    );
  }
  if (error) {
    return (
      <div>
        {header}
        <p role="alert" className="text-[var(--eph-danger)]">{(error as Error).message}</p>
      </div>
    );
  }
  if (!data) return null;

  const { evo, fullClient: client, wellnessIndex, wellnessHistory, completions, regulationCapacity, wearableMetrics } = data;
  const isMentoring = client?.clientType === 'mentoring';

  return (
    <div>
      <ChartTooltip ref={tip} />
      {header}
      {isMentoring && <InsightsSection clientId={clientId} moduleKey="miEvolucion" />}

      {/* Selector de rango (spec 27.1) — cambia la fila de cifras y la
          gráfica de Índice de rendimiento a la vez. */}
      <div style={{ display: 'flex', gap: 6, background: 'var(--eph-surface-2)', border: '1px solid var(--eph-line)', borderRadius: 999, padding: 4, width: 'fit-content', marginTop: 20 }}>
        {RANGE_OPTIONS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            style={{
              border: 'none', background: range === r ? 'var(--eph-accent)' : 'transparent',
              color: range === r ? 'var(--eph-ink)' : 'var(--eph-muted)', padding: '7px 16px',
              borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
            }}
          >
            {r} días
          </button>
        ))}
      </div>

      <CategoryFilterBar cats={CATEGORIES} active={activeCat} onChange={setActiveCat} />

      <CategorySection catKey="rendimiento" active={activeCat} color="var(--eph-accent)" label="Rendimiento">
        <h3 style={subHeadingStyle}>Índice de rendimiento</h3>
        <IndiceRendimientoSection
          value={wellnessIndex?.value ?? null}
          typical={wellnessHistory.typical}
          points={wellnessHistory.points}
          componentsUsed={wellnessIndex?.componentsUsed}
          tip={tip}
        />
      </CategorySection>

      <CategorySection catKey="fisico" active={activeCat} color="var(--eph-pillar-workout)" label="Físico">
        <h3 style={subHeadingStyle}>Evolución física</h3>
        <EvolucionFisicaSection
          anthropometrics={evo?.anthropometrics ?? []}
          inbody={evo?.inbody ?? []}
          objetivos={client?.objetivos}
          inbodyCadenceType={client?.inbodyCadenceType}
          tip={tip}
        />
        <div style={{ marginTop: 24 }}>
          <ComposicionCorporalSection inbody={evo?.inbody ?? []} tip={tip} />
        </div>
      </CategorySection>

      <CategorySection catKey="stress" active={activeCat} color="var(--eph-pillar-stress)" label="Stress">
        <StressEvolutionSection regulationCapacity={regulationCapacity} completions={completions} tip={tip} />
      </CategorySection>

      <CategorySection catKey="sleep" active={activeCat} color="var(--eph-pillar-sleep)" label="Sleep">
        <SleepEvolutionSection metrics={wearableMetrics} tip={tip} />
      </CategorySection>

      <CategorySection catKey="recuperacion" active={activeCat} color="var(--eph-pillar-recovery)" label="Recuperación">
        <RecoveryEvolutionSection metrics={wearableMetrics} tip={tip} />
      </CategorySection>

      <CategorySection catKey="salud" active={activeCat} color="var(--eph-accent-hi)" label="Salud">
        {isMentoring ? (
          <>
            <BiologicalAgeCard clientId={clientId} />
            <div style={{ marginTop: 28 }}>
              <h3 style={subHeadingStyle}>Laboratorios de seguimiento</h3>
              <ClientLabCheckpoints clientId={clientId} />
            </div>
          </>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--eph-muted)' }}>Edad biológica y laboratorios de seguimiento son exclusivos de Mentoría.</p>
        )}
      </CategorySection>

      <div style={{ marginTop: 28 }}>
        <CheckinAccordion clientId={clientId} onSaved={() => mutate()} />
      </div>
    </div>
  );
}
