import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SupplementsPage from '../app/(app)/supplements/page';

vi.mock('../lib/auth-context', () => ({
  useAuth: vi.fn(() => ({
    isLoading: false,
    isAuthenticated: true,
    user: { id: 'client-1', name: 'Cliente', email: 'cliente@example.com' },
  })),
}));
vi.mock('../lib/supplements-client', () => ({
  listSupplements: vi.fn().mockResolvedValue([]),
}));

describe('SupplementsPage', () => {
  it('renders the supplements heading', () => {
    render(<SupplementsPage />);
    expect(screen.getByRole('heading', { name: 'Suplementación' })).toBeInTheDocument();
  });
});
