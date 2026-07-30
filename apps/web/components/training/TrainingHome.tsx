'use client';

import type { Exercise, TrainingCompletion } from '../../lib/training-client';
import { isDayUnlocked, isDayCompletedThisWeek, calculateDisciplineStats } from '../../lib/training-home-logic';

export type TrainingHomeProps = {
  trainingDays: number;
  exercises: Exercise[];
  completions: TrainingCompletion[];
  onOpenDay: (day: number) => void;
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

export function TrainingHome({ trainingDays, exercises, completions, onOpenDay }: TrainingHomeProps) {
  const days = Array.from({ length: trainingDays }, (_, i) => i + 1);
  const stats = calculateDisciplineStats(completions, trainingDays);
  const calendarCells = monthCalendarCells(completions);
  const heroDay = nextActionableDay(trainingDays, completions);

  return (
    <div>
      <h1>Entrenamiento</h1>

      {heroDay !== null && (
        <section>
          <button type="button" onClick={() => onOpenDay(heroDay)}>
            Comenzar sesión
          </button>
        </section>
      )}

      <section>
        <h2>Días de entrenamiento</h2>
        <div>
          {days.map((day) => {
            const unlocked = isDayUnlocked(day, completions);
            const completedThisWeek = isDayCompletedThisWeek(day, completions);
            const count = exercises.filter((ex) => ex.dayNumber === day).length;
            return (
              <button key={day} type="button" disabled={!unlocked} onClick={() => onOpenDay(day)}>
                Día {day} {completedThisWeek ? '— Completado esta semana' : !unlocked ? '— Bloqueado' : `— ${count} ejercicios`}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h2>Nivel de disciplina</h2>
        <p>
          {stats.doneDays}/{stats.expected} · {stats.pct}%
        </p>
        <div>
          {calendarCells.map(({ day, completed }) =>
            completed ? (
              <strong key={day}>{day}</strong>
            ) : (
              <span key={day}>{day}</span>
            )
          )}
        </div>
      </section>
    </div>
  );
}
