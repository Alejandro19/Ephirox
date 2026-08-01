import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RestToolsAdminPanel } from '../components/rest/RestToolsAdminPanel';
import * as restToolsClient from '../lib/rest-tools-client';

const sampleTools = [
  { id: 't1', name: 'Sonidos para dormir', meta: 'Ruido blanco', action: 'play', minutes: 20, seconds: 0, audioUrl: null, audioName: null, active: true, sortOrder: 0 },
  { id: 't2', name: 'Diario', meta: null, action: 'write', minutes: null, seconds: null, audioUrl: 'https://x/y.mp3', audioName: 'y.mp3', active: true, sortOrder: 1 },
];

describe('RestToolsAdminPanel', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(restToolsClient, 'listAllRestTools').mockResolvedValue(sampleTools);
  });

  it('renders the fetched tools', async () => {
    render(<RestToolsAdminPanel />);
    await waitFor(() => expect(screen.getByText('Sonidos para dormir')).toBeInTheDocument());
    expect(screen.getByText('Diario')).toBeInTheDocument();
  });

  it('creates a tool and refetches', async () => {
    const createSpy = vi.spyOn(restToolsClient, 'createRestTool').mockResolvedValue({
      id: 't3', name: 'Nueva', meta: '', action: 'write', minutes: null, seconds: null, audioUrl: null, audioName: null, active: true, sortOrder: 2,
    });
    render(<RestToolsAdminPanel />);
    await waitFor(() => expect(screen.getByText('Sonidos para dormir')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Nueva' } });
    fireEvent.click(screen.getByRole('button', { name: '+ Agregar herramienta' }));

    await waitFor(() => expect(createSpy).toHaveBeenCalled());
    expect(createSpy.mock.calls[0][0]).toMatchObject({ name: 'Nueva' });
  });

  it('blocks creating a tool with empty name', async () => {
    const createSpy = vi.spyOn(restToolsClient, 'createRestTool');
    render(<RestToolsAdminPanel />);
    await waitFor(() => expect(screen.getByText('Sonidos para dormir')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '+ Agregar herramienta' }));
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('deletes a tool', async () => {
    const deleteSpy = vi.spyOn(restToolsClient, 'deleteRestTool').mockResolvedValue(undefined);
    render(<RestToolsAdminPanel />);
    await waitFor(() => expect(screen.getByText('Sonidos para dormir')).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole('button', { name: 'Eliminar' })[0]);
    await waitFor(() => expect(deleteSpy).toHaveBeenCalledWith('t1'));
  });

  it('edits a tool', async () => {
    const updateSpy = vi.spyOn(restToolsClient, 'updateRestTool').mockResolvedValue({ ...sampleTools[0], name: 'Editada' });
    render(<RestToolsAdminPanel />);
    await waitFor(() => expect(screen.getByText('Sonidos para dormir')).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole('button', { name: 'Editar' })[0]);
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Editada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(updateSpy).toHaveBeenCalled());
  });

  it('uploads audio for a tool being edited', async () => {
    const uploadSpy = vi.spyOn(restToolsClient, 'uploadRestToolAudio').mockResolvedValue({ ...sampleTools[0], audioUrl: 'https://x/z.mp3', audioName: 'z.mp3' });
    render(<RestToolsAdminPanel />);
    await waitFor(() => expect(screen.getByText('Sonidos para dormir')).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole('button', { name: 'Editar' })[0]);

    const file = new File(['fake'], 'z.mp3', { type: 'audio/mpeg' });
    const fileInput = screen.getByLabelText('Audio propio') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Subir audio' }));

    await waitFor(() => expect(uploadSpy).toHaveBeenCalledWith('t1', file));
  });

  it('removes audio for a tool with an existing audio', async () => {
    const removeSpy = vi.spyOn(restToolsClient, 'removeRestToolAudio').mockResolvedValue({ ...sampleTools[1], audioUrl: null, audioName: null });
    render(<RestToolsAdminPanel />);
    await waitFor(() => expect(screen.getByText('Diario')).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole('button', { name: 'Editar' })[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Quitar audio' }));
    await waitFor(() => expect(removeSpy).toHaveBeenCalledWith('t2'));
  });
});
