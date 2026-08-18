'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { getEvolutionData, type EvolutionData } from '../../lib/evolution-client';
import {
  listCompletions as listCortisolCompletions,
  listCheckins as listCortisolCheckins,
  type CortisolCompletion,
  type CortisolCheckinRecord,
} from '../../lib/cortisol-client';
import { calculateCortisolWeeklyStats } from '../../lib/cortisol-logic';
import { listLogs as listSleepLogs, type SleepLog } from '../../lib/sleep-client';
import { listTrainingCompletions, getStreak, type TrainingCompletion } from '../../lib/training-client';
import { calculateDisciplineStats } from '../../lib/training-home-logic';
import { fetchClient, type ClientDetail } from '../../lib/clients-client';
import { PermissionDeniedError } from '../../lib/api-client';
import { pickMantra } from '../../lib/mantra-bank';
import { COACH_WHATSAPP_NUMBER } from '../../lib/constants';
import { getWellnessIndex } from '../../lib/wellness-index-client';
import {
  calculateSleepQualityAvg,
  formatSleepHours,
  monthlyAverages,
  EMOCION_SCORE,
  getWellnessTrendStatus,
} from '../../lib/evolution-logic';
import IdentityHeader from '../ui/IdentityHeader';
import MantraCard from '../ui/MantraCard';
import LockedBenefit from '../ui/LockedBenefit';
import { WellnessIndexHero, BienestarGeneral, EvolucionFisicaSection, EvolucionFisicaLocked } from './EvolutionVisuals';
import { CheckinAccordion } from './CheckinAccordion';

function clientTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

async function fetchEvolutionBundle(clientId: string) {
  const [evo, cortisolCompletions, cortisolCheckins, fullClient, sleepLogs, trainingCompletions, streak, wellnessIndex] = await Promise.all([
    getEvolutionData(clientId),
    listCortisolCompletions(clientId).catch(() => [] as CortisolCompletion[]),
    listCortisolCheckins(clientId).catch(() => [] as CortisolCheckinRecord[]),
    fetchClient(clientId).catch(() => null as ClientDetail | null),
    listSleepLogs(clientId).catch(() => [] as SleepLog[]),
    listTrainingCompletions(clientId).catch(() => [] as TrainingCompletion[]),
    getStreak(clientId, clientTz()).catch(() => null),
    getWellnessIndex(clientId).catch(() => null),
  ]);
  return { evo, cortisolCompletions, cortisolCheckins, fullClient, sleepLogs, trainingCompletions, streak, wellnessIndex };
}

export function ClientEvolutionPanel({ clientId }: { clientId: string }) {
  const [mantra] = useState(() => pickMantra('evolution'));
  const { data, error, isLoading, mutate } = useSWR(['evolution-bundle', clientId], () =>
    fetchEvolutionBundle(clientId),
  );

  const header = (
    <>
      <IdentityHeader title="Mi Evolución" subtitle="Tu proceso, en cifras." />
      {mantra && <MantraCard mantra={mantra} />}
    </>
  );

  if (isLoading) {
    return (
      <div>
        {header}
        <p className="text-sm text-[var(--ink-secondary)]">Cargando tu evolución…</p>
      </div>
    );
  }
  if (error && error instanceof PermissionDeniedError) {
    return (
      <div>
        {header}
        <LockedBenefit variant="upgrade" benefit="tu Índice de Bienestar y tu evolución" />
      </div>
    );
  }
  if (error) {
    return (
      <div>
        {header}
        <p role="alert" className="text-[var(--danger)]">{(error as Error).message}</p>
      </div>
    );
  }
  if (!data) return null;

  const { evo, cortisolCompletions, cortisolCheckins, fullClient: client, sleepLogs, trainingCompletions, streak, wellnessIndex } = data;

  const sleepAvg = calculateSleepQualityAvg(evo.checkins);
  const weeklyRegulation = calculateCortisolWeeklyStats(cortisolCompletions).count;

  const sleepMonths = monthlyAverages(sleepLogs, 'date', 'quality');
  const sleepLast = sleepMonths.length ? sleepMonths[sleepMonths.length - 1].avg : null;
  const sleepPrev = sleepMonths.length >= 2 ? sleepMonths[sleepMonths.length - 2].avg : null;
  const sleepDelta = sleepLast != null && sleepPrev != null ? sleepLast - sleepPrev : null;

  const cortisolScored = cortisolCheckins
    .map((c) => ({ checkinDate: c.checkinDate, score: EMOCION_SCORE[c.emotion] ?? null }))
    .filter((c): c is { checkinDate: string; score: number } => c.score != null);
  const cortisolMonths = monthlyAverages(cortisolScored, 'checkinDate', 'score');
  const cortisolLast = cortisolMonths.length ? cortisolMonths[cortisolMonths.length - 1].avg : null;
  const cortisolPrev = cortisolMonths.length >= 2 ? cortisolMonths[cortisolMonths.length - 2].avg : null;
  const cortisolDelta = cortisolLast != null && cortisolPrev != null ? cortisolLast - cortisolPrev : null;

  const disciplineStats = client?.trainingDays ? calculateDisciplineStats(trainingCompletions, client.trainingDays) : null;
  const streakWeeks = streak?.streakWeeks ?? null;

  const accesoEvolucionFisica = client?.clientType !== 'lead_wellness';

  return (
    <div>
      {header}
      <WellnessIndexHero index={wellnessIndex?.value ?? null} />
      <BienestarGeneral
        sleepAvg={sleepAvg != null ? formatSleepHours(sleepAvg) : null}
        weeklyRegulation={weeklyRegulation}
        sleepDelta={sleepDelta}
        sleepStatus={getWellnessTrendStatus(sleepDelta)}
        cortisolDelta={cortisolDelta}
        cortisolStatus={getWellnessTrendStatus(cortisolDelta)}
      />
      {accesoEvolucionFisica ? (
        <EvolucionFisicaSection
          anthropometrics={evo?.anthropometrics ?? []}
          inbody={evo?.inbody ?? []}
          objetivos={client?.objetivos}
          inbodyCadenceType={client?.inbodyCadenceType}
          disciplineStats={disciplineStats}
          streakWeeks={streakWeeks}
        />
      ) : (
        <EvolucionFisicaLocked onCta={() => window.open(`https://wa.me/${COACH_WHATSAPP_NUMBER}`, '_blank')} />
      )}
      <CheckinAccordion clientId={clientId} onSaved={() => mutate()} />
    </div>
  );
}
