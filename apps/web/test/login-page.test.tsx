import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '../app/(auth)/login/page';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    pushMock.mockClear();
    vi.stubGlobal('fetch', vi.fn());
    window.localStorage.clear();
  });

  it('redirects an admin to /admin/clients', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => ({ success: true, token: 'abc.def.ghi', role: 'admin', user: { id: '1', name: 'Admin', email: 'a@a.com' } }),
    });

    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@a.com' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/admin/clients'));
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
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'c@c.com' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/onboarding'));
  });

  it('redirects a client who already completed onboarding to /training', async () => {
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
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'c2@c.com' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/training'));
  });

  it('redirects a lead_wellness client with incomplete onboarding to /training (never to /onboarding)', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => ({
        success: true,
        token: 'abc.def.ghi',
        role: 'cliente',
        user: { id: '4', name: 'Cliente', email: 'c3@c.com' },
        clientType: 'lead_wellness',
        onboardingComplete: false,
      }),
    });

    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'c3@c.com' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/training'));
    expect(pushMock).not.toHaveBeenCalledWith('/onboarding');
  });

  it('shows an error message on failed login', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => ({ success: false, error: 'Credenciales incorrectas.' }),
    });

    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@a.com' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciales incorrectas.');
  });

  it('redirects to /training when a pending NFC confirm action exists, ahead of the onboarding check', async () => {
    window.localStorage.setItem('lt_pending_action', JSON.stringify({ m: 'entrenamiento', a: 'confirmar' }));
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
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'c5@c.com' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/training'));
    expect(pushMock).not.toHaveBeenCalledWith('/onboarding');
  });

  it('shows the confirmation message for a successful membership request (regression: the backend never returns a token here)', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => ({ success: true, pending: true, message: 'Tu cuenta fue creada y quedará activa cuando el administrador la confirme.' }),
    });

    render(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Membresía Premium' }));
    fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: 'Ana López' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ana@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Tu solicitud fue enviada.');
    const registerCall = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.find(([url]) => String(url).includes('/auth/register'));
    const [, options] = registerCall!;
    expect(JSON.parse(options.body)).toMatchObject({ intent: 'membership_request' });
  });

  it('shows an error when the membership request fails', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => ({ success: false, error: 'Ese email ya está registrado.' }),
    });

    render(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Membresía Premium' }));
    fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: 'Ana López' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ana@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Ese email ya está registrado.');
  });

  it('auto-logs in (saves the session token) right after joining as an Explorer (intent="explorer")', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => ({
        success: true,
        token: 'abc.def.ghi',
        role: 'cliente',
        user: { id: '6', name: 'Nueva Exploradora', email: 'explorer@example.com' },
        clientType: 'lead_wellness',
        onboardingComplete: false,
        message: 'Bienvenido al Club como Explorador.',
      }),
    });

    render(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Únete como Explorador' }));
    fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: 'Nueva Exploradora' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'explorer@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Unirme al Club' }));

    await waitFor(() => expect(window.sessionStorage.getItem('latribu_token')).toBe('abc.def.ghi'));
    const registerCall = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.find(([url]) => String(url).includes('/auth/register'));
    const [, options] = registerCall!;
    expect(JSON.parse(options.body)).toMatchObject({ intent: 'explorer' });
  });

  it('shows an error when joining as an Explorer fails', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => ({ success: false, error: 'Ese email ya está registrado.' }),
    });

    render(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Únete como Explorador' }));
    fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: 'Nueva Exploradora' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'explorer@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Unirme al Club' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Ese email ya está registrado.');
  });
});
