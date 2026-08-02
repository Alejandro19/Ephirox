import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClientCortisolPanel } from '../components/cortisol/ClientCortisolPanel';
import * as cortisolClient from '../lib/cortisol-client';

vi.mock('../lib/cortisol-client');

describe('ClientCortisolPanel', () => {
  it('shows the assigned techniques and the tip of the day', async () => {
    vi.mocked(cortisolClient.listTechniques).mockResolvedValue([
      { id: 't1', title: 'Respiración 4-7-8', type: 'Respiración', duration: null, durationMinutes: 5, description: null, videoUrl: null, videoName: null, youtubeUrl: null, audioUrl: null, audioName: null },
    ]);
    vi.mocked(cortisolClient.getTipOfTheDay).mockResolvedValue({ id: 'tip1', content: 'Duerme 8 horas.' });
    vi.mocked(cortisolClient.getTodayCheckin).mockResolvedValue(null);

    render(<ClientCortisolPanel clientId="client-1" />);
    await waitFor(() => expect(screen.getByText('Respiración 4-7-8')).toBeInTheDocument());
    expect(screen.getByText('Duerme 8 horas.')).toBeInTheDocument();
  });

  it('shows a message when no techniques are assigned yet', async () => {
    vi.mocked(cortisolClient.listTechniques).mockResolvedValue([]);
    vi.mocked(cortisolClient.getTipOfTheDay).mockResolvedValue(null);
    vi.mocked(cortisolClient.getTodayCheckin).mockResolvedValue(null);

    render(<ClientCortisolPanel clientId="client-1" />);
    await waitFor(() => expect(screen.getByText('Todavía no tienes técnicas asignadas.')).toBeInTheDocument());
  });

  it('marks a technique as completed today', async () => {
    const user = userEvent.setup();
    vi.mocked(cortisolClient.listTechniques).mockResolvedValue([
      { id: 't1', title: 'Meditación', type: null, duration: null, durationMinutes: null, description: null, videoUrl: null, videoName: null, youtubeUrl: null, audioUrl: null, audioName: null },
    ]);
    vi.mocked(cortisolClient.getTipOfTheDay).mockResolvedValue(null);
    vi.mocked(cortisolClient.getTodayCheckin).mockResolvedValue(null);

    render(<ClientCortisolPanel clientId="client-1" />);
    await waitFor(() => screen.getByText('Meditación'));

    await user.click(screen.getByRole('button', { name: 'Marcar como completado hoy' }));
    await waitFor(() => expect(cortisolClient.markCompletion).toHaveBeenCalledWith('client-1'));
  });

  it('submits a daily emotional check-in', async () => {
    const user = userEvent.setup();
    vi.mocked(cortisolClient.listTechniques).mockResolvedValue([]);
    vi.mocked(cortisolClient.getTipOfTheDay).mockResolvedValue(null);
    vi.mocked(cortisolClient.getTodayCheckin).mockResolvedValue(null);
    vi.mocked(cortisolClient.postCheckin).mockResolvedValue({ id: 'c1', emotion: 'tranquilo', checkinDate: '2026-08-02' });

    render(<ClientCortisolPanel clientId="client-1" />);
    await waitFor(() => screen.getByLabelText('¿Cómo te sientes ahora mismo?'));

    await user.selectOptions(screen.getByLabelText('¿Cómo te sientes ahora mismo?'), 'tranquilo');
    await user.click(screen.getByRole('button', { name: 'Guardar check-in' }));

    await waitFor(() => expect(cortisolClient.postCheckin).toHaveBeenCalledWith('client-1', 'tranquilo'));
  });
});
