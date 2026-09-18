import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminStressProtocolsPanel } from '../components/admin/stress/AdminStressProtocolsPanel';
import * as protocolsClient from '../lib/stress-protocols-client';
import * as criteriaClient from '../lib/assignment-criteria-client';
import * as baselineClient from '../lib/admin-client-baseline-client';

vi.mock('../lib/stress-protocols-client');
vi.mock('../lib/assignment-criteria-client');
vi.mock('../lib/admin-client-baseline-client');

const BASE_PROTOCOL: protocolsClient.StressProtocol = {
  id: 'p1',
  name: 'Recuperación Vagal — Nivel 1',
  mechanism: 'Respiración',
  status: 'borrador',
  criteriaId: null,
  sortOrder: 0,
  createdAt: '2026-09-01T00:00:00.000Z',
};

describe('AdminStressProtocolsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(criteriaClient.listCriteria).mockResolvedValue([]);
    vi.mocked(criteriaClient.listMetrics).mockResolvedValue([]);
    vi.mocked(baselineClient.listActiveClientsWithBaseline).mockResolvedValue([]);
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
});
