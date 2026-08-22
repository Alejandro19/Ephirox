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
  } as unknown as ReturnType<typeof useAuth>);
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

  // Acceso no restrictivo (estilo Oura): un cliente vencido ya no ve una
  // pantalla de bloqueo total — sigue viendo el contenido real, con un
  // banner persistente encima (ver MembershipExpiredBanner.tsx).
  it('shows the membership-expired banner alongside the real content, on any route', () => {
    usePathnameMock.mockReturnValue('/training');
    mockExpiredClient();

    render(<AppShell><p>Contenido real</p></AppShell>);

    expect(screen.getByText('Tu membresía está inactiva')).toBeInTheDocument();
    expect(screen.getByText('Contenido real')).toBeInTheDocument();
  });

  it('does not show the banner for a client whose plan is not expired', () => {
    usePathnameMock.mockReturnValue('/training');
    vi.mocked(useAuth).mockReturnValue({
      role: 'cliente', isLoading: false, planExpired: false, planEndDate: '2099-01-01',
      token: 'token-123', user: { id: 'client-1', name: 'Ana', email: 'ana@example.com' },
      clientType: 'coaching_online', onboardingComplete: true, moduleAccess: {}, logout: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);

    render(<AppShell><p>Contenido real</p></AppShell>);

    expect(screen.queryByText('Tu membresía está inactiva')).not.toBeInTheDocument();
  });

  it('the banner\'s "Renovar" link navigates to /configuracion/membresias', () => {
    usePathnameMock.mockReturnValue('/training');
    mockExpiredClient();

    render(<AppShell><p>Contenido real</p></AppShell>);
    screen.getByText('Renovar').click();

    expect(pushMock).toHaveBeenCalledWith('/configuracion/membresias');
  });
});
