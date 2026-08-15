import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithSWR as render } from './swr-test-utils';
import { MemberCard } from '../components/member/MemberCard';
import * as clientsClient from '../lib/clients-client';

vi.mock('../lib/clients-client');

describe('MemberCard', () => {
  it('shows the member number, type, and join date for an active client', async () => {
    vi.mocked(clientsClient.fetchClient).mockResolvedValue({
      id: 'client-1',
      name: 'Ana López',
      email: 'ana@example.com',
      plan: 'Miembro',
      status: 'active',
      clientType: 'mentoring',
      memberNumber: 142,
      activatedAt: '2026-03-05T12:00:00.000Z',
    });
    render(<MemberCard clientId="client-1" />);
    expect(await screen.findByText('Ana López')).toBeInTheDocument();
    expect(screen.getByText('Miembro N.° 00142')).toBeInTheDocument();
    expect(screen.getByText('Club Elite')).toBeInTheDocument();
  });

  it('renders nothing for a client that is not active yet', async () => {
    vi.mocked(clientsClient.fetchClient).mockResolvedValue({
      id: 'client-2',
      name: 'Pending Client',
      email: 'pending@example.com',
      plan: 'Miembro',
      status: 'inactive',
      clientType: 'lead_wellness',
      memberNumber: null,
      activatedAt: null,
    });
    const { container } = render(<MemberCard clientId="client-2" />);
    await waitFor(() => expect(clientsClient.fetchClient).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
