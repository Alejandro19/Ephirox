import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminCortisolPanel } from '../components/cortisol/AdminCortisolPanel';
import * as cortisolClient from '../lib/cortisol-client';

vi.mock('../lib/cortisol-client');

describe('AdminCortisolPanel', () => {
  beforeEach(() => {
    vi.mocked(cortisolClient.listTechniques).mockResolvedValue([]);
  });

  it('lists existing techniques', async () => {
    vi.mocked(cortisolClient.listTechniques).mockResolvedValue([
      { id: 't1', title: 'Respiración 4-7-8', type: 'Respiración', duration: null, durationMinutes: 5, description: null, videoUrl: null, videoName: null, youtubeUrl: null, audioUrl: null, audioName: null },
    ]);
    render(<AdminCortisolPanel clientId="client-1" />);
    await waitFor(() => expect(screen.getByText('Respiración 4-7-8')).toBeInTheDocument());
  });

  it('assigns a new technique', async () => {
    const user = userEvent.setup();
    vi.mocked(cortisolClient.createTechnique).mockResolvedValue({ id: 't2', title: 'Meditación', type: null, duration: null, durationMinutes: null, description: null, videoUrl: null, videoName: null, youtubeUrl: null, audioUrl: null, audioName: null });
    render(<AdminCortisolPanel clientId="client-1" />);
    await waitFor(() => screen.getByLabelText('Título'));

    await user.type(screen.getByLabelText('Título'), 'Meditación');
    await user.click(screen.getByRole('button', { name: 'Asignar técnica' }));

    await waitFor(() => expect(cortisolClient.createTechnique).toHaveBeenCalledWith('client-1', expect.objectContaining({ title: 'Meditación' })));
  });

  it('deletes a technique', async () => {
    const user = userEvent.setup();
    vi.mocked(cortisolClient.listTechniques).mockResolvedValue([
      { id: 't1', title: 'Respiración', type: null, duration: null, durationMinutes: null, description: null, videoUrl: null, videoName: null, youtubeUrl: null, audioUrl: null, audioName: null },
    ]);
    render(<AdminCortisolPanel clientId="client-1" />);
    const list = await waitFor(() => screen.getByRole('list'));
    await waitFor(() => within(list).getByText('Respiración'));

    await user.click(screen.getByRole('button', { name: 'Eliminar' }));
    await waitFor(() => expect(cortisolClient.deleteTechnique).toHaveBeenCalledWith('client-1', 't1'));
  });
});
