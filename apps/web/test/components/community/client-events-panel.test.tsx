import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClientEventsPanel } from '../../../components/community/ClientEventsPanel';
import * as eventsClient from '../../../lib/events-client';

vi.mock('../../../lib/events-client');

describe('ClientEventsPanel', () => {
  it('shows a "Reservar" button when the client has no reservation for an event', async () => {
    vi.mocked(eventsClient.listEvents).mockResolvedValue([
      { id: 'e1', title: 'Sesión grupal', description: null, eventDate: null, location: null, capacity: null, active: true, confirmed_count: 0 },
    ]);
    vi.mocked(eventsClient.listMyEventReservations).mockResolvedValue([]);
    render(<ClientEventsPanel clientId="client-1" />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Reservar' })).toBeInTheDocument());
  });

  it('shows a "Cancelar reserva" button when the client already has a confirmed reservation', async () => {
    vi.mocked(eventsClient.listEvents).mockResolvedValue([
      { id: 'e1', title: 'Sesión grupal', description: null, eventDate: null, location: null, capacity: null, active: true, confirmed_count: 1 },
    ]);
    vi.mocked(eventsClient.listMyEventReservations).mockResolvedValue([{ eventId: 'e1', status: 'confirmada' }]);
    render(<ClientEventsPanel clientId="client-1" />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancelar reserva' })).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Reservar' })).not.toBeInTheDocument();
  });

  it('reserving an event calls reserveEvent and flips the button to Cancelar reserva', async () => {
    const user = userEvent.setup();
    vi.mocked(eventsClient.listEvents).mockResolvedValue([
      { id: 'e1', title: 'Sesión grupal', description: null, eventDate: null, location: null, capacity: null, active: true, confirmed_count: 0 },
    ]);
    vi.mocked(eventsClient.listMyEventReservations)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ eventId: 'e1', status: 'confirmada' }]);
    vi.mocked(eventsClient.reserveEvent).mockResolvedValue(undefined);

    render(<ClientEventsPanel clientId="client-1" />);
    await waitFor(() => screen.getByRole('button', { name: 'Reservar' }));
    await user.click(screen.getByRole('button', { name: 'Reservar' }));

    await waitFor(() => expect(eventsClient.reserveEvent).toHaveBeenCalledWith('e1'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancelar reserva' })).toBeInTheDocument());
  });

  it('cancelling a reservation calls cancelEventReservation and flips the button back to Reservar', async () => {
    const user = userEvent.setup();
    vi.mocked(eventsClient.listEvents).mockResolvedValue([
      { id: 'e1', title: 'Sesión grupal', description: null, eventDate: null, location: null, capacity: null, active: true, confirmed_count: 1 },
    ]);
    vi.mocked(eventsClient.listMyEventReservations)
      .mockResolvedValueOnce([{ eventId: 'e1', status: 'confirmada' }])
      .mockResolvedValueOnce([]);
    vi.mocked(eventsClient.cancelEventReservation).mockResolvedValue(undefined);

    render(<ClientEventsPanel clientId="client-1" />);
    await waitFor(() => screen.getByRole('button', { name: 'Cancelar reserva' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar reserva' }));

    await waitFor(() => expect(eventsClient.cancelEventReservation).toHaveBeenCalledWith('e1'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Reservar' })).toBeInTheDocument());
  });
});