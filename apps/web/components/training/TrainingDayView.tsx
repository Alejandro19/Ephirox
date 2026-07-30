'use client';

import type { Exercise, ExerciseCategory } from '../../lib/training-client';
import { CATEGORY_ORDER, getCategoryLockState } from '../../lib/training-day-logic';

const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  warmup: 'Calentamiento',
  strength: 'Fuerza',
  cardio: 'Cardio',
};

export type TrainingDayViewProps = {
  day: number;
  exercises: Exercise[];
  completedIds: Set<string>;
  alreadyCompletedThisWeek: boolean;
  onOpenCategory: (category: ExerciseCategory) => void;
  onCompleteDay: () => Promise<void>;
  completingDay: boolean;
};

export function TrainingDayView({
  day,
  exercises,
  completedIds,
  alreadyCompletedThisWeek,
  onOpenCategory,
  onCompleteDay,
  completingDay,
}: TrainingDayViewProps) {
  const allDone = exercises.length > 0 && exercises.every((ex) => completedIds.has(ex.id));

  return (
    <div>
      <h1>Día {day}</h1>

      <div>
        {CATEGORY_ORDER.map((category) => {
          const state = alreadyCompletedThisWeek
            ? exercises.some((ex) => ex.category === category)
              ? 'done'
              : 'no_asignada'
            : getCategoryLockState(category, exercises, completedIds);
          return (
            <button
              key={category}
              type="button"
              disabled={state === 'no_asignada' || state === 'locked'}
              onClick={() => onOpenCategory(category)}
            >
              {CATEGORY_LABELS[category]}
              {state === 'locked' ? ' 🔒' : state === 'done' ? ' ✓' : ''}
            </button>
          );
        })}
      </div>

      {alreadyCompletedThisWeek ? (
        <p>Día completado esta semana.</p>
      ) : (
        <button type="button" disabled={!allDone || completingDay} onClick={() => onCompleteDay()}>
          Completar Entrenamiento Día {day}
        </button>
      )}
    </div>
  );
}
