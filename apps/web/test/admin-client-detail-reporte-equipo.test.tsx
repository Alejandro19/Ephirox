import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminClientDetail from '../components/admin/AdminClientDetail';
import * as clientsClient from '../lib/clients-client';
import * as personalInfoClient from '../lib/personal-info-client';
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

function mockFetches(permissions: Record<string, boolean> = {}) {
  vi.mocked(clientsClient.fetchClient).mockResolvedValue({ ...MENTORING_CLIENT, permissions });
  vi.mocked(clientsClient.fetchMembershipPayments).mockResolvedValue([]);
  vi.mocked(personalInfoClient.getPersonalInfo).mockResolvedValue(null);
  vi.mocked(labPanelsClient.listLabPanels).mockResolvedValue([]);
  vi.mocked(checkinsClient.getCheckinsStatus).mockResolvedValue({ lastResponseAt: null });
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
