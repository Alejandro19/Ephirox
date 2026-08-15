import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import AppShell from '../components/layout/AppShell';
import { useAuth } from '../lib/auth-context';

vi.mock('../lib/auth-context', () => ({
  useAuth: vi.fn(),
}));

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => '/training',
  useRouter: () => ({ push: pushMock }),
}));

describe('AppShell', () => {
  beforeEach(() => {
    pushMock.mockClear();
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
});
