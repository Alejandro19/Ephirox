import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminStressProtocolsPanel } from '../components/admin/stress/AdminStressProtocolsPanel';
import * as protocolsClient from '../lib/stress-protocols-client';
import * as criteriaClient from '../lib/assignment-criteria-client';
import * as baselineClient from '../lib/admin-client-baseline-client';
import * as casesClient from '../lib/labeled-cases-client';

vi.mock('../lib/stress-protocols-client');
vi.mock('../lib/assignment-criteria-client');
vi.mock('../lib/admin-client-baseline-client');
vi.mock('../lib/labeled-cases-client');

const BASE_PROTOCOL: protocolsClient.StressProtocol = {
  id: 'p1',
  name: 'Recuperación Vagal — Nivel 1',
  mechanism: 'Respiración',
  status: 'borrador',
  criteriaId: null,
  suggestedFrequency: null,
  defaultCycleWeeks: 12,
  sortOrder: 0,
  createdAt: '2026-09-01T00:00:00.000Z',
};

describe('AdminStressProtocolsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(criteriaClient.listCriteria).mockResolvedValue([]);
    vi.mocked(criteriaClient.listMetrics).mockResolvedValue([]);
    vi.mocked(baselineClient.listActiveClientsWithBaseline).mockResolvedValue([]);
    vi.mocked(casesClient.listRecentCases).mockResolvedValue([]);
    vi.mocked(casesClient.getProtocolEffectiveness).mockResolvedValue(null);
  });

  it('shows an empty state when the library has no protocols yet', async () => {
    vi.mocked(protocolsClient.listProtocols).mockResolvedValue([]);
    render(<AdminStressProtocolsPanel />);
    expect(await screen.findByText('Aún no hay protocolos en la librería.')).toBeInTheDocument();
  });

  it('creates a protocol and it appears in the library', async () => {
    const user = userEvent.setup();
    vi.mocked(protocolsClient.listProtocols)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([BASE_PROTOCOL]);
    vi.mocked(protocolsClient.createProtocol).mockResolvedValue(BASE_PROTOCOL);
    vi.mocked(protocolsClient.getProtocol).mockResolvedValue({ protocol: BASE_PROTOCOL, resources: [] });

    render(<AdminStressProtocolsPanel />);
    await screen.findByText('Aún no hay protocolos en la librería.');

    await user.type(screen.getByLabelText('Nombre del protocolo'), 'Recuperación Vagal — Nivel 1');
    await user.click(screen.getByRole('button', { name: '+ Crear protocolo' }));

    expect(protocolsClient.createProtocol).toHaveBeenCalledWith('Recuperación Vagal — Nivel 1', null);
    expect(await screen.findByText('Recuperación Vagal — Nivel 1')).toBeInTheDocument();
  });

  it('opens a protocol, shows its status and resources, and changing status calls updateProtocolStatus', async () => {
    const user = userEvent.setup();
    vi.mocked(protocolsClient.listProtocols).mockResolvedValue([BASE_PROTOCOL]);
    vi.mocked(protocolsClient.getProtocol).mockResolvedValue({
      protocol: BASE_PROTOCOL,
      resources: [
        {
          id: 'r1', protocolId: 'p1', type: 'Técnica de respiración', title: 'Respiración 4-7-8',
          durationMinutes: 3, durationSeconds: null, instructions: null, audioUrl: null, audioName: null,
          videoUrl: null, videoName: null, youtubeUrl: null, sortOrder: 0,
        },
      ],
    });
    vi.mocked(protocolsClient.updateProtocolStatus).mockResolvedValue({ ...BASE_PROTOCOL, status: 'publicado' });

    render(<AdminStressProtocolsPanel />);
    await user.click(await screen.findByRole('button', { name: /Recuperación Vagal/ }));

    expect(await screen.findByText('Respiración 4-7-8')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Estado del protocolo'), 'publicado');
    expect(protocolsClient.updateProtocolStatus).toHaveBeenCalledWith('p1', 'publicado');
  });

  it('edits the suggested frequency and cycle duration of a protocol', async () => {
    const user = userEvent.setup();
    vi.mocked(protocolsClient.listProtocols).mockResolvedValue([BASE_PROTOCOL]);
    vi.mocked(protocolsClient.getProtocol).mockResolvedValue({ protocol: BASE_PROTOCOL, resources: [] });
    vi.mocked(protocolsClient.updateProtocolSchedule).mockResolvedValue({ ...BASE_PROTOCOL, suggestedFrequency: '2x / día', defaultCycleWeeks: 16 });

    render(<AdminStressProtocolsPanel />);
    await user.click(await screen.findByRole('button', { name: /Recuperación Vagal/ }));

    await user.selectOptions(await screen.findByLabelText('Frecuencia sugerida'), '2x / día');
    expect(protocolsClient.updateProtocolSchedule).toHaveBeenCalledWith('p1', { suggested_frequency: '2x / día' });

    await user.selectOptions(screen.getByLabelText('Duración del ciclo'), '16');
    expect(protocolsClient.updateProtocolSchedule).toHaveBeenCalledWith('p1', { default_cycle_weeks: 16 });
  });

  // "Datos del protocolo" pasa a ser editable (pedido explícito) — antes
  // nombre/mecanismo eran de solo lectura, solo el estado se podía cambiar.
  it('edits the protocol name and mechanism from "Datos del protocolo"', async () => {
    const user = userEvent.setup();
    vi.mocked(protocolsClient.listProtocols).mockResolvedValue([BASE_PROTOCOL]);
    vi.mocked(protocolsClient.getProtocol).mockResolvedValue({ protocol: BASE_PROTOCOL, resources: [] });
    vi.mocked(protocolsClient.updateProtocolDetails).mockResolvedValue({
      ...BASE_PROTOCOL, name: 'Recuperación Vagal — Nivel 2', mechanism: 'Respiración vagal',
    });

    render(<AdminStressProtocolsPanel />);
    await user.click(await screen.findByRole('button', { name: /Recuperación Vagal/ }));

    await user.click(await screen.findByRole('button', { name: 'Editar datos del protocolo' }));
    const nameInput = screen.getByDisplayValue('Recuperación Vagal — Nivel 1');
    await user.clear(nameInput);
    await user.type(nameInput, 'Recuperación Vagal — Nivel 2');
    const mechanismInput = screen.getByDisplayValue('Respiración');
    await user.clear(mechanismInput);
    await user.type(mechanismInput, 'Respiración vagal');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(protocolsClient.updateProtocolDetails).toHaveBeenCalledWith('p1', {
      name: 'Recuperación Vagal — Nivel 2', mechanism: 'Respiración vagal',
    });
    expect(await screen.findByRole('heading', { name: 'Recuperación Vagal — Nivel 2' })).toBeInTheDocument();
  });

  // Orden de sub-cards pedido explícito: Datos → Reglas → Recursos (con
  // Frecuencia/Duración al final) → Baseline (independiente) → Asignar a
  // clientes activos.
  it('shows Recursos del protocolo, then Baseline, then Asignar a clientes activos, in that order', async () => {
    const user = userEvent.setup();
    vi.mocked(protocolsClient.listProtocols).mockResolvedValue([BASE_PROTOCOL]);
    vi.mocked(protocolsClient.getProtocol).mockResolvedValue({ protocol: BASE_PROTOCOL, resources: [] });
    vi.mocked(baselineClient.listActiveClientsWithBaseline).mockResolvedValue([
      { id: 'cl1', name: 'Camila Ruiz', clientType: 'coaching_1_1', fecha: '2026-09-16', hrvNocturno: 35, fcReposo: 68, suenoScore: 62, recoveryScore: null },
    ]);

    render(<AdminStressProtocolsPanel />);
    await user.click(await screen.findByRole('button', { name: /Recuperación Vagal/ }));
    await screen.findByText('Baseline relevante para Stress — Camila Ruiz');

    const order = [...document.querySelectorAll('span')]
      .map((el) => el.textContent)
      .filter((t) => t === 'Recursos del protocolo' || t?.startsWith('Baseline relevante') || t === 'Asignar a clientes activos');
    expect(order).toEqual(['Recursos del protocolo', 'Baseline relevante para Stress — Camila Ruiz', 'Asignar a clientes activos']);
  });

  it('shows the audio uploader only for "Meditación guiada" resources, not for other types', async () => {
    vi.mocked(protocolsClient.listProtocols).mockResolvedValue([BASE_PROTOCOL]);
    vi.mocked(protocolsClient.getProtocol).mockResolvedValue({
      protocol: BASE_PROTOCOL,
      resources: [
        {
          id: 'r1', protocolId: 'p1', type: 'Meditación guiada', title: 'Calma nocturna',
          durationMinutes: 8, durationSeconds: null, instructions: null, audioUrl: null, audioName: null,
          videoUrl: null, videoName: null, youtubeUrl: null, sortOrder: 0,
        },
        {
          id: 'r2', protocolId: 'p1', type: 'Journal de descarga', title: '3 preguntas',
          durationMinutes: 5, durationSeconds: null, instructions: null, audioUrl: null, audioName: null,
          videoUrl: null, videoName: null, youtubeUrl: null, sortOrder: 1,
        },
      ],
    });

    const user = userEvent.setup();
    render(<AdminStressProtocolsPanel />);
    await user.click(await screen.findByRole('button', { name: /Recuperación Vagal/ }));

    await screen.findByText('Calma nocturna');
    expect(screen.getByText('Adjuntar audio (.mp3, .wav)')).toBeInTheDocument();
    // Solo un uploader de audio visible — el recurso de tipo "Journal de descarga" no tiene.
    expect(screen.getAllByText('Adjuntar audio (.mp3, .wav)')).toHaveLength(1);
  });

  it('shows and previews a YouTube link only for "Meditación guiada" resources', async () => {
    vi.mocked(protocolsClient.listProtocols).mockResolvedValue([BASE_PROTOCOL]);
    vi.mocked(protocolsClient.getProtocol).mockResolvedValue({
      protocol: BASE_PROTOCOL,
      resources: [
        {
          id: 'r1', protocolId: 'p1', type: 'Meditación guiada', title: 'Calma nocturna',
          durationMinutes: 8, durationSeconds: null, instructions: null, audioUrl: null, audioName: null,
          videoUrl: null, videoName: null, youtubeUrl: 'https://youtube.com/watch?v=calma', sortOrder: 0,
        },
        {
          id: 'r2', protocolId: 'p1', type: 'Journal de descarga', title: '3 preguntas',
          durationMinutes: 5, durationSeconds: null, instructions: null, audioUrl: null, audioName: null,
          videoUrl: null, videoName: null, youtubeUrl: null, sortOrder: 1,
        },
      ],
    });

    const user = userEvent.setup();
    render(<AdminStressProtocolsPanel />);
    await user.click(await screen.findByRole('button', { name: /Recuperación Vagal/ }));

    await screen.findByText('Calma nocturna');
    expect(screen.getByRole('link', { name: 'https://youtube.com/watch?v=calma' })).toBeInTheDocument();
  });

  it('creates a new "Meditación guiada" resource with a YouTube link', async () => {
    const user = userEvent.setup();
    vi.mocked(protocolsClient.listProtocols).mockResolvedValue([BASE_PROTOCOL]);
    vi.mocked(protocolsClient.getProtocol).mockResolvedValue({ protocol: BASE_PROTOCOL, resources: [] });
    vi.mocked(protocolsClient.createResource).mockResolvedValue({
      id: 'r3', protocolId: 'p1', type: 'Meditación guiada', title: 'Calma nocturna',
      durationMinutes: null, durationSeconds: null, instructions: null, audioUrl: null, audioName: null,
      videoUrl: null, videoName: null, youtubeUrl: 'https://youtube.com/watch?v=calma', sortOrder: 0,
    });

    render(<AdminStressProtocolsPanel />);
    await user.click(await screen.findByRole('button', { name: /Recuperación Vagal/ }));
    await screen.findByText('Este protocolo todavía no tiene recursos.');

    await user.selectOptions(screen.getByLabelText('Tipo'), 'Meditación guiada');
    await user.type(screen.getByLabelText('Título'), 'Calma nocturna');
    await user.type(screen.getByLabelText('Enlace (YouTube, opcional)'), 'https://youtube.com/watch?v=calma');
    await user.click(screen.getByRole('button', { name: '+ Agregar recurso' }));

    expect(protocolsClient.createResource).toHaveBeenCalledWith('p1', {
      type: 'Meditación guiada',
      title: 'Calma nocturna',
      duration_minutes: null,
      instructions: null,
      youtube_url: 'https://youtube.com/watch?v=calma',
    });
  });

  it('edits an existing resource — título, duración e instrucciones', async () => {
    const user = userEvent.setup();
    const resource: protocolsClient.StressProtocolResource = {
      id: 'r1', protocolId: 'p1', type: 'Técnica de respiración', title: 'Respiración 4-7-8',
      durationMinutes: 3, durationSeconds: null, instructions: null, audioUrl: null, audioName: null,
      videoUrl: null, videoName: null, youtubeUrl: null, sortOrder: 0,
    };
    vi.mocked(protocolsClient.listProtocols).mockResolvedValue([BASE_PROTOCOL]);
    vi.mocked(protocolsClient.getProtocol).mockResolvedValue({ protocol: BASE_PROTOCOL, resources: [resource] });
    vi.mocked(protocolsClient.updateResource).mockResolvedValue({ ...resource, title: 'Respiración 4-7-8 (revisada)', durationMinutes: 5 });

    render(<AdminStressProtocolsPanel />);
    await user.click(await screen.findByRole('button', { name: /Recuperación Vagal/ }));
    await screen.findByText('Respiración 4-7-8');

    await user.click(screen.getByRole('button', { name: 'Editar' }));
    const titleInput = screen.getByDisplayValue('Respiración 4-7-8');
    await user.clear(titleInput);
    await user.type(titleInput, 'Respiración 4-7-8 (revisada)');
    const durationInput = screen.getByDisplayValue('3');
    await user.clear(durationInput);
    await user.type(durationInput, '5');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(protocolsClient.updateResource).toHaveBeenCalledWith('p1', 'r1', {
      type: 'Técnica de respiración',
      title: 'Respiración 4-7-8 (revisada)',
      duration_minutes: 5,
      instructions: null,
      youtube_url: null,
    });
    expect(await screen.findByText('Respiración 4-7-8 (revisada)')).toBeInTheDocument();
  });
});
