import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithSWR as render } from './swr-test-utils';
import { ClientStressPanel } from '../components/stress/ClientStressPanel';
import * as stressClient from '../lib/stress-client';
import { PermissionDeniedError } from '../lib/api-client';

vi.mock('../lib/stress-client');

const DEFAULT_COGNITIVE_LOAD: stressClient.CognitiveLoadOverview = {
  today: null,
  trend: [],
  threshold: null,
  consecutiveDaysOverThreshold: 0,
  alert: false,
  alertStreakThreshold: 3,
  latest: { hrv: null, activacionMatutina: null, recuperacionPct: null },
};

function mockFetches({
  techniques = [],
  completions = [],
  tip = null,
  morningCheckin = { id: 'mc1', fecha: '2026-08-02', energia: 3, tension: 3, claridad: 3, activacionMatutina: 6 },
  cognitiveLoad = DEFAULT_COGNITIVE_LOAD,
}: {
  techniques?: stressClient.StressTechnique[];
  completions?: stressClient.StressCompletion[];
  tip?: stressClient.StressTip;
  morningCheckin?: stressClient.MorningCheckin;
  cognitiveLoad?: stressClient.CognitiveLoadOverview;
} = {}) {
  vi.mocked(stressClient.listTechniques).mockResolvedValue(techniques);
  vi.mocked(stressClient.listCompletions).mockResolvedValue(completions);
  vi.mocked(stressClient.getTipOfTheDay).mockResolvedValue(tip);
  vi.mocked(stressClient.getTodayMorningCheckin).mockResolvedValue(morningCheckin);
  vi.mocked(stressClient.getCognitiveLoadOverview).mockResolvedValue(cognitiveLoad);
}

describe('ClientStressPanel', () => {
  it('shows the assigned techniques and the tip of the day', async () => {
    mockFetches({
      techniques: [
        { id: 't1', title: 'Respiración 4-7-8', type: 'Respiración', duration: '5 min', durationMinutes: 5, durationSeconds: null, description: null, videoUrl: null, videoName: null, youtubeUrl: null, audioUrl: null, audioName: null, emotion: null, precautionNote: null, isRitual: false },
      ],
      tip: { id: 'tip1', content: 'Duerme 8 horas.' },
    });

    render(<ClientStressPanel clientId="client-1" />);
    // Con una sola técnica asignada, el título aparece dos veces a propósito:
    // en la card "Recomendada para ti ahora" (siempre la primera técnica,
    // ver ClientStressPanel.tsx) y en la lista "Tus técnicas" de abajo.
    await waitFor(() => expect(screen.getAllByText('Respiración 4-7-8').length).toBeGreaterThan(0));
    expect(screen.getByText(/Duerme 8 horas\./)).toBeInTheDocument();
  });

  it('shows a message when no techniques are assigned yet', async () => {
    mockFetches();
    render(<ClientStressPanel clientId="client-1" />);
    await waitFor(() => expect(screen.getByText('Aún no tienes técnicas asignadas.')).toBeInTheDocument());
  });

  it('opens the technique player and marks it as completed today', async () => {
    const user = userEvent.setup();
    mockFetches({
      techniques: [
        { id: 't1', title: 'Meditación guiada', type: 'Meditación', duration: null, durationMinutes: null, durationSeconds: null, description: null, videoUrl: null, videoName: null, youtubeUrl: 'https://youtube.com/watch?v=abcdef', audioUrl: null, audioName: null, emotion: null, precautionNote: null, isRitual: false },
      ],
    });

    render(<ClientStressPanel clientId="client-1" />);
    await waitFor(() => expect(screen.getAllByText('Meditación guiada').length).toBeGreaterThan(0));

    await user.click(screen.getByRole('button', { name: 'Reproducir' }));
    await user.click(screen.getByRole('button', { name: 'Marcar completado' }));
    await waitFor(() => expect(stressClient.markCompletion).toHaveBeenCalledWith('client-1'));
  });

  it('recommends and plays the first assigned technique (no live emotion signal anymore)', async () => {
    const user = userEvent.setup();
    mockFetches({
      techniques: [
        { id: 't1', title: 'Respiración de caja', type: 'Respiración', duration: null, durationMinutes: null, durationSeconds: null, description: 'Ordena tus pensamientos.', videoUrl: null, videoName: null, youtubeUrl: 'https://youtube.com/watch?v=boxbreath', audioUrl: null, audioName: null, emotion: null, precautionNote: null, isRitual: false },
        { id: 't2', title: 'Meditación guiada', type: 'Meditación', duration: null, durationMinutes: null, durationSeconds: null, description: null, videoUrl: null, videoName: null, youtubeUrl: null, audioUrl: null, audioName: null, emotion: null, precautionNote: null, isRitual: false },
      ],
    });

    render(<ClientStressPanel clientId="client-1" />);
    await waitFor(() => screen.getByText('Recomendada para ti ahora'));
    expect(screen.getByRole('heading', { level: 3, name: 'Respiración de caja' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Empezar técnica' }));
    expect(await screen.findByRole('heading', { name: 'Respiración de caja' })).toBeInTheDocument();
  });

  it('shows the generic upgrade card when this client type has no access to Stress', async () => {
    vi.mocked(stressClient.listTechniques).mockRejectedValue(new PermissionDeniedError('Este módulo no está disponible para tu tipo de cuenta.'));
    vi.mocked(stressClient.listCompletions).mockResolvedValue([]);
    vi.mocked(stressClient.getTipOfTheDay).mockResolvedValue(null);

    render(<ClientStressPanel clientId="client-1" />);
    expect(await screen.findByText('Disponible en Premium')).toBeInTheDocument();
  });
});
