'use client';

import { useEffect, useState } from 'react';
import type { Exercise } from '../../lib/training-client';
import { parseTimeToSeconds } from '../../lib/training-timer-logic';

export type TrainingPlayerProps = {
  exercises: Exercise[];
  completedIds: Set<string>;
  onMarkComplete: (exerciseId: string) => void;
  onExit: () => void;
};

export function TrainingPlayer({ exercises, completedIds, onMarkComplete, onExit }: TrainingPlayerProps) {
  const [index, setIndex] = useState(0);
  const [restRemaining, setRestRemaining] = useState<number | null>(null);

  const current = exercises[index];
  const isLast = index === exercises.length - 1;
  const isCurrentDone = current ? completedIds.has(current.id) : false;

  // Reaches 0 -> auto-advance (or stop, if last exercise).
  useEffect(() => {
    if (restRemaining === null || restRemaining > 0) return;
    setRestRemaining(null);
    if (!isLast) setIndex((i) => i + 1);
  }, [restRemaining, isLast]);

  // A single interval drives the countdown for the whole rest period, keyed
  // off the resting/not-resting transition rather than the numeric value —
  // this avoids depending on a fresh effect run (and thus a React render
  // flush) between every tick, which fake timers can't guarantee.
  const isResting = restRemaining !== null;
  useEffect(() => {
    if (!isResting) return;
    const interval = setInterval(() => {
      setRestRemaining((s) => (s === null ? null : s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isResting]);

  function goTo(newIndex: number) {
    setRestRemaining(null);
    setIndex(Math.max(0, Math.min(exercises.length - 1, newIndex)));
  }

  function handleMarkComplete() {
    if (!current) return;
    onMarkComplete(current.id);
    setRestRemaining(parseTimeToSeconds(current.restTime));
  }

  function handleSkipRest() {
    setRestRemaining(null);
    if (!isLast) setIndex((i) => i + 1);
  }

  if (!current) return null;

  return (
    <div>
      <h1>{current.title}</h1>

      {current.youtubeUrl ? (
        <iframe src={current.youtubeUrl} title={current.title} />
      ) : (
        <p>Sin video asignado.</p>
      )}

      {current.category === 'cardio' ? (
        <p>{current.duration ?? '—'}</p>
      ) : (
        <>
          <p>{current.series ?? '—'}</p>
          <p>{current.reps ?? '—'}</p>
        </>
      )}
      <p>{current.restTime ?? '—'}</p>
      {current.description && <p>{current.description}</p>}

      {restRemaining !== null ? (
        <div>
          <p>Descanso: {restRemaining}s</p>
          <button type="button" onClick={handleSkipRest}>
            Saltar descanso
          </button>
        </div>
      ) : (
        <button type="button" disabled={isCurrentDone} onClick={handleMarkComplete}>
          Marcar completado
        </button>
      )}

      <button type="button" disabled={index === 0} onClick={() => goTo(index - 1)}>
        Anterior
      </button>
      {isLast && isCurrentDone ? (
        <button type="button" onClick={onExit}>
          Finalizar
        </button>
      ) : (
        <button type="button" disabled={isLast} onClick={() => goTo(index + 1)}>
          Siguiente
        </button>
      )}
    </div>
  );
}
