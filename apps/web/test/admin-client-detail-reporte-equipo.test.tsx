import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithSWR as render } from './swr-test-utils';
import AdminClientDetail from '../components/admin/AdminClientDetail';
import * as clientsClient from '../lib/clients-client';
import * as personalInfoClient from '../lib/personal-info-client';
import type { PersonalInfo } from '../lib/personal-info-client';
import * as labPanelsClient from '../lib/lab-panels-client';
import * as checkinsClient from '../lib/checkins-client';

vi.mock('../lib/clients-client');
vi.mock('../lib/personal-info-client');
vi.mock('../lib/lab-panels-client');
vi.mock('../lib/checkins-client');
vi.mock('../lib/onboarding-client', () => ({ putPersonalInfo: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const MENTORING_CLIENT: clientsClient.ClientDetail = {
  id: 'client-1', name: 'Camila Ruiz', email: 'camila@example.com', plan: 'mentoring',
  status: 'active', clientType: 'mentoring', permissions: {},
} as clientsClient.ClientDetail;

function mockFetches(permissions: Record<string, boolean> = {}, cohortLeaderId: string | null = null) {
  vi.mocked(clientsClient.fetchClient).mockResolvedValue({ ...MENTORING_CLIENT, permissions, cohortLeaderId });
  vi.mocked(clientsClient.fetchMembershipPayments).mockResolvedValue([]);
  vi.mocked(clientsClient.fetchClients).mockResolvedValue([
    { ...MENTORING_CLIENT, id: 'client-1' },
    { ...MENTORING_CLIENT, id: 'leader-1', name: 'Líder de equipo' },
    { id: 'coaching-1', name: 'No Mentoría', email: 'x@x.com', plan: '', status: 'active', clientType: 'coaching_1_1' },
  ]);
  vi.mocked(personalInfoClient.getPersonalInfo).mockResolvedValue(null as unknown as PersonalInfo);
  vi.mocked(labPanelsClient.listLabPanels).mockResolvedValue([]);
  vi.mocked(checkinsClient.getCheckinsStatus).mockResolvedValue({
    dailyDoneToday: false, weeklyDueThisWeek: false, periodConfirmationDue: false,
    lastResponseAt: null, dailyStreakDays: 0, weeklyStreakWeeks: 0, weeklyRitualWindowOpen: false,
  });
}

// Spec 28: campo nuevo de admin, por-cliente, para habilitar/deshabilitar
// quién puede ver "Reporte de mi equipo" en Evolution.
describe('AdminClientDetail — "Reporte de mi equipo" toggle', () => {
  it('shows the toggle unchecked by default for a mentoring client without the permission', async () => {
    mockFetches({});
    render(<AdminClientDetail clientId="client-1" />);
    const checkbox = await screen.findByRole('checkbox', { name: /puede ver "Reporte de mi equipo"/i });
    expect(checkbox).not.toBeChecked();
  });

  it('shows it checked when the client already has the permission', async () => {
    mockFetches({ reporteEquipo: true });
    render(<AdminClientDetail clientId="client-1" />);
    const checkbox = await screen.findByRole('checkbox', { name: /puede ver "Reporte de mi equipo"/i });
    expect(checkbox).toBeChecked();
  });

  it('calls updateClientPermissions with reporteEquipo:true when checked', async () => {
    const user = userEvent.setup();
    mockFetches({});
    vi.mocked(clientsClient.updateClientPermissions).mockResolvedValue({ ...MENTORING_CLIENT, permissions: { reporteEquipo: true } });

    render(<AdminClientDetail clientId="client-1" />);
    const checkbox = await screen.findByRole('checkbox', { name: /puede ver "Reporte de mi equipo"/i });
    await user.click(checkbox);

    expect(clientsClient.updateClientPermissions).toHaveBeenCalledWith('client-1', { reporteEquipo: true });
  });

  // Regresión: PATCH /:id/permissions reemplaza el jsonb completo (no lo
  // mergea) — si no se manda el resto de permisos existentes, se pierden.
  it('merges with the client\'s existing permissions instead of overwriting them', async () => {
    const user = userEvent.setup();
    mockFetches({ stress: true, evolution: true });
    vi.mocked(clientsClient.updateClientPermissions).mockResolvedValue(MENTORING_CLIENT);

    render(<AdminClientDetail clientId="client-1" />);
    const checkbox = await screen.findByRole('checkbox', { name: /puede ver "Reporte de mi equipo"/i });
    await user.click(checkbox);

    expect(clientsClient.updateClientPermissions).toHaveBeenCalledWith('client-1', {
      stress: true, evolution: true, reporteEquipo: true,
    });
  });
});

// Spec 28: agrupación de cohorte — a qué líder pertenece este cliente,
// separado del toggle de arriba (ese habilita VER el reporte; esto agrupa
// a los miembros del equipo).
describe('AdminClientDetail — cohort leader selector', () => {
  it('excludes itself and non-mentoring clients from the leader options', async () => {
    mockFetches({}, null);
    render(<AdminClientDetail clientId="client-1" />);
    await screen.findByText('Líder de equipo');
    const select = screen.getByLabelText('Pertenece al equipo de');
    expect(screen.queryByText('No Mentoría')).not.toBeInTheDocument();
    expect(select).toHaveValue('');
  });

  it('shows the currently assigned leader selected', async () => {
    mockFetches({}, 'leader-1');
    render(<AdminClientDetail clientId="client-1" />);
    await screen.findByText('Líder de equipo');
    const select = screen.getByLabelText('Pertenece al equipo de');
    expect(select).toHaveValue('leader-1');
  });

  it('calls updateClientCohortLeader when a leader is chosen', async () => {
    const user = userEvent.setup();
    mockFetches({}, null);
    vi.mocked(clientsClient.updateClientCohortLeader).mockResolvedValue({ ...MENTORING_CLIENT, cohortLeaderId: 'leader-1' });

    render(<AdminClientDetail clientId="client-1" />);
    await screen.findByText('Líder de equipo');
    const select = screen.getByLabelText('Pertenece al equipo de');
    await user.selectOptions(select, 'leader-1');

    expect(clientsClient.updateClientCohortLeader).toHaveBeenCalledWith('client-1', 'leader-1');
  });
});
