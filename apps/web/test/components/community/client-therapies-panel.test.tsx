import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClientTherapiesPanel } from '../../../components/community/ClientTherapiesPanel';
import * as therapiesClient from '../../../lib/therapies-client';

vi.mock('../../../lib/therapies-client');

describe('ClientTherapiesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(therapiesClient.listTherapies).mockResolvedValue([]);
    vi.mocked(therapiesClient.listMyTherapyReservations).mockResolvedValue([]);
  });

  it('shows a "Reservar" button when the client has no reservation for a therapy', async () => {
    vi.mocked(therapiesClient.listTherapies).mockResolvedValue([
      { id: 't1', title: 'Masaje', description: null, discountPct: null, provider: null, active: true, confirmed_count: 0 },
    ]);
    render(<ClientTherapiesPanel clientId="client-1" />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Reservar' })).toBeInTheDocument());
  });

  it('shows a "Cancelar reserva" button when the client already has a confirmed reservation', async () => {
    vi.mocked(therapiesClient.listTherapies).mockResolvedValue([
      { id: 't1', title: 'Masaje', description: null, discountPct: null, provider: null, active: true, confirmed_count: 1 },
    ]);
    vi.mocked(therapiesClient.listMyTherapyReservations).mockResolvedValue([{ therapyId: 't1', status: 'confirmada' }]);
    render(<ClientTherapiesPanel clientId="client-1" />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancelar reserva' })).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Reservar' })).not.toBeInTheDocument();
  });

  it('reserving a therapy calls reserveTherapy and flips the button to Cancelar reserva', async () => {
    const user = userEvent.setup();
    vi.mocked(therapiesClient.listTherapies).mockResolvedValue([
      { id: 't1', title: 'Masaje', description: null, discountPct: null, provider: null, active: true, confirmed_count: 0 },
    ]);
    vi.mocked(therapiesClient.listMyTherapyReservations)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ therapyId: 't1', status: 'confirmada' }]);
    vi.mocked(therapiesClient.reserveTherapy).mockResolvedValue(undefined);

    render(<ClientTherapiesPanel clientId="client-1" />);
    await waitFor(() => screen.getByRole('button', { name: 'Reservar' }));
    await user.click(screen.getByRole('button', { name: 'Reservar' }));

    await waitFor(() => expect(therapiesClient.reserveTherapy).toHaveBeenCalledWith('t1'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancelar reserva' })).toBeInTheDocument());
  });

  it('cancelling a reservation calls cancelTherapyReservation and flips the button back to Reservar', async () => {
    const user = userEvent.setup();
    vi.mocked(therapiesClient.listTherapies).mockResolvedValue([
      { id: 't1', title: 'Masaje', description: null, discountPct: null, provider: null, active: true, confirmed_count: 1 },
    ]);
    vi.mocked(therapiesClient.listMyTherapyReservations)
      .mockResolvedValueOnce([{ therapyId: 't1', status: 'confirmada' }])
      .mockResolvedValueOnce([]);
    vi.mocked(therapiesClient.cancelTherapyReservation).mockResolvedValue(undefined);

    render(<ClientTherapiesPanel clientId="client-1" />);
    await waitFor(() => screen.getByRole('button', { name: 'Cancelar reserva' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar reserva' }));

    await waitFor(() => expect(therapiesClient.cancelTherapyReservation).toHaveBeenCalledWith('t1'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Reservar' })).toBeInTheDocument());
  });
});