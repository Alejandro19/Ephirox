import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithSWR as render } from './swr-test-utils';
import { ClientStressPanel } from '../components/stress/ClientStressPanel';
import * as stressClient from '../lib/stress-client';
import * as labeledCasesClient from '../lib/labeled-cases-client';
import { PermissionDeniedError } from '../lib/api-client';

vi.mock('../lib/stress-client');
vi.mock('../lib/labeled-cases-client');

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
  activeCase = null,
}: {
  techniques?: stressClient.StressTechnique[];
  completions?: stressClient.StressCompletion[];
  tip?: stressClient.StressTip;
  morningCheckin?: stressClient.MorningCheckin;
  cognitiveLoad?: stressClient.CognitiveLoadOverview;
  activeCase?: labeledCasesClient.ActiveCaseView | null;
} = {}) {
  vi.mocked(stressClient.listTechniques).mockResolvedValue(techniques);
  vi.mocked(stressClient.listCompletions).mockResolvedValue(completions);
  vi.mocked(stressClient.getTipOfTheDay).mockResolvedValue(tip);
  vi.mocked(stressClient.getTodayMorningCheckin).mockResolvedValue(morningCheckin);
  vi.mocked(stressClient.getCognitiveLoadOverview).mockResolvedValue(cognitiveLoad);
  vi.mocked(labeledCasesClient.getActiveCase).mockResolvedValue(activeCase);
}

