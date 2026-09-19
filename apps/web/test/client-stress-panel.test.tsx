import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
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

const DISABLED_REGULATION_CAPACITY: stressClient.RegulationCapacityOverview = { enabled: false, today: null, trend: [], baseline: null };

function mockFetches({
  techniques = [],
  completions = [],
  morningCheckin = { id: 'mc1', fecha: '2026-08-02', energia: 3, tension: 3, claridad: 3, activacionMatutina: 6 },
  cognitiveLoad = DEFAULT_COGNITIVE_LOAD,
  activeCase = null,
  regulationCapacity = DISABLED_REGULATION_CAPACITY,
  closedCases = [],
}: {
  techniques?: stressClient.StressTechnique[];
  completions?: stressClient.StressCompletion[];
  morningCheckin?: stressClient.MorningCheckin;
  cognitiveLoad?: stressClient.CognitiveLoadOverview;
  activeCase?: labeledCasesClient.ActiveCaseView | null;
  regulationCapacity?: stressClient.RegulationCapacityOverview;
  closedCases?: labeledCasesClient.ClosedCaseSummary[];
} = {}) {
  vi.mocked(stressClient.listTechniques).mockResolvedValue(techniques);
  vi.mocked(stressClient.listCompletions).mockResolvedValue(completions);
  vi.mocked(stressClient.getTodayMorningCheckin).mockResolvedValue(morningCheckin);
  vi.mocked(stressClient.getCognitiveLoadOverview).mockResolvedValue(cognitiveLoad);
  vi.mocked(stressClient.getRegulationCapacityOverview).mockResolvedValue(regulationCapacity);
  vi.mocked(labeledCasesClient.getActiveCase).mockResolvedValue(activeCase);
  vi.mocked(labeledCasesClient.listClosedCases).mockResolvedValue(closedCases);
}

