import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminTherapiesPanel } from '../../../components/community/AdminTherapiesPanel';
import * as therapiesClient from '../../../lib/therapies-client';

vi.mock('../../../lib/therapies-client');

describe('AdminTherapiesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(therapiesClient.listTherapies).mockResolvedValue([]);
  });

  it('lists existing therapies', async () => {
    vi.mocked(therapiesClient.listTherapies).mockResolvedValue([
      { id: 't1', title: 'Masaje', description: null, discountPct: 30, provider: 'Aliado', active: true, confirmed_count: 2 },
    ]);
    render(<AdminTherapiesPanel />);
    // Wait for the therapy title to appear (using regex to handle text formatting)
    await waitFor(() => {
      const element = screen.getByText(/Masaje/);
      expect(element).toBeInTheDocument();
    });
  });

  it('creates a new therapy', async () => {
    vi.mocked(therapiesClient.createTherapy).mockResolvedValue({ id: 't2', title: 'Nueva terapia', description: null, discountPct: null, provider: null, active: true, confirmed_count: 0 });
    render(<AdminTherapiesPanel />);

    // Wait for the input fields to be available
    await waitFor(() => screen.getByLabelText('Título de la terapia'));

    // Fill in the form
    fireEvent.change(screen.getByLabelText('Título de la terapia'), { target: { value: 'Nueva terapia' } });
    fireEvent.click(screen.getByRole('button', { name: '+ Agregar terapia' }));

    // Wait for the createTherapy call
    await waitFor(() => expect(therapiesClient.createTherapy).toHaveBeenCalledWith(expect.objectContaining({ title: 'Nueva terapia' })));
  });

  it('deletes a therapy', async () => {
    vi.mocked(therapiesClient.listTherapies).mockResolvedValue([
      { id: 't1', title: 'Masaje', description: null, discountPct: null, provider: null, active: true, confirmed_count: 0 },
    ]);
    vi.mocked(therapiesClient.deleteTherapy).mockResolvedValue(undefined);
    render(<AdminTherapiesPanel />);
    // Wait for the therapy title to appear (using regex to handle text formatting)
    await waitFor(() => {
      const element = screen.getByText(/Masaje/);
      expect(element).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => expect(therapiesClient.deleteTherapy).toHaveBeenCalledWith('t1'));
  });
});