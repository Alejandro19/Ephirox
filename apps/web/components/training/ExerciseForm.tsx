'use client';

import { useState } from 'react';
import type { ExerciseInput, ExerciseCategory } from '../../lib/training-client';

export type ExerciseFormProps = {
  initial?: Partial<ExerciseInput>;
  onSubmit: (input: ExerciseInput) => Promise<void>;
  submitLabel: string;
};

export function ExerciseForm({ initial, onSubmit, submitLabel }: ExerciseFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [dayNumber, setDayNumber] = useState(initial?.day_number ?? 1);
  const [category, setCategory] = useState<ExerciseCategory>(initial?.category ?? 'strength');
  const [series, setSeries] = useState(initial?.series != null ? String(initial.series) : '');
  const [reps, setReps] = useState(initial?.reps ?? '');
  const [duration, setDuration] = useState(initial?.duration ?? '');
  const [restTime, setRestTime] = useState(initial?.rest_time ?? '');
  const [youtubeUrl, setYoutubeUrl] = useState(initial?.youtube_url ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [submitting, setSubmitting] = useState(false);

  const isCardio = category === 'cardio';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        title,
        day_number: dayNumber,
        category,
        series: isCardio ? null : series ? Number(series) : null,
        reps: isCardio ? null : reps || null,
        duration: isCardio ? duration || null : null,
        rest_time: restTime || null,
        youtube_url: youtubeUrl || null,
        description: description || null,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="ex-title">Título</label>
      <input id="ex-title" value={title} onChange={(e) => setTitle(e.target.value)} required />

      <label htmlFor="ex-day">Día</label>
      <select id="ex-day" value={dayNumber} onChange={(e) => setDayNumber(Number(e.target.value))}>
        {[1, 2, 3, 4, 5, 6, 7].map((d) => (
          <option key={d} value={d}>
            Día {d}
          </option>
        ))}
      </select>

      <label htmlFor="ex-category">Categoría</label>
      <select id="ex-category" value={category} onChange={(e) => setCategory(e.target.value as ExerciseCategory)}>
        <option value="warmup">Calentamiento</option>
        <option value="strength">Fuerza</option>
        <option value="cardio">Cardio</option>
      </select>

      {isCardio ? (
        <>
          <label htmlFor="ex-duration">Duración</label>
          <input id="ex-duration" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="mm:ss" />
        </>
      ) : (
        <>
          <label htmlFor="ex-series">Series</label>
          <input id="ex-series" type="number" value={series} onChange={(e) => setSeries(e.target.value)} />

          <label htmlFor="ex-reps">Repeticiones</label>
          <input id="ex-reps" value={reps} onChange={(e) => setReps(e.target.value)} />
        </>
      )}

      <label htmlFor="ex-rest">Descanso</label>
      <input id="ex-rest" value={restTime} onChange={(e) => setRestTime(e.target.value)} placeholder="mm:ss" />

      <label htmlFor="ex-youtube">Video de YouTube (URL)</label>
      <input id="ex-youtube" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} />

      <label htmlFor="ex-description">Descripción</label>
      <textarea id="ex-description" value={description} onChange={(e) => setDescription(e.target.value)} />

      <button type="submit" disabled={submitting}>
        {submitLabel}
      </button>
    </form>
  );
}
