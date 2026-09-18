'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  listTechniques,
  listCompletions,
  markCompletion,
  getTipOfTheDay,
  getTodayMorningCheckin,
  getCognitiveLoadOverview,
  getRegulationCapacityOverview,
  type StressTechnique,
  type StressCompletion,
  type RegulationCapacityOverview,
} from '../../lib/stress-client';
import { getActiveCase, type ActiveCaseView } from '../../lib/labeled-cases-client';
import { MorningCheckinSummary } from './MorningCheckinSummary';
import { CognitiveLoadSection } from './CognitiveLoadSection';
import { RoxRitualSection } from './RoxRitualSection';
import { RegulationCapacityCard } from './RegulationCapacityCard';
import { RecommendedProtocolCard } from './RecommendedProtocolCard';
import { StressPlanSection } from './StressPlanSection';
import { StressProtocolLibrary } from './StressProtocolLibrary';
import { youtubeEmbedUrl } from '../../lib/training-timer-logic';
import { calculateStressWeeklyStats } from '../../lib/stress-logic';
import { NEUROWELLNESS_TECHNIQUE_TYPES } from '@latribu/shared-types';
import { PermissionDeniedError } from '../../lib/api-client';
import { getModuleAccessState } from '../../lib/module-access';
import IdentityHeader from '../ui/IdentityHeader';
import RingProgress from '../ui/RingProgress';
import ProgressBar from '../ui/ProgressBar';
import LockedBenefit from '../ui/LockedBenefit';
import { ProtocolDisclaimerFooter } from '../ui/ProtocolDisclaimerFooter';
import { InsightsSection } from '../insights/InsightsSection';
import Button from '../ui/Button';