describe('ClientStressPanel', () => {
  it('shows the assigned protocols and the tip of the day', async () => {
    mockFetches({
      techniques: [
        { id: 't1', title: 'Respiración 4-7-8', type: 'Respiración', duration: '5 min', durationMinutes: 5, durationSeconds: null, description: null, videoUrl: null, videoName: null, youtubeUrl: null, audioUrl: null, audioName: null, emotion: null, precautionNote: null, isRitual: false },
      ],
      tip: { id: 'tip1', content: 'Duerme 8 horas.' },
    });

    render(<ClientStressPanel clientId="client-1" />);
    // Con un solo protocolo asignado, el título aparece dos veces a propósito:
    // en la card "Recomendado para ti ahora" (siempre el primero, ver
    // ClientStressPanel.tsx) y en la librería "Tus protocolos" de abajo.
    await waitFor(() => expect(screen.getAllByText('Respiración 4-7-8').length).toBeGreaterThan(0));
    expect(screen.getByText(/Duerme 8 horas\./)).toBeInTheDocument();
  });

  it('fills "Tus protocolos" with the 3 example protocols when none are assigned yet, and never shows it empty', async () => {
    mockFetches();
    render(<ClientStressPanel clientId="client-1" />);
    await waitFor(() => expect(screen.getByText('Tus protocolos')).toBeInTheDocument());
    expect(screen.getByText('Respiración 4-7-8')).toBeInTheDocument();
    expect(screen.getByText('Reset del Sistema Nervioso')).toBeInTheDocument();
    expect(screen.getByText('Escaneo corporal breve')).toBeInTheDocument();
    expect(screen.getAllByText('Ejemplo').length).toBe(3);
  });

  it('opens the protocol player and marks it as completed today', async () => {
    const user = userEvent.setup();
    mockFetches({
      techniques: [
        { id: 't1', title: 'Meditación guiada', type: 'Meditación', duration: null, durationMinutes: null, durationSeconds: null, description: null, videoUrl: null, videoName: null, youtubeUrl: 'https://youtube.com/watch?v=abcdef', audioUrl: null, audioName: null, emotion: null, precautionNote: null, isRitual: false },
      ],
    });

    render(<ClientStressPanel clientId="client-1" />);
    await waitFor(() => expect(screen.getAllByText('Meditación guiada').length).toBeGreaterThan(0));

    // Con un solo protocolo asignado ya está destacado en la card "Recomendado
    // para ti ahora" — se abre desde ahí ("Empezar protocolo"), la librería de
    // abajo tiene el mismo protocolo como card clickeable.
    await user.click(screen.getByRole('button', { name: 'Empezar protocolo' }));
    await user.click(screen.getByRole('button', { name: 'Marcar completado' }));
    await waitFor(() => expect(stressClient.markCompletion).toHaveBeenCalledWith('client-1'));
  });

  it('recommends and plays the first assigned protocol (no live emotion signal anymore)', async () => {
    const user = userEvent.setup();
    mockFetches({
      techniques: [
        { id: 't1', title: 'Respiración de caja', type: 'Respiración', duration: null, durationMinutes: null, durationSeconds: null, description: 'Ordena tus pensamientos.', videoUrl: null, videoName: null, youtubeUrl: 'https://youtube.com/watch?v=boxbreath', audioUrl: null, audioName: null, emotion: null, precautionNote: null, isRitual: false },
        { id: 't2', title: 'Meditación guiada', type: 'Meditación', duration: null, durationMinutes: null, durationSeconds: null, description: null, videoUrl: null, videoName: null, youtubeUrl: null, audioUrl: null, audioName: null, emotion: null, precautionNote: null, isRitual: false },
      ],
    });

    render(<ClientStressPanel clientId="client-1" />);
    await waitFor(() => screen.getByText('Recomendado para ti ahora'));
    expect(screen.getByRole('heading', { level: 3, name: 'Respiración de caja' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Empezar protocolo' }));
    expect(await screen.findByRole('heading', { name: 'Respiración de caja' })).toBeInTheDocument();
  });

  it('shows the real mentor and active protocol (Fase 3 — Caso Etiquetado) instead of the placeholder, for a mentoring client', async () => {
    mockFetches({
      activeCase: {
        labeledCase: {
          id: 'case-1', caseNumber: 1247, clientId: 'client-1', module: 'stress', protocolId: 'p1',
          mentorId: 'm1', assignedAt: new Date().toISOString(), cycleWeeks: 12, outcome: null,
        },
        mentor: { id: 'm1', name: 'Sofía Duarte', specialty: null },
        protocol: { id: 'p1', name: 'Recuperación Vagal — Nivel 1', mechanism: 'Respiración' },
        resources: [
          {
            id: 'r1', protocolId: 'p1', type: 'Técnica de respiración', title: 'Respiración 4-7-8',
            durationMinutes: 3, durationSeconds: null, instructions: null, audioUrl: null, audioName: null,
            videoUrl: null, videoName: null, youtubeUrl: null, sortOrder: 0,
          },
        ],
        checkpoints: [],
      },
    });

    render(<ClientStressPanel clientId="client-1" clientType="mentoring" />);
    expect(await screen.findByText('Tu protocolo activo')).toBeInTheDocument();
    expect(screen.getByText('Recuperación Vagal — Nivel 1')).toBeInTheDocument();
    expect(screen.getByText('Asignado por Sofía Duarte, tu mentor')).toBeInTheDocument();
    expect(screen.getByText('Semana 1 de 12')).toBeInTheDocument();
    expect(screen.queryByText('Tu mentor está diseñando tu plan personalizado.')).not.toBeInTheDocument();
  });

  it('shows "Capacidad de regulación" inverted from Carga Cognitiva (10 - carga, escalado a 0-100)', async () => {
    mockFetches({
      cognitiveLoad: {
        today: 3,
        trend: [
          { fecha: '2026-08-01', score: 4 },
          { fecha: '2026-08-02', score: 4 },
          { fecha: '2026-08-03', score: 4 },
          { fecha: '2026-08-04', score: 3 },
        ],
        threshold: null,
        consecutiveDaysOverThreshold: 0,
        alert: false,
        alertStreakThreshold: 3,
        latest: { hrv: null, activacionMatutina: null, recuperacionPct: null },
      },
    });

    render(<ClientStressPanel clientId="client-1" />);
    await waitFor(() => expect(screen.getByText('Capacidad de regulación')).toBeInTheDocument());
    // Carga hoy = 3 -> capacidad = (10 - 3) * 10 = 70 -> "Moderada" (50-79).
    expect(screen.getByText('70')).toBeInTheDocument();
    expect(screen.getByText('Moderada')).toBeInTheDocument();
    // Línea base = promedio de los 3 días previos (4,4,4 -> capacidad 60) -> delta = 70 - 60 = +10.
    expect(screen.getByText(/10 pts vs\. tu línea base/)).toBeInTheDocument();
  });

  it('shows the "not enough data yet" message for Capacidad de regulación when there is no score for today', async () => {
    mockFetches();
    render(<ClientStressPanel clientId="client-1" />);
    await waitFor(() => expect(screen.getByText('Capacidad de regulación')).toBeInTheDocument());
    expect(screen.getByText(/wearable o check-in matutino/)).toBeInTheDocument();
  });

  it('shows the generic upgrade card when this client type has no access to Stress', async () => {
    vi.mocked(stressClient.listTechniques).mockRejectedValue(new PermissionDeniedError('Este módulo no está disponible para tu tipo de cuenta.'));
    vi.mocked(stressClient.listCompletions).mockResolvedValue([]);
    vi.mocked(stressClient.getTipOfTheDay).mockResolvedValue(null);

    render(<ClientStressPanel clientId="client-1" />);
    expect(await screen.findByText('Disponible en Premium')).toBeInTheDocument();
  });
});
