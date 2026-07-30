'use client';

import { useEffect, useState } from 'react';
import type { Exercise } from '../../lib/training-client';
import { parseTimeToSeconds, youtubeEmbedUrl } from '../../lib/training-timer-logic';

export type TrainingPlayerProps = {
  exercises: Exercise[];
  completedIds: Set<string>;
  onMarkComplete: (exerciseId: string) => void;
  onExit: () => void;
};

export function TrainingPlayer({ exercises, completedIds, onMarkComplete, onExit }: TrainingPlayerProps) {
  const [index, setIndex] = useState(0);
  const [restRemaining, setRestRemaining] = useState<number | null>(null);
  const [durationRemaining, setDurationRemaining] = useState<number | null>(null);

  const current = exercises[index];
  const isLast = index === exercises.length - 1;
  const isCurrentDone = current ? completedIds.has(current.id) : false;
  const isCardio = current?.category === 'cardio';

  function startRest() {
    if (!current) return;
    setRestRemaining(parseTimeToSeconds(current.restTime));
  }

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

  // Cardio's duration countdown chains into the same rest-timer flow once it
  // reaches 0: mark the exercise complete, then start the normal rest period.
  useEffect(() => {
    if (durationRemaining === null || durationRemaining > 0) return;
    setDurationRemaining(null);
    if (current) onMarkComplete(current.id);
    startRest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationRemaining]);

  const isCountingDuration = durationRemaining !== null;
  useEffect(() => {
    if (!isCountingDuration) return;
    const interval = setInterval(() => {
      setDurationRemaining((s) => (s === null ? null : s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isCountingDuration]);

  function goTo(newIndex: number) {
    setRestRemaining(null);
    setDurationRemaining(null);
    setIndex(Math.max(0, Math.min(exercises.length - 1, newIndex)));
  }

  function handleMarkComplete() {
    if (!current) return;
    onMarkComplete(current.id);
    startRest();
  }

  function handleStartDuration() {
    if (!current) return;
    setDurationRemaining(parseTimeToSeconds(current.duration));
  }

  function handleSkipRest() {
    setRestRemaining(null);
    if (!isLast) setIndex((i) => i + 1);
  }

  if (!current) return null;

  const embedUrl = current.youtubeUrl ? youtubeEmbedUrl(current.youtubeUrl) : null;

  return (
    <div>
      <button type="button" onClick={onExit}>
        Volver al día
      </button>

      <h1>{current.title}</h1>

      {embedUrl ? (
        <iframe src={embedUrl} title={current.title} allow="autoplay; encrypted-media" allowFullScreen />
      ) : (
        <p>Sin video asignado.</p>
      )}

      {!isCardio && (
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
      ) : isCardio ? (
        durationRemaining !== null ? (
          <p>Duración: {durationRemaining}s</p>
        ) : (
          <button type="button" disabled={isCurrentDone} onClick={handleStartDuration}>
            Iniciar
          </button>
        )
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
