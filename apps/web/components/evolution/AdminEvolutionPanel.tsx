'use client';

import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { getEvolutionData, updateNextCheckinDate } from '../../lib/evolution-client';
import { fetchClient, type ClientDetail } from '../../lib/clients-client';
import { getWellnessIndex, getWellnessIndexHistory } from '../../lib/wellness-index-client';
import { listLabPanels, type LabPanel } from '../../lib/lab-panels-client';
import { AdminLabPanelReview } from '../admin/AdminLabPanelReview';
import { showToast } from '../layout/AppShell';
import { EvolucionFisicaSection, ComposicionCorporalSection, IndiceRendimientoSection } from './EvolutionVisuals';
import { CheckinAccordion } from './CheckinAccordion';
import { InsightsSection } from '../insights/InsightsSection';
import ChartTooltip, { type TooltipHandle } from './charts/Tooltip';
import { CategorySection, CategoryFilterBar, type EvolutionCategory } from './charts/CategorySection';

const cardStyle: React.CSSProperties = {
  background: 'var(--eph-surface)', border: '1px solid var(--eph-line)',
  borderRadius: '0', padding: '22px 24px', marginBottom: 20,
};
const cardTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: 18, fontWeight: 400, color: 'var(--eph-text)', margin: '0 0 16px',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace', fontSize: 10,
  textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 400, color: 'var(--eph-muted)', marginBottom: 6,
};
const fieldStyle: React.CSSProperties = {
  width: 220, height: 32, borderRadius: 0, border: 'none', borderBottom: '1px solid var(--eph-line-2)',
  padding: '0 2px 6px', fontSize: 15, fontWeight: 400, background: 'transparent', color: 'var(--eph-text)',
  outline: 'none', boxSizing: 'border-box',
};
const primaryButtonStyle: React.CSSProperties = {
  height: 40, padding: '0 22px', borderRadius: 0, border: 'none', marginTop: 12,
  fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
  background: 'var(--eph-accent)', color: 'var(--eph-ink)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', cursor: 'pointer',
};
const subHeadingStyle: React.CSSProperties = { fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: 16, fontWeight: 400, color: 'var(--eph-text)', margin: '0 0 12px' };

const RANGE_OPTIONS = [7, 30, 90] as const;
const CATEGORIES: EvolutionCategory[] = [
  { key: 'todas', label: 'Todas', color: 'var(--eph-muted)' },
  { key: 'rendimiento', label: 'Rendimiento', color: 'var(--eph-accent)' },
  { key: 'fisico', label: 'Físico', color: 'var(--eph-pillar-workout)' },
  { key: 'salud', label: 'Salud', color: 'var(--eph-accent-hi)' },
];

async function fetchEvolutionBundle(clientId: string, days: number) {
  const [evo, fullClient, wellnessIndex, wellnessHistory, labPanels] = await Promise.all([
    getEvolutionData(clientId),
    fetchClient(clientId).catch(() => null as ClientDetail | null),
    getWellnessIndex(clientId).catch(() => null),
    getWellnessIndexHistory(clientId, days).catch(() => ({ points: [], typical: null })),
    listLabPanels(clientId).catch(() => [] as LabPanel[]),
  ]);
  return { evo, fullClient, wellnessIndex, wellnessHistory, labPanels };
}

export function AdminEvolutionPanel({ clientId }: { clientId: string }) {
  const [range, setRange] = useState<(typeof RANGE_OPTIONS)[number]>(30);
  const [activeCat, setActiveCat] = useState('todas');
  const tip = useRef<TooltipHandle>(null);
  const { data, error, isLoading, mutate } = useSWR(['evolution-bundle', clientId, range], () =>
    fetchEvolutionBundle(clientId, range),
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

  if (isLoading) return <p style={{ color: 'var(--eph-muted)', fontSize: 14 }}>Cargando evolución del cliente…</p>;
  if (error) return <p role="alert" style={{ color: 'var(--eph-danger)' }}>{(error as Error).message}</p>;
  if (!data) return null;

  const { evo, fullClient: client, wellnessIndex, wellnessHistory, labPanels } = data;
  const isMentoring = client?.clientType === 'mentoring';

  return (
    <div>
      <ChartTooltip ref={tip} />
      {isMentoring && <InsightsSection clientId={clientId} moduleKey="miEvolucion" />}
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

      <div style={{ display: 'flex', gap: 6, background: 'var(--eph-surface-2)', border: '1px solid var(--eph-line)', borderRadius: 999, padding: 4, width: 'fit-content', marginTop: 8, marginBottom: 8 }}>
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

      {isMentoring && (
        <CategorySection catKey="salud" active={activeCat} color="var(--eph-accent-hi)" label="Salud">
          <h3 style={subHeadingStyle}>Laboratorios de seguimiento</h3>
          {[6, 12].map((semana) => (
            <div key={semana} style={{ marginBottom: 20 }}>
              <span style={labelStyle}>Semana {semana}</span>
              <div style={{ marginTop: 6 }}>
                <AdminLabPanelReview
                  clientId={clientId}
                  semana={semana}
                  panel={labPanels.find((p) => p.semanaNumero === semana)}
                  onApproved={() => { void mutate(); }}
                />
              </div>
            </div>
          ))}
        </CategorySection>
      )}

      <div style={{ marginTop: 8 }}>
        <CheckinAccordion clientId={clientId} onSaved={() => mutate()} />
      </div>
    </div>
  );
}