const TECHNIQUE_ICON_PATHS: Record<string, React.ReactNode> = {
  respiración: <path d="M3 10c2.5-3 4.5-3 7 0s4.5 3 7 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />,
  breathwork: <path d="M3 10c2.5-3 4.5-3 7 0s4.5 3 7 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />,
  meditación: <path d="M10 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm-6 12c1-3.5 3.5-5.5 6-5.5s5 2 6 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />,
  mindfulness: (
    <>
      <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <circle cx="10" cy="10" r="2" fill="currentColor" />
    </>
  ),
  'respiración vagal': <path d="M3 10c2.5-3 4.5-3 7 0s4.5 3 7 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />,
  'exposición controlada': (
    <path d="M10 3v14M4.5 6.5l11 7M4.5 13.5l11-7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  ),
  'recuperación activa': (
    <path d="M4 12l3-6 2.5 9L12 6l1.5 6H16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  ),
  base: (
    <>
      <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <path d="M10 6.5v4l2.6 1.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
};

function TechniqueIcon({ type }: { type: string | null }) {
  const key = (type || '').toLowerCase();
  const path = TECHNIQUE_ICON_PATHS[key] || TECHNIQUE_ICON_PATHS.base;
  return (
    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--eph-surface-2)]" style={{ color: 'var(--eph-accent)' }}>
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
        {path}
      </svg>
    </div>
  );
}

function StressPlayer({
  technique,
  doneToday,
  onComplete,
  onBack,
}: {
  technique: StressTechnique;
  doneToday: boolean;
  onComplete: () => void;
  onBack: () => void;
}) {
  const embedUrl = youtubeEmbedUrl(technique.youtubeUrl);
  return (
    <div>
      <button type="button" onClick={onBack} className="mb-3 inline-block bg-transparent p-0 font-mono text-[10px] uppercase tracking-[0.1em] hover:underline" style={{ color: 'var(--eph-muted)' }}>
        ← Stress
      </button>
      <h1 className="mb-1 font-display text-2xl" style={{ color: 'var(--eph-text)' }}>{technique.title}</h1>
      <p className="mb-5 font-body text-sm" style={{ color: 'var(--eph-muted)' }}>{[technique.type, technique.duration].filter(Boolean).join(' · ')}</p>

      <div className="border p-[26px]" style={{ borderColor: 'var(--eph-line)', background: 'var(--eph-surface)' }}>
        {embedUrl ? (
          <div className="relative overflow-hidden bg-black pt-[56.25%]">
            <iframe
              src={embedUrl}
              title={technique.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full border-0"
            />
          </div>
        ) : technique.audioUrl ? (
          <div className="border p-6 text-center" style={{ borderColor: 'var(--eph-line)', background: 'var(--eph-surface-2)' }}>
            <audio src={technique.audioUrl} controls className="w-full" />
          </div>
        ) : (
          <div className="py-10 text-center font-body" style={{ color: 'var(--eph-muted)' }}>Sin video ni audio asignado.</div>
        )}

        {technique.description && <p className="mt-4 font-body text-sm leading-relaxed" style={{ color: 'var(--eph-text)' }}>{technique.description}</p>}
        {technique.precautionNote && (
          <div className="mt-4 border px-4 py-3 font-body text-sm" style={{ borderColor: 'var(--eph-danger)', background: 'color-mix(in srgb, var(--eph-danger) 14%, transparent)', color: 'var(--eph-danger)' }}>
            <strong>Precaución:</strong> {technique.precautionNote}
          </div>
        )}

        <div className="mt-5 flex justify-center gap-2.5">
          {doneToday ? (
            <Button type="button" variant="secondary" disabled>
              Completado hoy ✓
            </Button>
          ) : (
            <Button type="button" variant="primary" onClick={onComplete}>
              Marcar completado
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={onBack}>
            Finalizar
          </Button>
        </div>
      </div>
    </div>
  );
}

async function fetchStressBundle(clientId: string) {
  const [techniques, completions, tip, morningCheckin, cognitiveLoad, activeCase, regulationCapacity] = await Promise.all([
    listTechniques(clientId),
    listCompletions(clientId).catch(() => [] as StressCompletion[]),
    getTipOfTheDay(clientId),
    getTodayMorningCheckin(clientId),
    getCognitiveLoadOverview(clientId),
    getActiveCase(clientId, 'stress').catch(() => null as ActiveCaseView | null),
    getRegulationCapacityOverview(clientId).catch(() => null as RegulationCapacityOverview | null),
  ]);
  return { techniques, completions, tip, morningCheckin, cognitiveLoad, activeCase, regulationCapacity };
}

export function ClientStressPanel({
  clientId,
  clientType,
  moduleAccess = {},
  planExpired = false,
}: {
  clientId: string;
  clientType?: string | null;
  moduleAccess?: Record<string, boolean>;
  planExpired?: boolean;
}) {
  const { data, error, isLoading, mutate } = useSWR(['stress-bundle', clientId], () =>
    fetchStressBundle(clientId),
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  async function handleComplete(techniqueId: string) {
    try {
      await markCompletion(clientId);
      const completionList = await listCompletions(clientId).catch(() => data?.completions ?? []);
      await mutate((current) => (current ? { ...current, completions: completionList } : current), { revalidate: false });
    } catch (e) {
      setActionError((e as Error).message);
    }
    void techniqueId;
  }

  const header = <IdentityHeader title="Stress" subtitle="Herramientas de Neuro-Wellness para regular tu sistema nervioso." />;

  if (isLoading) {
    return (
      <div>
        {header}
        <p className="text-sm text-[var(--eph-muted)]">Cargando técnicas de regulación…</p>
      </div>
    );
  }
  if (error && error instanceof PermissionDeniedError) {
    return (
      <div>
        {header}
        <LockedBenefit benefit="tu protocolo de Stress" />
      </div>
    );
  }
  const errorMessage = actionError || (error ? (error as Error).message : null);
  if (errorMessage) {
    return (
      <div>
        {header}
        <p role="alert" className="font-body" style={{ color: 'var(--eph-danger)' }}>{errorMessage}</p>
      </div>
    );
  }
  if (!data) return null;

  const { techniques, completions, tip, morningCheckin, cognitiveLoad, activeCase, regulationCapacity } = data;
  const active = activeId ? techniques.find((t) => t.id === activeId) : null;
  if (active) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const doneToday = completions.some((c) => c.completedDate === todayStr);
    return (
      <div>
        {header}
        <StressPlayer
          technique={active}
          doneToday={doneToday}
          onBack={() => setActiveId(null)}
          onComplete={() => handleComplete(active.id)}
        />
      </div>
    );
  }

  // Técnica destacada del hero: la primera técnica asignada por el admin
  // (sortOrder). El check-in de ánimo que antes elegía esto según la
  // emoción reportada por el cliente ya no existe como feature.
  const recommended = techniques[0] || null;
  const weeklyStats = calculateStressWeeklyStats(completions);
  const isNeurowellnessType = (type: string | null) => !!type && (NEUROWELLNESS_TECHNIQUE_TYPES as readonly string[]).includes(type);
  const neurowellnessTechniques = techniques.filter((t) => isNeurowellnessType(t.type));
  const generalTechniques = techniques.filter((t) => !isNeurowellnessType(t.type));
  const ritualTechniques = techniques.filter((t) => t.isRitual);

  return (
    <div>
      {header}

      <MorningCheckinSummary
        morningCheckin={morningCheckin}
        clientType={clientType}
        stressAccessState={getModuleAccessState('stress', { moduleAccess, planExpired })}
      />
      {clientType === 'mentoring' && <InsightsSection clientId={clientId} moduleKey="cortisol" />}

      <RegulationCapacityCard overview={cognitiveLoad} regulationCapacity={regulationCapacity} />

      {recommended && <RecommendedProtocolCard protocol={recommended} onStart={setActiveId} />}

      {clientType === 'mentoring' && (
        <StressPlanSection
          activeCase={activeCase}
          techniques={neurowellnessTechniques}
          playingAudioId={playingAudioId}
          setPlayingAudioId={setPlayingAudioId}
          setActiveId={setActiveId}
          TechniqueIcon={TechniqueIcon}
          Button={Button}
        />
      )}

      <StressProtocolLibrary techniques={generalTechniques} onSelect={setActiveId} />

      {generalTechniques.length === 0 && (
        <p className="mb-5 font-body text-xs" style={{ color: 'var(--eph-faint)' }}>
          Los protocolos de ejemplo de arriba se activan cuando tu mentor te asigne los tuyos.
        </p>
      )}

      {techniques.length > 0 && (
        <section className="border p-6 mb-5" style={{ borderColor: 'var(--eph-line)', background: 'var(--eph-surface)' }}>
          <h2 className="mb-4 font-display text-lg" style={{ color: 'var(--eph-text)' }}>Momento de regulación</h2>
          <div className="flex items-center gap-4">
            <RingProgress value={weeklyStats.pct} size={48} />
            <div className="flex-1">
              <ProgressBar done={weeklyStats.count} total={7} label="Esta semana" />
            </div>
          </div>
        </section>
      )}

      {tip && (
        <div className="mb-5 border p-[18px_20px]" style={{ borderColor: 'var(--eph-line)', background: 'var(--eph-surface-2)' }}>
          <p className="m-0 font-body text-xs" style={{ color: 'var(--eph-muted)' }}>
            <strong style={{ color: 'var(--eph-text)' }}>Sabías que</strong> {tip.content}
          </p>
        </div>
      )}

      <CognitiveLoadSection overview={cognitiveLoad} />
      <RoxRitualSection rituals={ritualTechniques} onStart={setActiveId} />

      <ProtocolDisclaimerFooter />
    </div>
  );
}
