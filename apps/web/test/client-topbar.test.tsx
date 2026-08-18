import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { render } from '@testing-library/react';
import ClientTopbar from '../components/layout/ClientTopbar';
import { useAuth } from '../lib/auth-context';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, prefetch: vi.fn() }),
}));
vi.mock('../lib/auth-context', () => ({ useAuth: vi.fn() }));
vi.mock('../components/layout/NotificationBell', () => ({ default: () => null }));

function mockAuth() {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 'client-1', name: 'Ana', email: 'a@x.com' },
    clientType: 'coaching_1_1',
    onboardingComplete: true,
    moduleAccess: {},
    logout: vi.fn(),
  } as unknown as ReturnType<typeof useAuth>);
}

describe('ClientTopbar — account dropdown', () => {
  it('shows a "Configuración" item that navigates to /configuracion, separate from "Cerrar sesión"', () => {
    mockAuth();
    render(<ClientTopbar viewKey="training" />);

    fireEvent.click(screen.getByLabelText('Membresía'));

    // El drawer móvil siempre está en el DOM (se oculta con CSS, no se
    // desmonta) — hay una segunda copia de cada botón ahí.
    const settingsButtons = screen.getAllByText('Configuración');
    expect(settingsButtons.length).toBeGreaterThan(0);
    expect(screen.getAllByText('Cerrar sesión').length).toBeGreaterThan(0);

    fireEvent.click(settingsButtons[0]);
    expect(pushMock).toHaveBeenCalledWith('/configuracion');
  });
});
