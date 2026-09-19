import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminClientsPage from '../app/(app)/admin/clients/page';
import * as blindspotClient from '../lib/blindspot-client';

vi.mock('../lib/clients-client', () => ({
  fetchClients: vi.fn(async () => [
    { id: '1', name: 'Ana Pérez', email: 'ana@example.com', plan: 'Miembro', status: 'active', clientType: 'coaching_1_1' },
  ]),
  createClient: vi.fn(),
}));

vi.mock('../lib/blindspot-client', () => ({
  adminCreateTherapist: vi.fn(),
  adminListTherapists: vi.fn(async () => []),
  adminUpdateTherapist: vi.fn(),
  adminDeleteTherapist: vi.fn(),
}));

vi.mock('../components/layout/AppShell', () => ({
  showToast: vi.fn(),
}));

vi.mock('../lib/enterprise-leads-admin-client', () => ({
  listEnterpriseLeads: vi.fn(async () => []),
  updateEnterpriseLeadEstado: vi.fn(),
}));

vi.mock('../lib/mentors-client', () => ({
  listMentors: vi.fn(async () => []),
  createMentor: vi.fn(),
  updateMentor: vi.fn(),
  deleteMentor: vi.fn(),
}));

vi.mock('../lib/quotes-client', () => ({
  listQuotes: vi.fn(async () => []),
  createQuote: vi.fn(),
  updateQuote: vi.fn(),
  deleteQuote: vi.fn(),
}));

vi.mock('../lib/phrases-client', () => ({
  listPhrases: vi.fn(async () => []),
  createPhrase: vi.fn(),
  updatePhrase: vi.fn(),
  deletePhrase: vi.fn(),
  drawPreviewPhrase: vi.fn(),
}));

describe('AdminClientsPage', () => {
  it('renders the fetched clients in a table', async () => {
    render(<AdminClientsPage />);
    expect(await screen.findByText('Ana Pérez')).toBeInTheDocument();
    expect(screen.getByText('ana@example.com')).toBeInTheDocument();
  });

  it('switches the Nuevo cliente/terapeuta segmented control to Terapeuta and creates one', async () => {
    const user = userEvent.setup();
    vi.mocked(blindspotClient.adminCreateTherapist).mockResolvedValue({
      id: 't1', name: 'Dra. Ríos', email: 'rios@example.com', specialty: 'Biodescodificación', active: true,
    } as blindspotClient.Therapist);

    render(<AdminClientsPage />);
    await screen.findByText('Ana Pérez');

    await user.click(screen.getByRole('button', { name: 'Terapeuta' }));
    expect(screen.getByRole('heading', { name: 'Nuevo terapeuta' })).toBeInTheDocument();
    expect(screen.getByLabelText('Especialidad')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Nombre'), 'Dra. Ríos');
    await user.type(screen.getByLabelText('Email'), 'rios@example.com');
    await user.type(screen.getByLabelText('Contraseña temporal'), 'temporal123');
    await user.type(screen.getByLabelText('Especialidad'), 'Biodescodificación');
    await user.click(screen.getByRole('button', { name: 'Crear terapeuta' }));

    await waitFor(() =>
      expect(blindspotClient.adminCreateTherapist).toHaveBeenCalledWith({
        name: 'Dra. Ríos', email: 'rios@example.com', password: 'temporal123', specialty: 'Biodescodificación',
      })
    );
  });

  // Leads, Mentores y Frases se integraron como pestañas adicionales dentro
  // de Clientes (mismo patrón que "Casos Etiquetados" dentro de Protocolos)
  // — antes eran ítems propios del menú Administration.
  it('shows Leads, Mentores and Frases as additional tabs, in that order, to the right of Clientes', async () => {
    const user = userEvent.setup();
    render(<AdminClientsPage />);
    await screen.findByText('Ana Pérez');

    const tabs = ['Clientes', 'Leads', 'Mentores', 'Frases'];
    expect(tabs.map((label) => screen.getByRole('button', { name: label }))).toHaveLength(4);

    await user.click(screen.getByRole('button', { name: 'Leads' }));
    expect(await screen.findByRole('heading', { name: 'Leads empresariales' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mentores' }));
    expect(await screen.findByRole('heading', { name: 'Mentores' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Frases' }));
    expect(await screen.findByRole('heading', { name: 'Frases de mentalidad' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Frases Card RR.SS' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clientes' }));
    expect(await screen.findByText('Ana Pérez')).toBeInTheDocument();
  });
});
