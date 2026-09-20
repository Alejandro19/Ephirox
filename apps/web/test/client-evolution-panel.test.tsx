import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithSWR as render } from './swr-test-utils';
import { ClientEvolutionPanel } from '../components/evolution/ClientEvolutionPanel';
import * as evolutionClient from '../lib/evolution-client';
import * as clientsClient from '../lib/clients-client';
import * as wellnessIndexClient from '../lib/wellness-index-client';
import * as cohortClient from '../lib/evolution-cohort-client';
import { PermissionDeniedError } from '../lib/api-client';

vi.mock('../lib/evolution-client');
vi.mock('../lib/clients-client');
vi.mock('../lib/wellness-index-client');
vi.mock('../lib/evolution-cohort-client');

const anthro: evolutionClient.AnthropometricRecord = {
  id: 'a1', clientId: 'client-1', fecha: '2026-07-01', semana: null, mesNum: 1,
  peso: 70, cintura: 80, brazos: 30, hombros: 100, piernas: 55, gluteo: 98, notas: null, createdAt: '2026-07-01T00:00:00Z',
};
const inbodyPrev: evolutionClient.InbodyRecord = {
  id: 'i1', clientId: 'client-1', fecha: '2026-06-01', version: null, pesoTotal: 72, smm: 30, grasaPct: 24,
  imc: null, pesoObjetivo: null, grasaVisceral: null, bmr: null, anguloFase: null, ecwTbw: null, masaOsea: null,
  altura: null, mesNum: 1, fileUrl: null, createdAt: '2026-06-01T00:00:00Z',
};
const inbodyLast: evolutionClient.InbodyRecord = {
  ...inbodyPrev, id: 'i2', fecha: '2026-07-01', pesoTotal: 70, smm: 31, grasaPct: 22, mesNum: 2,
};

function mockFetches({
  clientType = 'coaching_1_1',
  anthropometrics = [anthro],
  inbody = [inbodyPrev, inbodyLast],
  permissions,
}: {
  clientType?: string;
  anthropometrics?: evolutionClient.AnthropometricRecord[];
  inbody?: evolutionClient.InbodyRecord[];
  permissions?: Record<string, boolean>;
} = {}) {
  vi.mocked(evolutionClient.getEvolutionData).mockResolvedValue({ checkins: [], anthropometrics, inbody });
  vi.mocked(clientsClient.fetchClient).mockResolvedValue({
    id: 'client-1', name: 'Ana', email: 'a@x.com', plan: '', status: 'active', clientType,
    trainingDays: 4, objetivos: { peso: 'bajar', grasa_corporal: 'bajar', masa_muscular: 'subir' }, nextCheckinDate: null, inbodyCadenceType: 'mensual',
    permissions,
  });
  vi.mocked(wellnessIndexClient.getWellnessIndex).mockResolvedValue({
    value: 72, previousValue: 64, delta: 8, trend: 'up', componentsUsed: { training: 60, sleep: 80 },
  });
  vi.mocked(wellnessIndexClient.getWellnessIndexHistory).mockResolvedValue({
    typical: 65, points: [{ label: '2026-08-04', value: 60 }, { label: '2026-08-11', value: 72 }],
  });
}

describe('ClientEvolutionPanel', () => {
  it('shows the Índice de rendimiento value and its typical', async () => {
    mockFetches();
    render(<ClientEvolutionPanel clientId="client-1" />);
    expect(await screen.findByText('Índice de rendimiento')).toBeInTheDocument();
    expect(screen.getAllByText('72').length).toBeGreaterThan(0);
    expect(screen.getByText('65')).toBeInTheDocument();
  });

  it('shows the physical evolution sparklines computed from the latest measurement', async () => {
    mockFetches();
    render(<ClientEvolutionPanel clientId="client-1" />);
    expect(await screen.findByText('Evolución física')).toBeInTheDocument();
    expect(screen.getByText('70')).toBeInTheDocument();
    expect(screen.getByText('22')).toBeInTheDocument();
  });

  // spec 29.3 — el filtro por categoría desmonta las demás secciones, no
  // solo las atenúa.
  it('filters to a single category when its chip is clicked, hiding the others entirely', async () => {
    const user = userEvent.setup();
    mockFetches();
    render(<ClientEvolutionPanel clientId="client-1" />);
    await screen.findByText('Índice de rendimiento');
    expect(screen.getByText('Evolución física')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Rendimiento/ }));
    expect(screen.queryByText('Evolución física')).not.toBeInTheDocument();
    expect(screen.getByText('Índice de rendimiento')).toBeInTheDocument();
  });

  it('submits a monthly check-in through the accordion form', async () => {
    const user = userEvent.setup();
    mockFetches();
    vi.mocked(evolutionClient.createCheckin).mockResolvedValue({
      id: 'chk1', clientId: 'client-1', fecha: '2026-08-05', strengthScore: null, moodScore: null,
      confidenceScore: null, securityScore: null, energyScore: null, notes: null, sleepHours: 7,
      adherencePct: 80, painFlag: null, painNotes: null, stressScore: 4, createdAt: '2026-08-05T00:00:00Z',
    });

    render(<ClientEvolutionPanel clientId="client-1" />);
    await user.click(await screen.findByText('Check-in rápido del mes'));
    await user.type(screen.getByLabelText('Horas de sueño promedio'), '7');
    await user.type(screen.getByLabelText('Adherencia al plan (%)'), '80');
    await user.click(screen.getByRole('button', { name: 'Guardar check-in' }));

    await waitFor(() =>
      expect(evolutionClient.createCheckin).toHaveBeenCalledWith(
        'client-1',
        expect.objectContaining({ sleep_hours: 7, adherence_pct: 80 })
      )
    );
  });

  it('shows the generic upgrade card when this client type has no access to Mi Evolución', async () => {
    mockFetches();
    vi.mocked(evolutionClient.getEvolutionData).mockRejectedValue(new PermissionDeniedError('Este módulo no está disponible para tu tipo de cuenta.'));
    render(<ClientEvolutionPanel clientId="client-1" />);
    expect(await screen.findByText('Disponible en Premium')).toBeInTheDocument();
  });

  // spec 28 — la pestaña solo aparece si el propio cliente tiene el permiso.
  it('does not show the "Reporte de mi equipo" tab without the permission', async () => {
    mockFetches();
    render(<ClientEvolutionPanel clientId="client-1" />);
    await screen.findByText('Índice de rendimiento');
    expect(screen.queryByText('Reporte de mi equipo')).not.toBeInTheDocument();
  });

  it('shows the "Reporte de mi equipo" tab and switches to it when the permission is granted', async () => {
    const user = userEvent.setup();
    mockFetches({ permissions: { reporteEquipo: true } });
    vi.mocked(cohortClient.getCohortReport).mockResolvedValue({
      enabled: true, memberCount: 2, atRiskCount: 1, avgRecoveryScore: 60,
      members: [{ label: 'Miembro 1', regulationDeficit: 0, atRisk: true }, { label: 'Miembro 2', regulationDeficit: 0, atRisk: false }],
      atRiskByWeek: [], signalsByPillar: [], avgRegulationByWeek: [], avgRecoveryByWeek: [],
    });

    render(<ClientEvolutionPanel clientId="client-1" />);
    await screen.findByText('Índice de rendimiento');
    const tabButton = screen.getByText('Reporte de mi equipo');
    await user.click(tabButton);

    expect(await screen.findByText('Miembros en el equipo')).toBeInTheDocument();
    expect(screen.queryByText('Índice de rendimiento')).not.toBeInTheDocument();
  });
});
