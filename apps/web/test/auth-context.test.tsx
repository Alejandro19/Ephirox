import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../lib/auth-context';

vi.mock('../lib/api-client', async () => {
  const actual = await vi.importActual<typeof import('../lib/api-client')>('../lib/api-client');
  return {
    ...actual,
    clearSession: vi.fn(),
    fetchAuthMe: vi.fn(),
  };
});

import { fetchAuthMe, clearSession, AuthInvalidError } from '../lib/api-client';

function Probe() {
  const { isLoading, isAuthenticated, role } = useAuth();
  return <div>{isLoading ? 'loading' : `ready:${isAuthenticated}:${role}`}</div>;
}

describe('AuthProvider.refreshAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retries after a transient failure (network/tunnel blip) instead of clearing a fresh session', async () => {
    vi.mocked(fetchAuthMe)
      .mockRejectedValueOnce(new Error('network blip'))
      .mockResolvedValueOnce({ success: true, role: 'cliente', user: { id: '1', name: 'A', email: 'a@a.com' } });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText('ready:true:cliente')).toBeInTheDocument(), { timeout: 3000 });
    expect(fetchAuthMe).toHaveBeenCalledTimes(2);
    expect(clearSession).not.toHaveBeenCalled();
  });

  // Ya no fuerza un redirect a /login (ver auth-context.tsx) — este mismo
  // hook corre en TODAS las páginas, incluida la landing pública, así que un
  // 401 acá es simplemente "no autenticado", no un evento que deba navegar
  // por su cuenta. Las páginas protegidas se cubren solas (middleware.ts del
  // lado del servidor, y AppShell.tsx si el estado cambia ya adentro).
  it('clears the session immediately on an AuthInvalidError (401/403), without retrying or redirecting', async () => {
    vi.mocked(fetchAuthMe).mockRejectedValue(new AuthInvalidError('invalid'));

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText('ready:false:null')).toBeInTheDocument());
    expect(fetchAuthMe).toHaveBeenCalledTimes(1);
    expect(clearSession).toHaveBeenCalled();
  });
});
