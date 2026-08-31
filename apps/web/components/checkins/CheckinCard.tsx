'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { getCheckinsStatus, postDailyCheckin, postWeeklyReflection } from '@/lib/checkins-client';
import { putPersonalInfo } from '@/lib/onboarding-client';
import Button from '@/components/ui/Button';

// Escala de 5 caras del spec, representada como círculos numerados con
// gradiente de color (peor→mejor) — no hay set de íconos de caras en
// components/ui/icons.tsx todavía, y agregar 5 SVG nuevos para esto no vale
// la pena frente a un color+número, que comunica lo mismo.
const PULSO_OPTIONS: { value: number; label: string; color: string }[] = [
  { value: 1, label: 'Muy mal', color: '#B85C4A' },
  { value: 2, label: 'Mal', color: '#C98A5E' },
  { value: 3, label: 'Regular', color: '#C9A66B' },
  { value: 4, label: 'Bien', color: '#8FA37A' },
  { value: 5, label: 'Muy bien', color: '#6B8F71' },
];

const DESPERTARES_OPTIONS: ('Ninguno' | '1-2' | '3+')[] = ['Ninguno', '1-2', '3+'];

export function CheckinCard({ clientId }: { clientId: string }) {
  const { data: status, mutate } = useSWR(['checkins-status', clientId], () => getCheckinsStatus(clientId));

  // Estado local "ya resuelto en esta sesión" — evita que la card reaparezca
  // un instante entre guardar y que mutate() traiga el status actualizado, y
  // permite descartar "Aún no" de período sin insistir de nuevo hoy mismo.
  const [pulsoSaved, setPulsoSaved] = useState(false);
  const [reflectionSaved, setReflectionSaved] = useState(false);
  const [periodDismissed, setPeriodDismissed] = useState(false);

  const [estres, setEstres] = useState(5);
  const [tecnicas, setTecnicas] = useState('');
  const [despertares, setDespertares] = useState<'Ninguno' | '1-2' | '3+'>('Ninguno');
  const [savingReflection, setSavingReflection] = useState(false);
  const [savingPeriod, setSavingPeriod] = useState(false);

  if (!status) return null;

  const showDaily = !status.dailyDoneToday && !pulsoSaved;
  const showWeekly = status.weeklyDueThisWeek && !reflectionSaved;
  const showPeriod = status.periodConfirmationDue && !periodDismissed;
  if (!showDaily && !showWeekly && !showPeriod) return null;

  async function handlePulso(value: number) {
    setPulsoSaved(true);
    try {
      await postDailyCheckin(clientId, value);
      await mutate();
    } catch {
      setPulsoSaved(false);
    }
  }

  async function handleReflection() {
    setSavingReflection(true);
    try {
      await postWeeklyReflection(clientId, {
        estresCronico: estres,
        tecnicasManejoUsadas: tecnicas.trim() || undefined,
        despertaresNocturnosSemana: despertares,
      });
      setReflectionSaved(true);
      await mutate();
    } finally {
      setSavingReflection(false);
    }
  }

  async function handlePeriodo(yaLlego: boolean) {
    if (!yaLlego) {
      setPeriodDismissed(true);
      return;
    }
    setSavingPeriod(true);
    try {
      await putPersonalInfo(clientId, { last_period_date: new Date().toISOString().slice(0, 10) });
      setPeriodDismissed(true);
      await mutate();
    } finally {
      setSavingPeriod(false);
    }
  }

  return (
    <div className="mb-5 flex flex-col gap-5 rounded-none border border-[var(--eph-line)] bg-[var(--eph-surface)] p-5">
      {showDaily && (
        <div>
          <p className="m-0 mb-2.5 text-[13px] font-semibold text-[var(--eph-text)]">¿Cómo te sientes hoy?</p>
          <div className="flex gap-2.5" role="group" aria-label="¿Cómo te sientes hoy?">
            {PULSO_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                aria-label={opt.label}
                onClick={() => handlePulso(opt.value)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-[13px] font-bold text-white transition-transform hover:scale-105"
                style={{ background: opt.color }}
              >
                {opt.value}
              </button>
            ))}
          </div>
        </div>
      )}

      {showWeekly && (
        <div className={showDaily ? 'border-t border-[var(--eph-line)] pt-5' : ''}>
          <p className="m-0 mb-3 text-[13px] font-semibold text-[var(--eph-text)]">Tu reflexión de esta semana</p>
          <div className="mb-3">
            <label className="mb-1.5 block text-[12px] text-[var(--eph-muted)]" htmlFor="reflection-stress">
              Nivel de estrés crónico (1-10): {estres}
            </label>
            <input
              id="reflection-stress"
              type="range"
              min={1}
              max={10}
              value={estres}
              onChange={(e) => setEstres(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div className="mb-3">
            <label className="mb-1.5 block text-[12px] text-[var(--eph-muted)]" htmlFor="reflection-coping">
              Técnicas de manejo del estrés que usaste
            </label>
            <input
              id="reflection-coping"
              type="text"
              value={tecnicas}
              onChange={(e) => setTecnicas(e.target.value)}
              className="h-9 w-full border-0 border-b border-[var(--eph-line-2)] bg-transparent text-[14px] text-[var(--eph-text)] outline-none focus:border-[var(--eph-accent)]"
            />
          </div>
          <div className="mb-4">
            <p className="mb-1.5 text-[12px] text-[var(--eph-muted)]">Despertares nocturnos esta semana</p>
            <div className="flex gap-2" role="group" aria-label="Despertares nocturnos esta semana">
              {DESPERTARES_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  aria-pressed={despertares === opt}
                  onClick={() => setDespertares(opt)}
                  className="rounded-[999px] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.06em]"
                  style={{
                    border: despertares === opt ? '1px solid var(--eph-accent)' : '1px solid var(--eph-line-2)',
                    background: despertares === opt ? 'var(--eph-accent)' : 'transparent',
                    color: despertares === opt ? 'var(--eph-ink)' : 'var(--eph-body)',
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
          <Button type="button" variant="primary" onClick={handleReflection} disabled={savingReflection}>
            {savingReflection ? 'Guardando…' : 'Guardar reflexión'}
          </Button>
        </div>
      )}

      {showPeriod && (
        <div className={showDaily || showWeekly ? 'border-t border-[var(--eph-line)] pt-5' : ''}>
          <p className="m-0 mb-2.5 text-[13px] font-semibold text-[var(--eph-text)]">¿Tu período ya llegó?</p>
          <div className="flex gap-2">
            <Button type="button" variant="primary" disabled={savingPeriod} onClick={() => handlePeriodo(true)}>
              Sí
            </Button>
            <Button type="button" variant="secondary" disabled={savingPeriod} onClick={() => handlePeriodo(false)}>
              Aún no
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
