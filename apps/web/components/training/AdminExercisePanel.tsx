'use client';

import { useEffect, useState, useCallback } from 'react';
import { ExerciseForm } from './ExerciseForm';
import {
  type Exercise,
  type ExerciseInput,
  getClientTrainingDays,
  listExercises,
  createExercise,
  updateExercise,
  deleteExercise,
  reorderExercise,
  updateTrainingDays,
} from '../../lib/training-client';
import { type MindsetQuote, listQuotes, getClientAssignedQuoteId, assignQuote } from '../../lib/quotes-client';

export type AdminExercisePanelProps = {
  clientId: string;
};

export function AdminExercisePanel({ clientId }: AdminExercisePanelProps) {
  const [trainingDays, setTrainingDays] = useState(0);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<MindsetQuote[]>([]);
  const [assignedQuoteId, setAssignedQuoteId] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    const [days, list, quoteList, assignedId] = await Promise.all([
      getClientTrainingDays(clientId),
      listExercises(clientId),
      listQuotes(),
      getClientAssignedQuoteId(clientId),
    ]);
    setTrainingDays(days);
    setExercises(list);
    setQuotes(quoteList);
    setAssignedQuoteId(assignedId);
  }, [clientId]);

  useEffect(() => {
    refetch().catch((e: Error) => setError(e.message));
  }, [refetch]);

  async function handleTrainingDaysChange(value: number) {
    try {
      await updateTrainingDays(clientId, value);
      setTrainingDays(value);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleAssignedQuoteChange(quoteId: string) {
    const value = quoteId || null;
    try {
      await assignQuote(clientId, value);
      setAssignedQuoteId(value);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleCreate(input: ExerciseInput) {
    try {
      await createExercise(clientId, input);
      await refetch();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleUpdate(exerciseId: string, input: ExerciseInput) {
    try {
      await updateExercise(clientId, exerciseId, input);
      setEditingId(null);
      await refetch();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleDelete(exerciseId: string) {
    try {
      await deleteExercise(clientId, exerciseId);
      await refetch();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleReorder(exerciseId: string, direction: 'up' | 'down') {
    try {
      await reorderExercise(clientId, exerciseId, direction);
      await refetch();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function toExerciseInput(ex: Exercise): ExerciseInput {
    return {
      title: ex.title,
      day_number: ex.dayNumber,
      category: ex.category,
      series: ex.series,
      reps: ex.reps,
      duration: ex.duration,
      rest_time: ex.restTime,
      youtube_url: ex.youtubeUrl,
      description: ex.description,
      recommendations: ex.recommendations,
    };
  }

  // Union of 1..trainingDays with any day numbers that actually have exercises
  // assigned — so lowering trainingDays or creating an exercise for a day
  // outside the current range never hides it from the admin (it would
  // otherwise be uneditable/undeletable, but still returned to the client).
  const configuredDays = Array.from({ length: trainingDays || 0 }, (_, i) => i + 1);
  const days = Array.from(new Set([...configuredDays, ...exercises.map((e) => e.dayNumber)])).sort((a, b) => a - b);

  return (
    <section>
      <h2>Configuración de entrenamiento</h2>
      {error && <p role="alert">{error}</p>}

      <label htmlFor="training-days">Días de entrenamiento</label>
      <select id="training-days" value={trainingDays} onChange={(e) => handleTrainingDaysChange(Number(e.target.value))}>
        <option value={0}>Sin definir</option>
        {[1, 2, 3, 4, 5, 6, 7].map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>

      <label htmlFor="assigned-quote">Frase asignada a este cliente</label>
      <select
        id="assigned-quote"
        value={assignedQuoteId ?? ''}
        onChange={(e) => handleAssignedQuoteChange(e.target.value)}
      >
        <option value="">Aleatoria del pool general</option>
        {quotes.map((q) => (
          <option key={q.id} value={q.id}>
            {q.quote.length > 60 ? `${q.quote.slice(0, 60)}…` : q.quote}
          </option>
        ))}
      </select>

      <h3>Agregar ejercicio</h3>
      <ExerciseForm onSubmit={handleCreate} submitLabel="Crear ejercicio" />

      <h3>Ejercicios asignados</h3>
      {days.map((day) => {
        const dayExercises = exercises.filter((ex) => ex.dayNumber === day);
        return (
          <div key={day}>
            <h4>Día {day}</h4>
            <ul>
              {dayExercises.map((ex) => {
                const siblings = exercises.filter((e) => e.dayNumber === ex.dayNumber && e.category === ex.category);
                const isFirst = siblings[0]?.id === ex.id;
                const isLast = siblings[siblings.length - 1]?.id === ex.id;
                return (
                  <li key={ex.id}>
                    {editingId === ex.id ? (
                      <ExerciseForm
                        initial={toExerciseInput(ex)}
                        onSubmit={(input) => handleUpdate(ex.id, input)}
                        submitLabel="Guardar"
                        idPrefix={`edit-${ex.id}-`}
                      />
                    ) : (
                      <>
                        <span>{ex.title}</span>
                        <button type="button" onClick={() => setEditingId(ex.id)}>
                          Editar
                        </button>
                        <button type="button" onClick={() => handleDelete(ex.id)}>
                          Eliminar
                        </button>
                        <button type="button" disabled={isFirst} onClick={() => handleReorder(ex.id, 'up')}>
                          Subir
                        </button>
                        <button type="button" disabled={isLast} onClick={() => handleReorder(ex.id, 'down')}>
                          Bajar
                        </button>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
