import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithSWR as render } from './swr-test-utils';
import InicioPage from '../app/(app)/page';
import { useAuth } from '../lib/auth-context';
import * as clientsClient from '../lib/clients-client';
import * as nutritionClient from '../lib/nutrition-client';
import * as wearableClient from '../lib/wearable-client';
import * as sleepClient from '../lib/sleep-client';
import * as evolutionClient from '../lib/evolution-client';
import * as eventsClient from '../lib/events-client';
import * as therapiesClient from '../lib/therapies-client';
import * as retreatsClient from '../lib/retreats-client';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('../lib/auth-context', () => ({ useAuth: vi.fn() }));
vi.mock('../lib/clients-client');
vi.mock('../lib/nutrition-client');
vi.mock('../lib/wearable-client');
vi.mock('../lib/sleep-client');
vi.mock('../lib/evolution-client');
vi.mock('../lib/events-client');
vi.mock('../lib/therapies-client');
vi.mock('../lib/retreats-client');
// MemberCard/WellnessIndexCard tienen sus propias dependencias de fetch —
// se mockean para aislar el test al comportamiento propio de esta página.
vi.mock('../components/member/MemberCard', () => ({ MemberCard: () => null }));
vi.mock('../components/home/WellnessIndexCard', () => ({ WellnessIndexCard: () => null }));

function mockAuth(
  clientType: string | null,
  role: 'admin' | 'cliente' = 'cliente',
  overrides: { moduleAccess?: Record<string, boolean>; planExpired?: boolean } = {}
) {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 'client-1', name: 'Ana', email: 'a@x.com' },
    role,
    clientType,
    onboardingComplete: true,
    moduleAccess: {},
    planExpired: false,
    ...overrides,
  } as ReturnType<typeof useAuth>);
}

function mockNoDataAnywhere() {
  vi.mocked(clientsClient.fetchClient).mockResolvedValue({
    id: 'client-1', name: 'Ana', email: 'a@x.com', plan: '', status: 'active', clientType: 'coaching_1_1',
  });
  vi.mocked(nutritionClient.getNutrition).mockResolvedValue({ plan: {}, meals: [] });
  vi.mocked(wearableClient.getWearableEstado).mockResolvedValue([]);
  vi.mocked(sleepClient.getProtocol).mockResolvedValue(null);
  vi.mocked(evolutionClient.getEvolutionData).mockResolvedValue({ checkins: [], anthropometrics: [], inbody: [] });
  vi.mocked(eventsClient.listEvents).mockResolvedValue([]);
  vi.mocked(therapiesClient.listTherapies).mockResolvedValue([]);
  vi.mocked(retreatsClient.listRetreats).mockResolvedValue([]);
}

describe('InicioPage — quick-access cards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows no quick-access cards for a lead_wellness client, regardless of data', async () => {
    mockAuth('lead_wellness');
    mockNoDataAnywhere();
    render(<InicioPage />);

    await waitFor(() => expect(screen.queryByText('¡Hola, Ana!')).toBeInTheDocument());
    expect(screen.queryByText('Entrenamiento')).not.toBeInTheDocument();
    expect(screen.queryByText('Club Wellness')).not.toBeInTheDocument();
  });

  it('shows no quick-access cards for coaching_1_1 when no module has any data loaded yet', async () => {
    mockAuth('coaching_1_1');
    mockNoDataAnywhere();
    render(<InicioPage />);

    await waitFor(() => expect(nutritionClient.getNutrition).toHaveBeenCalled());
    expect(screen.queryByText('Entrenamiento')).not.toBeInTheDocument();
    expect(screen.queryByText('Nutrición')).not.toBeInTheDocument();
    expect(screen.queryByText('Club Wellness')).not.toBeInTheDocument();
    expect(screen.queryByText('Hackea tu Sueño')).not.toBeInTheDocument();
    expect(screen.queryByText('Mi Evolución')).not.toBeInTheDocument();
  });

  it('shows only the cards with real data for a coaching_online client', async () => {
    mockAuth('coaching_online');
    mockNoDataAnywhere();
    vi.mocked(clientsClient.fetchClient).mockResolvedValue({
      id: 'client-1', name: 'Ana', email: 'a@x.com', plan: '', status: 'active', clientType: 'coaching_online', trainingDays: 4,
    });
    vi.mocked(evolutionClient.getEvolutionData).mockResolvedValue({
      checkins: [{ id: 'c1', clientId: 'client-1', fecha: '2026-08-01' } as evolutionClient.EvolutionCheckin],
      anthropometrics: [],
      inbody: [],
    });

    render(<InicioPage />);

    expect(await screen.findByText('Entrenamiento')).toBeInTheDocument();
    expect(await screen.findByText('Mi Evolución')).toBeInTheDocument();
    expect(screen.queryByText('Nutrición')).not.toBeInTheDocument();
    expect(screen.queryByText('Club Wellness')).not.toBeInTheDocument();
    expect(screen.queryByText('Hackea tu Sueño')).not.toBeInTheDocument();
  });

  it('shows Club Wellness for a mentoring client when there is at least one active published event', async () => {
    mockAuth('mentoring');
    mockNoDataAnywhere();
    vi.mocked(eventsClient.listEvents).mockResolvedValue([
      { id: 'e1', title: 'Ice Bath', description: null, eventDate: '2026-08-20T10:00:00Z', location: null, capacity: null, imageUrl: null, active: true, confirmed_count: 0 },
    ]);

    render(<InicioPage />);

    expect(await screen.findByText('Club Wellness')).toBeInTheDocument();
    expect(screen.queryByText('Entrenamiento')).not.toBeInTheDocument();
  });

  it('shows the admin quick links unchanged, without the data-gating logic', () => {
    mockAuth(null, 'admin');
    render(<InicioPage />);

    expect(screen.getByText('Clientes')).toBeInTheDocument();
    expect(screen.getByText('Frases')).toBeInTheDocument();
    expect(screen.getByText('Club Wellness')).toBeInTheDocument();
    expect(clientsClient.fetchClient).not.toHaveBeenCalled();
  });

  it('forces a card to appear (with "Renueva para continuar") for an expired-but-included module, even with no data — and opens the modal instead of navigating', async () => {
    mockAuth('coaching_1_1', 'cliente', { moduleAccess: { training: true }, planExpired: true });
    mockNoDataAnywhere();
    render(<InicioPage />);

    const trainingCard = await screen.findByText('Entrenamiento');
    expect(screen.getByText('Renueva para continuar')).toBeInTheDocument();

    fireEvent.click(trainingCard);
    expect(screen.getByText('Este módulo está incluido en tu membresía. Renueva tu pago para volver a acceder.')).toBeInTheDocument();
  });
});
