import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AdminReservationsPanel } from '../../../components/community/AdminReservationsPanel';
import * as communityReservationsClient from '../../../lib/community-reservations-client';

vi.mock('../../../lib/community-reservations-client');

describe('AdminReservationsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(communityReservationsClient.getConfirmedReservations).mockResolvedValue({
      eventReservations: [],
      therapyReservations: [],
    });
  });

  it('shows loading state while fetching data', async () => {
    vi.mocked(communityReservationsClient.getConfirmedReservations).mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve({
        eventReservations: [],
        therapyReservations: [],
      }), 100))
    );
    render(<AdminReservationsPanel />);
    expect(screen.getByText(/Cargando reservaciones/)).toBeInTheDocument();
  });

  it('shows message when no reservations exist', async () => {
    vi.mocked(communityReservationsClient.getConfirmedReservations).mockResolvedValue({
      eventReservations: [],
      therapyReservations: [],
    });
    render(<AdminReservationsPanel />);
    await waitFor(() => expect(screen.getByText(/No hay reservaciones/)).toBeInTheDocument());
  });

  it('displays event reservations with client and event details', async () => {
    vi.mocked(communityReservationsClient.getConfirmedReservations).mockResolvedValue({
      eventReservations: [{
        id: 'er1',
        createdAt: '2026-08-02T10:00:00Z',
        clientName: 'Juan Pérez',
        clientPhone: '+52 5512345678',
        eventId: 'e1',
        eventTitle: 'Yoga Matutino',
        eventDate: '2026-08-15T08:00:00Z',
        eventLocation: 'Estudio Principal',
      }],
      therapyReservations: [],
    });
    render(<AdminReservationsPanel />);
    await waitFor(() => expect(screen.getByText('Juan Pérez')).toBeInTheDocument());
    expect(screen.getByText(/Yoga Matutino/)).toBeInTheDocument();
    expect(screen.getByText(/Estudio Principal/)).toBeInTheDocument();
    expect(screen.getByText(/\+52 5512345678/)).toBeInTheDocument();
  });

  it('displays therapy reservations with client and therapy details', async () => {
    vi.mocked(communityReservationsClient.getConfirmedReservations).mockResolvedValue({
      eventReservations: [],
      therapyReservations: [{
        id: 'tr1',
        createdAt: '2026-08-02T11:00:00Z',
        clientName: 'María García',
        clientPhone: '+52 5598765432',
        therapyId: 't1',
        therapyTitle: 'Masaje Descontracturante',
        therapyProvider: 'Clínica Aliada',
        therapyDiscountPct: 20,
      }],
    });
    render(<AdminReservationsPanel />);
    await waitFor(() => expect(screen.getByText('María García')).toBeInTheDocument());
    expect(screen.getByText(/Masaje Descontracturante/)).toBeInTheDocument();
    expect(screen.getByText(/Clínica Aliada/)).toBeInTheDocument();
    expect(screen.getByText(/Descuento: 20%/)).toBeInTheDocument();
    expect(screen.getByText(/\+52 5598765432/)).toBeInTheDocument();
  });

  it('handles error state', async () => {
    vi.mocked(communityReservationsClient.getConfirmedReservations).mockRejectedValue(new Error('Error de red'));
    render(<AdminReservationsPanel />);
    await waitFor(() => expect(screen.getByText(/Error de red/)).toBeInTheDocument());
  });
});