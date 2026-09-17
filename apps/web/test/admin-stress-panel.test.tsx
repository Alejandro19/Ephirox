import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithSWR as render } from './swr-test-utils';
import { AdminStressPanel } from '../components/stress/AdminStressPanel';
import * as stressClient from '../lib/stress-client';
import * as stressTipsClient from '../lib/stress-tips-client';
import * as protocolsClient from '../lib/stress-protocols-client';
import * as mentorsClient from '../lib/mentors-client';
import * as casesClient from '../lib/labeled-cases-client';

vi.mock('../lib/stress-client');
vi.mock('../lib/stress-tips-client');
vi.mock('../lib/stress-protocols-client');
vi.mock('../lib/mentors-client');
vi.mock('../lib/labeled-cases-client');

const baseTechnique = {
  type: null, duration: null, durationMinutes: null, durationSeconds: null, description: null,
  videoUrl: null, videoName: null, youtubeUrl: null, audioUrl: null, audioName: null, emotion: null,
  precautionNote: null, isRitual: false,
};

describe('AdminStressPanel', () => {
  beforeEach(() => {
    vi.mocked(stressClient.listTechniques).mockResolvedValue([]);
    vi.mocked(stressTipsClient.listTips).mockResolvedValue([]);
    vi.mocked(protocolsClient.listProtocols).mockResolvedValue([]);
    vi.mocked(mentorsClient.listMentors).mockResolvedValue([]);
    vi.mocked(casesClient.getActiveCase).mockResolvedValue(null);
  });

  it('lists existing techniques', async () => {
    const user = userEvent.setup();
    vi.mocked(stressClient.listTechniques).mockResolvedValue([
      { ...baseTechnique, id: 't1', title: 'Respiración 4-7-8', type: 'Respiración' },
    ]);
    render(<AdminStressPanel clientId="client-1" />);
    await waitFor(() => screen.getByText(/Técnicas asignadas/));
    await user.click(screen.getByText(/Técnicas asignadas/));
    expect(await screen.findByText('Respiración 4-7-8')).toBeInTheDocument();
  });

  it('assigns a new technique with duration and youtube url', async () => {
    const user = userEvent.setup();
    vi.mocked(stressClient.createTechnique).mockResolvedValue({ ...baseTechnique, id: 't2', title: 'Meditación' });
    render(<AdminStressPanel clientId="client-1" />);
    await waitFor(() => screen.getByLabelText('Título'));

    await user.type(screen.getByLabelText('Título'), 'Meditación');
    await user.type(screen.getByLabelText('Minutos'), '5');
    await user.type(screen.getByLabelText('Segundos'), '30');
    await user.type(screen.getByLabelText('Video (YouTube)'), 'https://youtube.com/watch?v=abcdef');
    await user.click(screen.getByRole('button', { name: 'Asignar' }));

    await waitFor(() =>
      expect(stressClient.createTechnique).toHaveBeenCalledWith(
        'client-1',
        expect.objectContaining({
          title: 'Meditación',
          duration_minutes: 5,
          duration_seconds: 30,
          youtube_url: 'https://youtube.com/watch?v=abcdef',
        })
      )
    );
  });

  it('expands the techniques accordion and deletes a technique', async () => {
    const user = userEvent.setup();
    vi.mocked(stressClient.listTechniques).mockResolvedValue([
      { ...baseTechnique, id: 't1', title: 'Respiración' },
    ]);
    render(<AdminStressPanel clientId="client-1" />);
    await waitFor(() => screen.getByText(/Técnicas asignadas/));

    await user.click(screen.getByText(/Técnicas asignadas/));
    const list = await screen.findByRole('list');
    await within(list).findByText('Respiración');

    await user.click(within(list).getByRole('button', { name: 'Eliminar' }));
    await waitFor(() => expect(stressClient.deleteTechnique).toHaveBeenCalledWith('client-1', 't1'));
  });

  it('edits a technique inline', async () => {
    const user = userEvent.setup();
    vi.mocked(stressClient.listTechniques).mockResolvedValue([
      { ...baseTechnique, id: 't1', title: 'Respiración', durationMinutes: 5 },
    ]);
    vi.mocked(stressClient.updateTechnique).mockResolvedValue({ ...baseTechnique, id: 't1', title: 'Respiración editada' });
    render(<AdminStressPanel clientId="client-1" />);
    await waitFor(() => screen.getByText(/Técnicas asignadas/));
    await user.click(screen.getByText(/Técnicas asignadas/));
    const list = await screen.findByRole('list');
    await within(list).findByText('Respiración');

    await user.click(within(list).getByRole('button', { name: 'Editar' }));
    const titleInput = within(list).getByLabelText('Título');
    await user.clear(titleInput);
    await user.type(titleInput, 'Respiración editada');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() =>
      expect(stressClient.updateTechnique).toHaveBeenCalledWith('client-1', 't1', expect.objectContaining({ title: 'Respiración editada' }))
    );
  });

  it('expands the tips accordion and creates a tip', async () => {
    const user = userEvent.setup();
    vi.mocked(stressTipsClient.createTip).mockResolvedValue({ id: 'tip1', content: 'Duerme bien.', active: true });
    render(<AdminStressPanel clientId="client-1" />);
    await waitFor(() => screen.getByText(/Tips educativos/));

    await user.click(screen.getByText(/Tips educativos/));
    const textarea = await screen.findByLabelText('Nuevo tip');
    await user.type(textarea, 'Duerme bien.');
    await user.click(screen.getByRole('button', { name: 'Agregar' }));

    await waitFor(() => expect(stressTipsClient.createTip).toHaveBeenCalledWith('Duerme bien.'));
  });
});
