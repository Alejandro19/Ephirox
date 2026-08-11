'use client';

import { useState } from 'react';
import type { Exercise, TrainingCompletion, TrainingStreak } from '../../lib/training-client';
import type { MindsetQuote } from '../../lib/quotes-client';
import { isDayUnlocked, isDayCompletedThisWeek, calculateDisciplineStats } from '../../lib/training-home-logic';
import IdentityHeader from '../ui/IdentityHeader';
import MantraCard from '../ui/MantraCard';
import { ProgressBar } from './TrainingVisuals';
import { IconFlame, IconShield, IconLock } from '../ui/icons';

export type TrainingHomeProps = {
  trainingDays: number;
  exercises: Exercise[];
  completions: TrainingCompletion[];
  streak: TrainingStreak | null;
  quote: MindsetQuote | null;
  clientName: string;
  onOpenDay: (day: number) => void;
  onUseProtector: () => void;
  protectorPending: boolean;
};

function monthCalendarCells(completions: TrainingCompletion[]): { day: number; completed: boolean }[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const completedDates = new Set(completions.map((c) => c.completedDate));
  return Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { day, completed: completedDates.has(iso) };
  });
}

function nextActionableDay(trainingDays: number, completions: TrainingCompletion[]): number | null {
  for (let day = 1; day <= trainingDays; day++) {
    if (isDayUnlocked(day, completions) && !isDayCompletedThisWeek(day, completions)) return day;
  }
  return null;
}

