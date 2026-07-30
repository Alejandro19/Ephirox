import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrainingHome } from '../components/training/TrainingHome';
import type { Exercise, TrainingCompletion } from '../lib/training-client';

function exercise(id: string, dayNumber: number): Exercise {
  return {
    id,
    clientId: 'c1',
    title: `Ejercicio ${id}`,
    dayNumber,
    category: 'strength',
    series: 3,
    reps: '10',
    duration: null,
    restTime: '01:00',
    youtubeUrl: null,
    description: null,
    recommendations: null,
    sortOrder: 0,
  };
}

describe('TrainingHome', () => {
  it('renders one tile per training day and calls onOpenDay for an unlocked day', () => {
    const onOpenDay = vi.fn();
    render(
      <TrainingHome
        trainingDays={2}
        exercises={[exercise('e1', 1), exercise('e2', 2)]}
        completions={[]}
        onOpenDay={onOpenDay}
      />
    );
    expect(screen.getByRole('button', { name: /Día 1/ })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: /Día 1/ }));
    expect(onOpenDay).toHaveBeenCalledWith(1);
  });

  it('disables a locked day', () => {
    render(<TrainingHome trainingDays={2} exercises={[exercise('e1', 1), exercise('e2', 2)]} completions={[]} onOpenDay={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Día 2/ })).toBeDisabled();
  });

  it('shows the discipline calendar section', () => {
    render(<TrainingHome trainingDays={1} exercises={[]} completions={[]} onOpenDay={vi.fn()} />);
    expect(screen.getByText('Nivel de disciplina')).toBeInTheDocument();
  });
});
