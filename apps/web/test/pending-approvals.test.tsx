import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PendingApprovals from '../components/admin/PendingApprovals';
import * as clientsClient from '../lib/clients-client';
import type { ClientSummary } from '../lib/clients-client';

vi.mock('../lib/clients-client', async () => {
  const actual = await vi.importActual<typeof import('../lib/clients-client')>('../lib/clients-client');
  return { ...actual, approveClient: vi.fn(), rejectClient: vi.fn() };
});

vi.mock('../components/layout/AppShell', () => ({ showToast: vi.fn() }));

const ACTIVE: ClientSummary = { id: '1', name: 'Ana Activa', email: 'ana@example.com', plan: 'Miembro', status: 'active', clientType: 'coaching_1_1' };
const PENDING: ClientSummary = { id: '2', name: 'Luis Pendiente', email: 'luis@example.com', plan: 'Miembro', status: 'pending', clientType: 'coaching_1_1' };

describe('PendingApprovals', () => {
  it('no renderiza nada si no hay clientes pendientes', () => {
    const { container } = render(<PendingApprovals clients={[ACTIVE]} onChanged={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('muestra el cliente pendiente con botones Aprobar/Rechazar', () => {
    render(<PendingApprovals clients={[ACTIVE, PENDING]} onChanged={vi.fn()} />);
    expect(screen.getByText('Luis Pendiente')).toBeInTheDocument();
    expect(screen.getByText('luis@example.com')).toBeInTheDocument();
    expect(screen.queryByText('Ana Activa')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aprobar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rechazar' })).toBeInTheDocument();
  });

  it('aprobar llama a approveClient y a onChanged', async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    vi.mocked(clientsClient.approveClient).mockResolvedValue({} as never);
    render(<PendingApprovals clients={[PENDING]} onChanged={onChanged} />);

    await user.click(screen.getByRole('button', { name: 'Aprobar' }));

    await waitFor(() => expect(clientsClient.approveClient).toHaveBeenCalledWith('2'));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it('rechazar llama a rejectClient y a onChanged', async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    vi.mocked(clientsClient.rejectClient).mockResolvedValue({} as never);
    render(<PendingApprovals clients={[PENDING]} onChanged={onChanged} />);

    await user.click(screen.getByRole('button', { name: 'Rechazar' }));

    await waitFor(() => expect(clientsClient.rejectClient).toHaveBeenCalledWith('2'));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });
});
