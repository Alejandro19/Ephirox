import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '../app/(auth)/login/page';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

// AceptacionRegistro tiene su propia lógica de scroll/casillas (no viable en
// jsdom) — se mockea con un stub mínimo que replica el único contrato que
// importa para estas pruebas: `onComplete` es awaited y, si rechaza, el
// error se muestra inline (mismo patrón que el componente real), sin pasar
// nunca a una pantalla de "éxito" falsa.
vi.mock('@/components/auth/AceptacionRegistro', () => ({
  default: ({ onComplete }: { onComplete: (payload: unknown) => Promise<void> }) => {
    const [error, setError] = useState<string | null>(null);
    return (
      <div>
        <button
          type="button"
          onClick={async () => {
            setError(null);
            try {
              await onComplete({
                dataPolicyVersion: 'v0.1-borrador',
                termsVersion: 'v0.1-borrador',
                acceptedAt: '2026-08-19T00:00:00.000Z',
                sensitiveDataConsent: true,
              });
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Error');
            }
          }}
        >
          Aceptar y continuar (mock)
        </button>
        {error && <div role="alert">{error}</div>}
      </div>
    );
  },
}));

describe('LoginPage', () => {
  beforeEach(() => {
    pushMock.mockClear();
    vi.stubGlobal('fetch', vi.fn());
    window.localStorage.clear();
    window.sessionStorage.clear();
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

  it('shows the AceptacionRegistro step (not the network) right after submitting the membership request form, then completes it on consent', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => ({ success: true, pending: true, message: 'Tu cuenta fue creada y quedará activa cuando el administrador la confirme.' }),
    });

    render(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Membresía Premium' }));
    fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: 'Ana López' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ana@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));

    // El paso legal es obligatorio antes de crear la cuenta — todavía no
    // debería haberse llamado a /auth/register.
    const calledRegisterBeforeConsent = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url).includes('/auth/register'));
    expect(calledRegisterBeforeConsent).toBe(false);

    fireEvent.click(await screen.findByRole('button', { name: 'Aceptar y continuar (mock)' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Tu solicitud fue enviada.');
    const registerCall = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.find(([url]) => String(url).includes('/auth/register'));
    const [, options] = registerCall!;
    const body = JSON.parse(options.body);
    expect(body).toMatchObject({ intent: 'membership_request', name: 'Ana López', email: 'ana@example.com' });
    expect(body.legalAcceptance).toMatchObject({ sensitiveDataConsent: true, dataPolicyVersion: 'v0.1-borrador' });
  });

  it('shows an error when the membership request fails (after accepting the legal terms)', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => ({ success: false, error: 'Ese email ya está registrado.' }),
    });

    render(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Membresía Premium' }));
    fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: 'Ana López' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ana@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Aceptar y continuar (mock)' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Ese email ya está registrado.');
  });

  it('auto-logs in (saves the session token) right after accepting the legal terms as an Explorer (intent="explorer")', async () => {
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

    const calledRegisterBeforeConsent = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => String(url).includes('/auth/register'));
    expect(calledRegisterBeforeConsent).toBe(false);
    expect(window.sessionStorage.getItem('latribu_token')).toBeNull();

    fireEvent.click(await screen.findByRole('button', { name: 'Aceptar y continuar (mock)' }));

    await waitFor(() => expect(window.sessionStorage.getItem('latribu_token')).toBe('abc.def.ghi'));
    const registerCall = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.find(([url]) => String(url).includes('/auth/register'));
    const [, options] = registerCall!;
    const body = JSON.parse(options.body);
    expect(body).toMatchObject({ intent: 'explorer' });
    expect(body.legalAcceptance).toMatchObject({ sensitiveDataConsent: true, termsVersion: 'v0.1-borrador' });
  });

  it('shows an error when joining as an Explorer fails (after accepting the legal terms)', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => ({ success: false, error: 'Ese email ya está registrado.' }),
    });

    render(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Únete como Explorador' }));
    fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: 'Nueva Exploradora' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'explorer@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Unirme al Club' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Aceptar y continuar (mock)' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Ese email ya está registrado.');
  });
});
