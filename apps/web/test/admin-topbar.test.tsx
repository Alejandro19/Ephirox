import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AdminTopbar from '../components/layout/AdminTopbar';
import ThemeRoot from '../components/layout/ThemeRoot';
import { useAuth } from '../lib/auth-context';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/admin/clients',
}));
vi.mock('../lib/auth-context', () => ({ useAuth: vi.fn() }));
vi.mock('../components/layout/NotificationBell', () => ({ default: () => null }));

describe('AdminTopbar', () => {
  it('shows a visible header logout shortcut (spec §7.4) — not just the one inside the account dropdown', () => {
    const logout = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@x.com' },
      logout,
    } as unknown as ReturnType<typeof useAuth>);

    render(
      <ThemeRoot>
        <AdminTopbar viewKey="admin-clients" />
      </ThemeRoot>,
    );

    const logoutButtons = screen.getAllByLabelText('Cerrar sesión');
    expect(logoutButtons.length).toBeGreaterThan(0);
    fireEvent.click(logoutButtons[0]);
    expect(logout).toHaveBeenCalled();
  });

  it('shows the theme toggle (CLARO/OSCURO) — /admin is a toggleable screen, not brand-locked', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@x.com' },
      logout: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);

    render(
      <ThemeRoot>
        <AdminTopbar viewKey="admin-clients" />
      </ThemeRoot>,
    );

    expect(screen.getAllByRole('button', { name: /Modo (claro|carbón)/ }).length).toBeGreaterThan(0);
  });
});