export function TrainingHome({
  trainingDays,
  exercises,
  completions,
  streak,
  quote,
  clientName,
  onOpenDay,
  onUseProtector,
  protectorPending,
}: TrainingHomeProps) {
  const [disciplineOpen, setDisciplineOpen] = useState(false);
  const days = Array.from({ length: trainingDays }, (_, i) => i + 1);
  const stats = calculateDisciplineStats(completions, trainingDays);
  const calendarCells = monthCalendarCells(completions);
  const heroDay = nextActionableDay(trainingDays, completions);
  const heroCount = heroDay !== null ? exercises.filter((ex) => ex.dayNumber === heroDay).length : 0;

  return (
    <div>
      <IdentityHeader title="Entrenamiento" subtitle={trainingDays ? 'Tu programa de ejercicios personalizado.' : undefined} />

      {quote && (
        <MantraCard mantra={quote.quote} lead={`Hola ${clientName}, repite después de mí:`} author={quote.author} />
      )}

      {heroDay !== null && (
        <div
          className="relative mt-8 mb-6 overflow-hidden rounded-[var(--radius-hero)] p-7"
          style={{ background: 'var(--hero-espresso)', color: 'var(--hero-espresso-text)' }}
        >
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-[180px] w-[180px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(217,183,126,.18) 0%, transparent 70%)' }}
          />
          <div className="relative z-10 mb-2.5 flex items-start justify-between gap-3">
            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--hero-espresso-accent)' }}>
              HOY · DÍA {heroDay}
            </p>
            {streak && (
              <div className="flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5" style={{ background: 'rgba(255,255,255,.12)' }}>
                <IconFlame size={14} />
                <span className="text-[13px] font-bold">{streak.streakWeeks}</span>
                <span className="text-[9.5px]" style={{ color: streak.atRisk ? '#F0C68A' : 'var(--hero-espresso-text-muted)' }}>
                  {streak.atRisk ? 'en riesgo' : streak.streakWeeks === 1 ? 'semana seguida' : 'semanas seguidas'}
                </span>
              </div>
            )}
          </div>
          <p className="relative z-10 mb-1.5 font-serif text-xl font-semibold">
            {heroCount === 0 ? 'Aún no tienes ejercicios asignados' : `${heroCount} ejercicio${heroCount === 1 ? '' : 's'} por entrenar`}
          </p>
          {heroCount > 0 && (
            <p className="relative z-10 text-[13px]" style={{ color: 'var(--hero-espresso-text-muted)' }}>
              Asignados por tu mentor
            </p>
          )}
          <div className="relative z-10 mt-5 flex items-center justify-end gap-4">
            <button
              type="button"
              disabled={heroCount === 0}
              onClick={() => onOpenDay(heroDay)}
              className="whitespace-nowrap rounded-full px-5 py-2.5 text-[13px] font-bold disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: 'var(--hero-espresso-accent)', color: 'var(--hero-espresso)' }}
            >
              Comenzar sesión
            </button>
          </div>
        </div>
      )}

      {streak && (
        <section className="rounded-[var(--radius-card)] border border-[var(--border-hairline)] bg-[var(--paper)] p-6 mb-5">
          <div className="mb-1 font-serif text-[15px] font-bold text-[var(--ink)]">Tu semana</div>
          <div className="flex items-center gap-2.5">
            {Array.from({ length: streak.sessionsRequiredThisWeek }, (_, i) => i + 1).map((n) => {
              const done = n <= streak.sessionsDoneThisWeek;
              const shielded = !done && streak.protectorUsedThisWeek;
              return (
                <div
                  key={n}
                  className={`flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-full border text-[13px] transition-colors ${
                    done
                      ? 'border-[var(--hero-espresso-accent)] bg-[var(--hero-espresso-accent)] text-white'
                      : shielded
                        ? 'border-[#E1D5EE] bg-[#F1EAF7] text-[#8A5FA0]'
                        : 'border-[var(--border-input)] font-semibold text-[var(--ink-secondary)]'
                  }`}
                >
                  {done ? '✓' : shielded ? <IconShield size={14} /> : n}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[13px] text-[var(--ink-secondary)]">
            {streak.protectorUsedThisWeek
              ? 'Semana protegida — no necesitas completar más sesiones para conservar tu racha.'
              : `${streak.sessionsDoneThisWeek} de ${streak.sessionsRequiredThisWeek} sesiones completadas.`}
          </p>
        </section>
      )}

      {streak && (
        <section className="rounded-[var(--radius-card)] border border-[var(--border-hairline)] bg-[var(--paper)] p-6 mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#F1EAF7] text-[#8A5FA0]">
              <IconShield size={15} />
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-[var(--ink)]">
                {streak.protectorUsedThisWeek ? 'Protector ya usado esta semana' : 'Protector de racha disponible'}
              </div>
              <div className="mt-0.5 text-[10.5px] text-[var(--ink-secondary)]">
                {streak.protectorUsedThisWeek
                  ? 'Vuelve a estar disponible la próxima semana.'
                  : 'Úsalo si esta semana no puedes completar tus sesiones — tu racha no se rompe.'}
              </div>
            </div>
            <button
              type="button"
              disabled={streak.protectorUsedThisWeek || protectorPending}
              onClick={onUseProtector}
              className="h-8 flex-shrink-0 rounded-full border border-[#E1D5EE] px-3.5 text-[11px] font-bold text-[#8A5FA0] disabled:cursor-default disabled:opacity-40"
            >
              {streak.protectorUsedThisWeek ? 'Usado' : 'Usar protector'}
            </button>
          </div>
        </section>
      )}

      <section className="rounded-[var(--radius-card)] border border-[var(--border-hairline)] bg-[var(--paper)] p-6 mb-5">
        <h2 className="mb-4 font-serif text-lg font-bold text-[var(--ink)]">Días de entrenamiento</h2>
        {days.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {days.map((day) => {
              const unlocked = isDayUnlocked(day, completions);
              const completedThisWeek = isDayCompletedThisWeek(day, completions);
              const count = exercises.filter((ex) => ex.dayNumber === day).length;
              return (
                <button
                  key={day}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => onOpenDay(day)}
                  className="rounded-xl border border-[var(--border-hairline)] bg-[var(--paper)] px-3.5 py-5 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-50 enabled:hover:border-[var(--hero-espresso-accent)] enabled:hover:shadow-[0_6px_16px_rgba(217,183,126,.18)]"
                >
                  <div className="font-serif text-[22px] font-semibold text-[var(--ink)]">Día {day}</div>
                  <div className="mt-1 text-[10px] text-[var(--ink-secondary)]">
                    {!unlocked ? (
                      <span className="inline-flex items-center gap-1">
                        <IconLock size={11} /> Bloqueado
                      </span>
                    ) : completedThisWeek ? (
                      'Completado esta semana'
                    ) : (
                      `${count} ejercicio${count === 1 ? '' : 's'}`
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="py-10 text-center text-[var(--ink-secondary)]">Tu coach aún no configuró tus días de entrenamiento.</div>
        )}
      </section>

      {days.length > 0 && (
        <section className="rounded-[var(--radius-card)] border border-[var(--border-hairline)] bg-[var(--paper)] p-6 mb-5">
          <div className="overflow-hidden rounded-xl border border-[var(--border-hairline)]">
            <button
              type="button"
              onClick={() => setDisciplineOpen((v) => !v)}
              className="flex w-full items-center justify-between bg-[var(--page-bg)] px-[18px] py-4 text-left text-[15px] font-bold text-[var(--ink)]"
            >
              Nivel de disciplina
              <span className="flex items-center gap-2.5">
                <span className="inline-block h-1.5 w-[70px] overflow-hidden rounded-full bg-[var(--border-hairline)]">
                  <span
                    className="block h-full rounded-full bg-[var(--hero-espresso-accent)]"
                    style={{ width: `${Math.min(stats.pct, 100)}%` }}
                  />
                </span>
                <span className="text-xs font-bold text-[var(--ink)]">{stats.pct}%</span>
                <span className="text-sm text-[var(--ink)]">{disciplineOpen ? 'Ocultar' : 'Ver'}</span>
              </span>
            </button>
            {disciplineOpen && (
              <div className="bg-[var(--paper)] px-[18px] pb-3 pt-[18px]">
                <ProgressBar done={stats.doneDays} total={stats.expected} />
                <div className="mx-auto mt-3.5 grid max-w-[280px] grid-cols-7 gap-[5px]">
                  {calendarCells.map(({ day, completed }) => (
                    <div
                      key={day}
                      className="flex aspect-square flex-col items-center justify-center rounded-[10px] border text-[11px]"
                      style={completed
                        ? { borderColor: 'var(--hero-espresso-accent)', background: 'rgba(217,183,126,.18)', color: 'var(--ink)' }
                        : { borderColor: 'var(--border-hairline)', background: 'var(--page-bg)', color: 'var(--ink-secondary)' }}
                    >
                      {completed ? <strong>{day}</strong> : <span>{day}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
