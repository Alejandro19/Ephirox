import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminEventsPanel } from '../../../components/community/AdminEventsPanel';
import * as eventsClient from '../../../lib/events-client';

vi.mock('../../../lib/events-client');

describe('AdminEventsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(eventsClient.listEvents).mockResolvedValue([]);
  });

  it('lists existing events with their confirmed count', async () => {
    vi.mocked(eventsClient.listEvents).mockResolvedValue([
      { id: 'e1', title: 'Sesión grupal', description: null, eventDate: null, location: 'Estudio', capacity: 20, active: true, confirmed_count: 3 },
    ]);
    render(<AdminEventsPanel />);
    // Wait for the event title to appear (using regex to handle text formatting)
    await waitFor(() => {
      const element = screen.getByText(/Sesión grupal/);
      expect(element).toBeInTheDocument();
    });
    // Check for the count separately
    await waitFor(() => {
      const element = screen.getByText(/3/);
      expect(element).toBeInTheDocument();
    });
  });

  it('creates a new event', async () => {
    vi.mocked(eventsClient.createEvent).mockResolvedValue({ id: 'e2', title: 'Nuevo evento', description: null, eventDate: null, location: null, capacity: null, active: true, confirmed_count: 0 });
    render(<AdminEventsPanel />);

    // Wait for the input fields to be available
    await waitFor(() => screen.getByLabelText('Título del evento'));

    // Fill in the form
    fireEvent.change(screen.getByLabelText('Título del evento'), { target: { value: 'Nuevo evento' } });
    fireEvent.click(screen.getByRole('button', { name: '+ Agregar evento' }));

    // Wait for the createEvent call
    await waitFor(() => expect(eventsClient.createEvent).toHaveBeenCalledWith(expect.objectContaining({ title: 'Nuevo evento' })));
  });

  it('deletes an event', async () => {
    vi.mocked(eventsClient.listEvents).mockResolvedValue([
      { id: 'e1', title: 'Sesión grupal', description: null, eventDate: null, location: null, capacity: null, active: true, confirmed_count: 0 },
    ]);
    vi.mocked(eventsClient.deleteEvent).mockResolvedValue(undefined);
    render(<AdminEventsPanel />);
    // Wait for the event title to appear (using regex to handle text formatting)
    await waitFor(() => {
      const element = screen.getByText(/Sesión grupal/);
      expect(element).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => expect(eventsClient.deleteEvent).toHaveBeenCalledWith('e1'));
  });
});