describe('ClientStressPanel', () => {
  it('shows the assigned protocols', async () => {
    mockFetches({
      techniques: [
        { id: 't1', title: 'Respiración 4-7-8', type: 'Respiración', duration: '5 min', durationMinutes: 5, durationSeconds: null, description: null, videoUrl: null, videoName: null, youtubeUrl: null, audioUrl: null, audioName: null, emotion: null, precautionNote: null, isRitual: false },
      ],
    });

    render(<ClientStressPanel clientId="client-1" />);
    // Con un solo protocolo asignado, el título aparece dos veces a propósito:
    // en la card "Recomendado para ti ahora" (siempre el primero, ver
    // ClientStressPanel.tsx) y en la librería "Tus protocolos" de abajo.
    await waitFor(() => expect(screen.getAllByText('Respiración 4-7-8').length).toBeGreaterThan(0));
  });

  it('no longer shows the legacy "Momento de regulación", "Sabías que", or "Carga cognitiva" cards', async () => {
    mockFetches({ cognitiveLoad: { ...DEFAULT_COGNITIVE_LOAD, today: 5 } });
    render(<ClientStressPanel clientId="client-1" />);
    await waitFor(() => expect(screen.getByText('Capacidad de regulación')).toBeInTheDocument());
    expect(screen.queryByText('Momento de regulación')).not.toBeInTheDocument();
    expect(screen.queryByText('Sabías que')).not.toBeInTheDocument();
    expect(screen.queryByText('Carga cognitiva')).not.toBeInTheDocument();
    expect(screen.queryByText('Tendencia 14 días')).not.toBeInTheDocument();
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
    await waitFor(() => expect(stressClient.markCompletion).toHaveBeenCalledWith('client-1', {}));
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
        protocol: { id: 'p1', name: 'Recuperación Vagal — Nivel 1', mechanism: 'Respiración', suggestedFrequency: '2x / día' },
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
    expect(screen.getByText('Frecuencia sugerida: 2x / día')).toBeInTheDocument();
    expect(screen.queryByText('Tu mentor está diseñando tu plan personalizado.')).not.toBeInTheDocument();
  });

  it('"Técnica de respiración" starts a real countdown and marks completed when it reaches zero', async () => {
    mockFetches({
      activeCase: {
        labeledCase: {
          id: 'case-1', caseNumber: 1247, clientId: 'client-1', module: 'stress', protocolId: 'p1',
          mentorId: null, assignedAt: new Date().toISOString(), cycleWeeks: 12, outcome: null,
        },
        mentor: null,
        protocol: { id: 'p1', name: 'Recuperación Vagal — Nivel 1', mechanism: null, suggestedFrequency: null },
        resources: [
          {
            id: 'r1', protocolId: 'p1', type: 'Técnica de respiración', title: 'Respiración 4-7-8',
            durationMinutes: 0, durationSeconds: 1, instructions: null, audioUrl: null, audioName: null,
            videoUrl: null, videoName: null, youtubeUrl: null, sortOrder: 0,
          },
        ],
        checkpoints: [],
      },
    });

    render(<ClientStressPanel clientId="client-1" clientType="mentoring" />);
    const startButton = await screen.findByRole('button', { name: 'Empezar' });
    fireEvent.click(startButton);

    expect(screen.getByText('0:01')).toBeInTheDocument();
    await waitFor(() => expect(stressClient.markCompletion).toHaveBeenCalledWith('client-1', { resourceId: 'r1', notes: undefined }), { timeout: 3000 });
  }, 10000);

  it('"Journal de descarga" opens a text box and saves its content as notes', async () => {
    const user = userEvent.setup();
    mockFetches({
      activeCase: {
        labeledCase: {
          id: 'case-1', caseNumber: 1247, clientId: 'client-1', module: 'stress', protocolId: 'p1',
          mentorId: null, assignedAt: new Date().toISOString(), cycleWeeks: 12, outcome: null,
        },
        mentor: null,
        protocol: { id: 'p1', name: 'Recuperación Vagal — Nivel 1', mechanism: null, suggestedFrequency: null },
        resources: [
          {
            id: 'r2', protocolId: 'p1', type: 'Journal de descarga', title: 'Diario de descarga',
            durationMinutes: null, durationSeconds: null, instructions: null, audioUrl: null, audioName: null,
            videoUrl: null, videoName: null, youtubeUrl: null, sortOrder: 0,
          },
        ],
        checkpoints: [],
      },
    });

    render(<ClientStressPanel clientId="client-1" clientType="mentoring" />);
    await user.click(await screen.findByRole('button', { name: 'Escribir' }));
    await user.type(screen.getByPlaceholderText('Escribe lo que quieras dejar por escrito hoy…'), 'Hoy me sentí mejor.');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(stressClient.markCompletion).toHaveBeenCalledWith('client-1', { resourceId: 'r2', notes: 'Hoy me sentí mejor.' }));
  });

  it('"Meditación guiada" plays its audio and marks completed when it ends', async () => {
    const user = userEvent.setup();
    mockFetches({
      activeCase: {
        labeledCase: {
          id: 'case-1', caseNumber: 1247, clientId: 'client-1', module: 'stress', protocolId: 'p1',
          mentorId: null, assignedAt: new Date().toISOString(), cycleWeeks: 12, outcome: null,
        },
        mentor: null,
        protocol: { id: 'p1', name: 'Recuperación Vagal — Nivel 1', mechanism: null, suggestedFrequency: null },
        resources: [
          {
            id: 'r3', protocolId: 'p1', type: 'Meditación guiada', title: 'Calma nocturna',
            durationMinutes: 8, durationSeconds: null, instructions: null,
            audioUrl: 'https://files.example.com/calma.mp3', audioName: 'calma.mp3',
            videoUrl: null, videoName: null, youtubeUrl: null, sortOrder: 0,
          },
        ],
        checkpoints: [],
      },
    });

    render(<ClientStressPanel clientId="client-1" clientType="mentoring" />);
    await user.click(await screen.findByRole('button', { name: 'Reproducir' }));
    const audioEl = document.querySelector('audio')!;
    fireEvent.ended(audioEl);

    await waitFor(() => expect(stressClient.markCompletion).toHaveBeenCalledWith('client-1', { resourceId: 'r3', notes: undefined }));
  });

  it('shows a simple protocol-history list (nombre + rango de fechas) for a mentoring client', async () => {
    mockFetches({
      activeCase: {
        labeledCase: {
          id: 'case-2', caseNumber: 1300, clientId: 'client-1', module: 'stress', protocolId: 'p2',
          mentorId: 'm1', assignedAt: new Date().toISOString(), cycleWeeks: 12, outcome: null,
        },
        mentor: { id: 'm1', name: 'Sofía Duarte', specialty: null },
        protocol: { id: 'p2', name: 'Recuperación Vagal — Nivel 2', mechanism: null, suggestedFrequency: null },
        resources: [],
        checkpoints: [],
      },
      closedCases: [
        { id: 'closed-1', protocolName: 'Recuperación Vagal — Nivel 1', assignedAt: '2026-06-01T00:00:00.000Z', closedAt: '2026-08-01T00:00:00.000Z' },
      ],
    });

    render(<ClientStressPanel clientId="client-1" clientType="mentoring" />);
    expect(await screen.findByText('Historial de protocolos')).toBeInTheDocument();
    expect(screen.getByText('Recuperación Vagal — Nivel 1')).toBeInTheDocument();
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

  it('uses the real regulation-capacity index instead of the Carga Cognitiva placeholder once enabled:true', async () => {
    mockFetches({
      // Carga Cognitiva "hoy" sigue presente pero NO debe usarse — si el
      // componente cayera de vuelta al placeholder, saldría 10-3=7*10=70,
      // no el 72 real del índice propio.
      cognitiveLoad: { ...DEFAULT_COGNITIVE_LOAD, today: 3 },
      regulationCapacity: {
        enabled: true,
        today: 72,
        trend: [
          { fecha: '2026-09-10', score: 90 },
          { fecha: '2026-09-11', score: 90 },
          { fecha: '2026-09-12', score: 90 },
          { fecha: '2026-09-13', score: 72 },
        ],
        baseline: { hrvAvg: 45, fcReposoAvg: 62, suenoScoreAvg: 68, daysUsed: 7 },
      },
    });

    render(<ClientStressPanel clientId="client-1" />);
    await waitFor(() => expect(screen.getByText('72')).toBeInTheDocument());
    expect(screen.queryByText('70')).not.toBeInTheDocument();
    // Baseline = promedio de los 3 días previos (90,90,90 -> 90) -> delta = 72 - 90 = -18.
    expect(screen.getByText(/18 pts vs\. tu línea base/)).toBeInTheDocument();
    expect(screen.getByText(/tu línea base personal, registrada en tu semana de referencia inicial/)).toBeInTheDocument();
  });

  it('shows the generic upgrade card when this client type has no access to Stress', async () => {
    vi.mocked(stressClient.listTechniques).mockRejectedValue(new PermissionDeniedError('Este módulo no está disponible para tu tipo de cuenta.'));
    vi.mocked(stressClient.listCompletions).mockResolvedValue([]);

    render(<ClientStressPanel clientId="client-1" />);
    expect(await screen.findByText('Disponible en Premium')).toBeInTheDocument();
  });
});
