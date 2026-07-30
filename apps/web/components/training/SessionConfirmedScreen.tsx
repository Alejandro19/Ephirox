'use client';

import type { TrainingStreak } from '../../lib/training-client';

export type SessionConfirmedScreenProps = {
  streak: TrainingStreak;
  phrase: string | null;
  onClose: () => void;
};

export function SessionConfirmedScreen({ streak, phrase, onClose }: SessionConfirmedScreenProps) {
  const dots = Array.from({ length: streak.sessionsRequiredThisWeek }, (_, i) => i + 1);

  return (
    <div>
      <h1>¡Sesión confirmada!</h1>
      <p>
        {streak.sessionsDoneThisWeek}/{streak.sessionsRequiredThisWeek} esta semana
      </p>
      <div>
        {dots.map((n) => (
          <span key={n}>{n <= streak.sessionsDoneThisWeek ? '✓' : n}</span>
        ))}
      </div>
      <p>
        {streak.streakWeeks} {streak.streakWeeks === 1 ? 'semana seguida' : 'semanas seguidas'}
      </p>
      {phrase && <p>&quot;{phrase}&quot;</p>}
      <button type="button" onClick={onClose}>
        Cerrar
      </button>
      <button type="button" disabled>
        Compartir (Próximamente)
      </button>
    </div>
  );
}
