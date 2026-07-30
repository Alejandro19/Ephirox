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

  it('renders one calendar cell per day of the current month, marking completed dates', () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const completedIso = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const completion: TrainingCompletion = { id: 'c1', clientId: 'c1', dayNumber: 1, completedDate: completedIso, source: 'manual' };

    render(<TrainingHome trainingDays={1} exercises={[]} completions={[completion]} onOpenDay={vi.fn()} />);

    // One cell per day of the month (day "1" appears as a marked <strong>).
    expect(screen.getAllByText(String(daysInMonth)).length).toBeGreaterThan(0);
    const markedDay1 = screen.getByText('1', { selector: 'strong' });
    expect(markedDay1).toBeInTheDocument();
  });

  it('shows a Comenzar sesión hero button that opens the next actionable day', () => {
    const onOpenDay = vi.fn();
    render(
      <TrainingHome
        trainingDays={2}
        exercises={[exercise('e1', 1), exercise('e2', 2)]}
        completions={[]}
        onOpenDay={onOpenDay}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Comenzar sesión' }));
    expect(onOpenDay).toHaveBeenCalledWith(1);
  });

  it('does not render the hero button when there is no next actionable day', () => {
    render(<TrainingHome trainingDays={0} exercises={[]} completions={[]} onOpenDay={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Comenzar sesión' })).not.toBeInTheDocument();
  });
});
