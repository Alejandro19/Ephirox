import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionConfirmedScreen } from '../components/training/SessionConfirmedScreen';

const baseStreak = {
  streakWeeks: 3,
  sessionsDoneThisWeek: 2,
  sessionsRequiredThisWeek: 2,
  protectorAvailable: true,
  protectorUsedThisWeek: false,
  atRisk: false,
};

describe('SessionConfirmedScreen', () => {
  it('shows the title, week fraction, and streak count', () => {
    render(<SessionConfirmedScreen streak={baseStreak} phrase={null} onClose={vi.fn()} />);
    expect(screen.getByText('¡Sesión confirmada!')).toBeInTheDocument();
    expect(screen.getByText('2/2 esta semana')).toBeInTheDocument();
    expect(screen.getByText(/3 semanas seguidas/)).toBeInTheDocument();
  });

  it('shows the phrase when provided, and nothing when null', () => {
    const { rerender } = render(<SessionConfirmedScreen streak={baseStreak} phrase="Sigue así." onClose={vi.fn()} />);
    expect(screen.getByText('"Sigue así."')).toBeInTheDocument();

    rerender(<SessionConfirmedScreen streak={baseStreak} phrase={null} onClose={vi.fn()} />);
    expect(screen.queryByText(/"/)).not.toBeInTheDocument();
  });

  it('calls onClose when Cerrar is clicked', () => {
    const onClose = vi.fn();
    render(<SessionConfirmedScreen streak={baseStreak} phrase={null} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('always renders the share button disabled', () => {
    render(<SessionConfirmedScreen streak={baseStreak} phrase={null} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: /compartir/i })).toBeDisabled();
  });
});
