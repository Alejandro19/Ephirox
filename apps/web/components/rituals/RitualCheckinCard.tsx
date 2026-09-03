'use client';

import type { ReactNode } from 'react';
import Badge from '@/components/ui/Badge';

// Componente base compartido de "Rituales" — generaliza el patrón de
// CheckpointCard (ClientLabCheckpoints.tsx): título + badge + formulario o
// resumen de solo lectura, agregándole reapertura para editar (Editar/
// Cancelar), que ese componente no tiene. Parametrizado por cadencia
// (diaria/semanal) en vez de duplicar esta lógica en cada Ritual.
export type RitualCadence = 'daily' | 'weekly';

type RitualCheckinCardProps = {
  cadence: RitualCadence;
  title: string;
  completed: boolean;
  streakLabel?: string | null;
  summary?: ReactNode;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  saving?: boolean;
  children: ReactNode;
};

export function RitualCheckinCard({
  cadence,
  title,
  completed,
  streakLabel,
  summary,
  isEditing,
  onStartEdit,
  onCancelEdit,
  saving,
  children,
}: RitualCheckinCardProps) {
  const showForm = !completed || isEditing;

  return (
    <div
      data-cadence={cadence}
      className="mb-5 flex flex-col gap-4 rounded-none border p-5"
      style={{ borderColor: 'var(--eph-line)', background: 'var(--eph-surface)' }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-display text-[15px]" style={{ color: 'var(--eph-text)' }}>{title}</span>
          {completed && <Badge label="Completado" variant="success" />}
        </div>
        {streakLabel && (
          <span className="font-mono text-[10px] uppercase tracking-[0.1em]" style={{ color: 'var(--eph-muted)' }}>
            {streakLabel}
          </span>
        )}
      </div>

      {completed && !isEditing && (
        <div className="flex flex-col gap-3">
          {summary}
          <button
            type="button"
            onClick={onStartEdit}
            className="self-start font-mono text-[10px] uppercase tracking-[0.1em] underline-offset-2 hover:underline"
            style={{ color: 'var(--eph-accent)' }}
          >
            Editar
          </button>
        </div>
      )}

      {showForm && (
        <div className="flex flex-col gap-4">
          {children}
          {completed && isEditing && (
            <button
              type="button"
              onClick={onCancelEdit}
              disabled={saving}
              className="self-start font-mono text-[10px] uppercase tracking-[0.1em] underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              style={{ color: 'var(--eph-muted)' }}
            >
              Cancelar
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default RitualCheckinCard;
