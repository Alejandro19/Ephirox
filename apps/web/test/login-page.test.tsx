import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '../app/(auth)/login/page';

describe('LoginPage', () => {
  let capturedHref: string | null;
  const realLocation = window.location;

  // jsdom no deja redefinir location.href directamente (no configurable) —
  // se reemplaza todo el objeto por un stub que delega pathname/search al
  // valor fijado acá, y captura los intentos de navegación (href = ...) sin
  // que jsdom tire "Not implemented: navigation" (mismo patrón que
  // set-password-page.test.tsx). El login manda vía window.location.href
  // (no router.push) desde que la sesión pasó a cookie httpOnly — el token
  // ya no se puede leer del lado cliente para decidir la ruta y navegar sin
  // recargar.
  function setSearch(search: string) {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { pathname: '/login', search, get href() { return capturedHref ?? '/login' + search; }, set href(v: string) { capturedHref = v; } },
    });
  }

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    window.localStorage.clear();
    window.sessionStorage.clear();
    capturedHref = null;
    setSearch('');
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
  });

  it('redirects an admin to /admin/clients', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => ({ success: true, token: 'abc.def.ghi', role: 'admin', user: { id: '1', name: 'Admin', email: 'a@a.com' } }),
    });

    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText('EMAIL'), { target: { value: 'a@a.com' } });
    fireEvent.change(screen.getByLabelText('CONTRASEÑA'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => expect(capturedHref).toBe('/admin/clients'));
  });

  it('redirects a client with an incomplete onboarding to /onboarding', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => ({
        success: true,
        token: 'abc.def.ghi',
        role: 'cliente',
        user: { id: '2', name: 'Cliente', email: 'c@c.com' },
        onboardingComplete: false,
      }),
    });

    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText('EMAIL'), { target: { value: 'c@c.com' } });
    fireEvent.change(screen.getByLabelText('CONTRASEÑA'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => expect(capturedHref).toBe('/onboarding'));
  });

  it('redirects a client who already completed onboarding to the home screen ("/"), never a specific module', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => ({
        success: true,
        token: 'abc.def.ghi',
        role: 'cliente',
        user: { id: '3', name: 'Cliente', email: 'c2@c.com' },
        onboardingComplete: true,
      }),
    });

    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText('EMAIL'), { target: { value: 'c2@c.com' } });
    fireEvent.change(screen.getByLabelText('CONTRASEÑA'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => expect(capturedHref).toBe('/'));
  });

  it('sends a client with a temporary password to /set-password before anything else, preserving the deep link', async () => {
    setSearch('?from=%2Ftraining%3Fm%3Dentrenamiento%26a%3Dconfirmar');
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => ({
        success: true,
        token: 'abc.def.ghi',
        role: 'cliente',
        user: { id: '4', name: 'Cliente', email: 'c4@c.com' },
        onboardingComplete: true,
        mustChangePassword: true,
      }),
    });

    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText('EMAIL'), { target: { value: 'c4@c.com' } });
    fireEvent.change(screen.getByLabelText('CONTRASEÑA'), { target: { value: 'temp' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => expect(capturedHref).toBe('/set-password?from=%2Ftraining%3Fm%3Dentrenamiento%26a%3Dconfirmar'));
  });

  it('shows an error message on failed login', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => ({ success: false, error: 'Credenciales incorrectas.' }),
    });

    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText('EMAIL'), { target: { value: 'a@a.com' } });
    fireEvent.change(screen.getByLabelText('CONTRASEÑA'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciales incorrectas.');
  });

  it('redirects to the original deep-link target (?from=, set by the middleware) ahead of the onboarding check', async () => {
    setSearch('?from=%2Ftraining%3Fm%3Dentrenamiento%26a%3Dconfirmar');
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => ({
        success: true,
        token: 'abc.def.ghi',
        role: 'cliente',
        user: { id: '5', name: 'Cliente', email: 'c5@c.com' },
        onboardingComplete: false,
      }),
    });

    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText('EMAIL'), { target: { value: 'c5@c.com' } });
    fireEvent.change(screen.getByLabelText('CONTRASEÑA'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => expect(capturedHref).toBe('/training?m=entrenamiento&a=confirmar'));
    expect(capturedHref).not.toBe('/onboarding');
  });
});
