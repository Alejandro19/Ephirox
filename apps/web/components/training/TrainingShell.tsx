'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Exercise, ExerciseCategory, TrainingCompletion, TrainingStreak } from '../../lib/training-client';
import {
  getClientTrainingDays,
  listExercises,
  listTrainingCompletions,
  confirmSession,
  getStreak,
  useProtector,
} from '../../lib/training-client';
import { isDayCompletedThisWeek } from '../../lib/training-home-logic';
import { TrainingHome } from './TrainingHome';
import { TrainingDayView } from './TrainingDayView';
import { TrainingPlayer } from './TrainingPlayer';
import { SessionConfirmedScreen } from './SessionConfirmedScreen';

export type TrainingShellProps = {
  clientId: string;
};

function clientTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function TrainingShell({ clientId }: TrainingShellProps) {
  const [trainingDays, setTrainingDays] = useState(0);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [completions, setCompletions] = useState<TrainingCompletion[]>([]);
  const [streak, setStreak] = useState<TrainingStreak | null>(null);
  const [day, setDay] = useState<number | null>(null);
  const [category, setCategory] = useState<ExerciseCategory | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [completingDay, setCompletingDay] = useState(false);
  const [protectorPending, setProtectorPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completionNotice, setCompletionNotice] = useState<string | null>(null);
  const [confirmedResult, setConfirmedResult] = useState<{ streak: TrainingStreak; phrase: string | null } | null>(null);

  const load = useCallback(async () => {
    const tz = clientTz();
    const [days, exerciseList, completionList, streakState] = await Promise.all([
      getClientTrainingDays(clientId),
      listExercises(clientId),
      listTrainingCompletions(clientId),
      getStreak(clientId, tz),
    ]);
    setTrainingDays(days);
    setExercises(exerciseList);
    setCompletions(completionList);
    setStreak(streakState);
  }, [clientId]);

  useEffect(() => {
    load().catch((e: Error) => setError(e.message));
  }, [load]);

  function openDay(d: number) {
    setDay(d);
    setCategory(null);
    setCompletedIds(new Set());
    setCompletionNotice(null);
  }

  function backToHome() {
    setDay(null);
    setCategory(null);
    setCompletedIds(new Set());
  }

  function backToDay() {
    setCategory(null);
  }

  async function handleCompleteDay() {
    setCompletingDay(true);
    try {
      const result = await confirmSession(clientId, clientTz());
      await load();
      if (result.alreadyConfirmedToday) {
        backToHome();
        setCompletionNotice('Ya confirmaste tu sesión de hoy — vuelve mañana para el siguiente día.');
      } else {
        setConfirmedResult({ streak: result.streak, phrase: result.phrase });
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCompletingDay(false);
    }
  }

  function closeConfirmedScreen() {
    setConfirmedResult(null);
    backToHome();
  }

  async function handleUseProtector() {
    setProtectorPending(true);
    try {
      const streakState = await useProtector(clientId, clientTz());
      setStreak(streakState);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProtectorPending(false);
    }
  }

  function handleMarkComplete(exerciseId: string) {
    setCompletedIds((prev) => new Set(prev).add(exerciseId));
  }

  if (error) return <p role="alert">{error}</p>;

  if (confirmedResult) {
    return <SessionConfirmedScreen streak={confirmedResult.streak} phrase={confirmedResult.phrase} onClose={closeConfirmedScreen} />;
  }

  if (day && category) {
    const categoryExercises = exercises
      .filter((ex) => ex.dayNumber === day && ex.category === category)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    return (
      <TrainingPlayer exercises={categoryExercises} completedIds={completedIds} onMarkComplete={handleMarkComplete} onExit={backToDay} />
    );
  }

  if (day) {
    const dayExercises = exercises.filter((ex) => ex.dayNumber === day);
    const alreadyCompletedThisWeek = isDayCompletedThisWeek(day, completions);
    return (
      <TrainingDayView
        day={day}
        exercises={dayExercises}
        completedIds={completedIds}
        alreadyCompletedThisWeek={alreadyCompletedThisWeek}
        onOpenCategory={setCategory}
        onCompleteDay={handleCompleteDay}
        completingDay={completingDay}
      />
    );
  }

  return (
    <>
      {completionNotice && (
        <p>
          {completionNotice}
          <button type="button" onClick={() => setCompletionNotice(null)}>
            Cerrar
          </button>
        </p>
      )}
      <TrainingHome
        trainingDays={trainingDays}
        exercises={exercises}
        completions={completions}
        streak={streak}
        onOpenDay={openDay}
        onUseProtector={handleUseProtector}
        protectorPending={protectorPending}
      />
    </>
  );
}
