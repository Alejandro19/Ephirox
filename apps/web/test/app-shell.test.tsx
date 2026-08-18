import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import AppShell from '../components/layout/AppShell';
import { useAuth } from '../lib/auth-context';

vi.mock('../lib/auth-context', () => ({
  useAuth: vi.fn(),
}));

const pushMock = vi.fn();
const usePathnameMock = vi.fn(() => '/training');
vi.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
  useRouter: () => ({ push: pushMock, prefetch: vi.fn() }),
}));

function mockExpiredClient() {
  vi.mocked(useAuth).mockReturnValue({
    role: 'cliente',
    isLoading: false,
    planExpired: true,
    planEndDate: '2020-01-01',
    token: 'token-123',
    user: { id: 'client-1', name: 'Ana', email: 'ana@example.com' },
    clientType: 'coaching_online',
    onboardingComplete: true,
    moduleAccess: {},
    logout: vi.fn(),
  } as ReturnType<typeof useAuth>);
}

describe('AppShell', () => {
  beforeEach(() => {
    pushMock.mockClear();
    usePathnameMock.mockReturnValue('/training');
  });

  it('redirects to /login when auth finished loading and there is no session token', () => {
    vi.mocked(useAuth).mockReturnValue({
      role: null,
      isLoading: false,
      planExpired: false,
      token: null,
    } as ReturnType<typeof useAuth>);

    render(<AppShell>{null}</AppShell>);

    expect(pushMock).toHaveBeenCalledWith('/login');
  });

  it('shows the full plan-expired takeover on any regular route', () => {
    usePathnameMock.mockReturnValue('/training');
    mockExpiredClient();

    render(<AppShell><p>Contenido real</p></AppShell>);

    expect(screen.getByText('Tu plan ha vencido')).toBeInTheDocument();
    expect(screen.queryByText('Contenido real')).not.toBeInTheDocument();
  });

  it('lets an expired client reach /configuracion/membresias instead of the takeover screen', () => {
    usePathnameMock.mockReturnValue('/configuracion/membresias');
    mockExpiredClient();

    render(<AppShell><p>Contenido real</p></AppShell>);

    expect(screen.queryByText('Tu plan ha vencido')).not.toBeInTheDocument();
    expect(screen.getByText('Contenido real')).toBeInTheDocument();
  });

  it('the "Renovar membresía" button on the takeover screen navigates to /configuracion/membresias', () => {
    usePathnameMock.mockReturnValue('/training');
    mockExpiredClient();

    render(<AppShell><p>Contenido real</p></AppShell>);
    screen.getByText('Renovar membresía').click();

    expect(pushMock).toHaveBeenCalledWith('/configuracion/membresias');
  });
});
