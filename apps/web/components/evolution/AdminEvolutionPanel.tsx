'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { getEvolutionData, updateNextCheckinDate } from '../../lib/evolution-client';
import { listCompletions as listCortisolCompletions, listCheckins as listCortisolCheckins, type CortisolCompletion, type CortisolCheckinRecord } from '../../lib/cortisol-client';
import { calculateCortisolWeeklyStats } from '../../lib/cortisol-logic';
import { listLogs as listSleepLogs, type SleepLog } from '../../lib/sleep-client';
import { listTrainingCompletions, type TrainingCompletion } from '../../lib/training-client';
import { calculateDisciplineStats } from '../../lib/training-home-logic';
import { fetchClient, type ClientDetail } from '../../lib/clients-client';
import { getWellnessIndex } from '../../lib/wellness-index-client';
import {
  calculateSleepQualityAvg,
  formatSleepHours,
  monthlyAverages,
  EMOCION_SCORE,
  getWellnessTrendStatus,
} from '../../lib/evolution-logic';
import { showToast } from '../layout/AppShell';
import { WellnessIndexHero, BienestarGeneral, EvolucionFisicaSection } from './EvolutionVisuals';
import { CheckinAccordion } from './CheckinAccordion';

const cardStyle: React.CSSProperties = {
  background: 'var(--paper)', border: '1px solid var(--border-hairline)',
  borderRadius: 'var(--radius-card)', padding: '22px 24px', marginBottom: 20,
};
const cardTitleStyle: React.CSSProperties = {
  fontSize: 15, fontWeight: 700, color: 'var(--ink)', margin: '0 0 16px',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 400, color: 'var(--ink-secondary)', marginBottom: 4,
};
const fieldStyle: React.CSSProperties = {
  width: 220, height: 32, borderRadius: 0, border: 'none', borderBottom: '1px solid var(--border-input)',
  padding: '0 2px 6px', fontSize: 14.5, fontWeight: 600, background: 'transparent', color: 'var(--ink)',
  outline: 'none', boxSizing: 'border-box',
};
const primaryButtonStyle: React.CSSProperties = {
  height: 40, padding: '0 22px', borderRadius: 9999, border: 'none', marginTop: 12,
  background: 'var(--ring-accent)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
};

function clientTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

async function fetchEvolutionBundle(clientId: string) {
  const [evo, cortisolCompletions, cortisolCheckins, fullClient, sleepLogs, trainingCompletions, wellnessIndex] = await Promise.all([
    getEvolutionData(clientId),
    listCortisolCompletions(clientId).catch(() => [] as CortisolCompletion[]),
    listCortisolCheckins(clientId).catch(() => [] as CortisolCheckinRecord[]),
    fetchClient(clientId).catch(() => null as ClientDetail | null),
    listSleepLogs(clientId).catch(() => [] as SleepLog[]),
    listTrainingCompletions(clientId).catch(() => [] as TrainingCompletion[]),
    getWellnessIndex(clientId).catch(() => null),
  ]);
  return { evo, cortisolCompletions, cortisolCheckins, fullClient, sleepLogs, trainingCompletions, wellnessIndex };
}

export function AdminEvolutionPanel({ clientId }: { clientId: string }) {
  const { data, error, isLoading, mutate } = useSWR(['evolution-bundle', clientId], () =>
    fetchEvolutionBundle(clientId),
  );
  const [nextCheckinDate, setNextCheckinDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setNextCheckinDate(data.fullClient?.nextCheckinDate || '');
  }, [data]);

  async function handleSaveNextCheckin() {
    setSaving(true);
    try {
      await updateNextCheckinDate(clientId, nextCheckinDate || null);
      showToast('Fecha guardada.', 'success');
      await mutate();
    } catch (e) {
      showToast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) return <p style={{ color: 'var(--ink-secondary)', fontSize: 14 }}>Cargando evolución del cliente…</p>;
  if (error) return <p role="alert" style={{ color: 'var(--danger)' }}>{(error as Error).message}</p>;
  if (!data) return null;

  const { evo, cortisolCompletions, cortisolCheckins, fullClient: client, sleepLogs, trainingCompletions, wellnessIndex } = data;

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

  const accesoEvolucionFisica = client?.clientType !== 'lead_wellness';

  return (
    <div>
      <div style={cardStyle}>
        <h3 style={cardTitleStyle}>Próxima medición (admin)</h3>
        <label style={labelStyle} htmlFor="ev-next-checkin">Fecha de la próxima medición</label>
        <input id="ev-next-checkin" type="date" style={fieldStyle} value={nextCheckinDate} onChange={(e) => setNextCheckinDate(e.target.value)} />
        <div>
          <button type="button" disabled={saving} style={{ ...primaryButtonStyle, opacity: saving ? 0.6 : 1 }} onClick={handleSaveNextCheckin}>
            {saving ? 'Guardando…' : 'Guardar fecha'}
          </button>
        </div>
      </div>

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
          streakWeeks={null}
        />
      ) : (
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>Tu evolución física</h3>
          <p style={{ fontSize: 13, color: 'var(--ink-secondary)', margin: 0 }}>
            Este cliente es Lead Wellness — la evolución física se le muestra bloqueada hasta que se active con un coach.
          </p>
        </div>
      )}

      <CheckinAccordion clientId={clientId} onSaved={() => mutate()} />
    </div>
  );
}
