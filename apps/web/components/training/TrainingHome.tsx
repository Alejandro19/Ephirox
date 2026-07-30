'use client';

import type { Exercise, TrainingCompletion } from '../../lib/training-client';
import { isDayUnlocked, isDayCompletedThisWeek, calculateDisciplineStats } from '../../lib/training-home-logic';

export type TrainingHomeProps = {
  trainingDays: number;
  exercises: Exercise[];
  completions: TrainingCompletion[];
  onOpenDay: (day: number) => void;
};

export function TrainingHome({ trainingDays, exercises, completions, onOpenDay }: TrainingHomeProps) {
  const days = Array.from({ length: trainingDays }, (_, i) => i + 1);
  const stats = calculateDisciplineStats(completions, trainingDays);

  return (
    <div>
      <h1>Entrenamiento</h1>

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
      </section>
    </div>
  );
}
