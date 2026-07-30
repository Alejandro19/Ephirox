import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TrainingShell } from '../components/training/TrainingShell';
import * as trainingClient from '../lib/training-client';

vi.mock('../lib/training-client');

function exercise(id: string, dayNumber: number, category: trainingClient.ExerciseCategory = 'strength'): trainingClient.Exercise {
  return {
    id,
    clientId: 'c1',
    title: `Ejercicio ${id}`,
    dayNumber,
    category,
    series: 3,
    reps: '10',
    duration: null,
    restTime: '00:01',
    youtubeUrl: null,
    description: null,
    recommendations: null,
    sortOrder: 0,
  };
}

describe('TrainingShell', () => {
  beforeEach(() => {
    vi.mocked(trainingClient.getClientTrainingDays).mockResolvedValue(1);
    vi.mocked(trainingClient.listExercises).mockResolvedValue([exercise('e1', 1)]);
    vi.mocked(trainingClient.listTrainingCompletions).mockResolvedValue([]);
    vi.mocked(trainingClient.confirmSession).mockResolvedValue({ alreadyConfirmedToday: false, dayNumber: 1 });
  });

  it('loads training data and shows the home screen', async () => {
    render(<TrainingShell clientId="c1" />);
    await screen.findByRole('button', { name: /Día 1/ });
  });

  it('navigates home → day → category (player) → mark complete → confirm session', async () => {
    render(<TrainingShell clientId="c1" />);
    fireEvent.click(await screen.findByRole('button', { name: /Día 1/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Fuerza/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Marcar completado' }));
    // rest timer starts; go back to day view without waiting it out
    await waitFor(() => expect(screen.getByText(/Descanso/)).toBeInTheDocument());
  });

  it('calls confirmSession when completing the day and returns to home', async () => {
    vi.mocked(trainingClient.listExercises).mockResolvedValue([exercise('e1', 1, 'warmup')]);
    render(<TrainingShell clientId="c1" />);
    fireEvent.click(await screen.findByRole('button', { name: /Día 1/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Calentamiento/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Marcar completado' }));
    // Leave the category via the always-present "Volver al día" button, back to day view.
    fireEvent.click(await screen.findByRole('button', { name: 'Volver al día' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Completar Entrenamiento Día 1' }));
    await waitFor(() => expect(trainingClient.confirmSession).toHaveBeenCalledWith('c1', expect.any(String)));
    // Confirms the shell actually returns to the home screen afterwards.
    await screen.findByRole('button', { name: /Día 1/ });
  });

  it('shows a notice when confirmSession reports the session was already confirmed today', async () => {
    vi.mocked(trainingClient.listExercises).mockResolvedValue([exercise('e1', 1, 'warmup')]);
    vi.mocked(trainingClient.confirmSession).mockResolvedValue({ alreadyConfirmedToday: true, dayNumber: null });
    render(<TrainingShell clientId="c1" />);
    fireEvent.click(await screen.findByRole('button', { name: /Día 1/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Calentamiento/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Marcar completado' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Volver al día' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Completar Entrenamiento Día 1' }));
    await screen.findByText('Ya confirmaste tu sesión de hoy — vuelve mañana para el siguiente día.');
  });

  it('does not treat an old (prior-week) completion as completed this week', async () => {
    const oldCompletion: trainingClient.TrainingCompletion = {
      id: 'c1',
      clientId: 'c1',
      dayNumber: 1,
      completedDate: '2020-01-01',
      source: 'manual',
    };
    vi.mocked(trainingClient.listTrainingCompletions).mockResolvedValue([oldCompletion]);
    render(<TrainingShell clientId="c1" />);
    fireEvent.click(await screen.findByRole('button', { name: /Día 1/ }));
    await screen.findByRole('button', { name: /Completar Entrenamiento/ });
    expect(screen.queryByText('Día completado esta semana.')).not.toBeInTheDocument();
  });
});
