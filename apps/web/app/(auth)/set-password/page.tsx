'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { getSessionToken, saveSession, changePasswordRequest } from '@/lib/api-client';
import { getSafeRedirectTarget } from '@/lib/login-redirect';

// Mismo patrón visual que (auth)/login: paleta fija (sin variante día/noche)
// — el panel izquierdo usa el café oscuro exclusivo de las pantallas de
// login/contraseña (#2A2015), el derecho siempre claro (--page-bg). A esta
// página llega un cliente al que el admin le asignó una contraseña temporal
// (ver AdminClientList → checkbox "Contraseña temporal"), redirigido acá
// desde (auth)/login justo después de autenticarse con esa contraseña.
const PANEL_BG = '#2A2015';

function BrandRing({ size = 64 }: { size?: number }) {
  const thickness = Math.round(size * 0.125);
  return (
    <div className="relative z-[1]" style={{ width: size, height: size }}>
      <div
        style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: 'conic-gradient(from 0deg, #D9B77E, #D97E5F, #8A5FA0, #5B8F6B, #D9B77E)',
        }}
      />
      <div style={{ position: 'absolute', inset: thickness, borderRadius: '50%', background: PANEL_BG }} />
    </div>
  );
}

export default function SetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!getSessionToken()) {
      window.location.href = '/login';
      return;
    }
    setReady(true);
  }, []);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setLoading(true);
    try {
      const result = await changePasswordRequest(currentPassword, newPassword);
      if (!result.success) {
        setError(result.error || 'No se pudo actualizar la contraseña.');
        return;
      }
      if (result.token) saveSession(result.token);
      window.location.href = getSafeRedirectTarget();
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  if (!ready) return null;

  const inputClasses =
    'block w-full h-9 border-0 border-b border-[var(--border-input)] rounded-none bg-transparent px-0.5 py-1.5 text-[14px] text-[var(--ink)] outline-none transition-colors placeholder:text-[var(--ink-secondary)] placeholder:opacity-60 focus:border-[var(--ink)]';
  const labelClasses = 'block text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-secondary)]';
  const primaryButtonClasses =
    'relative inline-flex w-full items-center justify-center h-11 rounded-[9px] font-semibold tracking-wide transition-all duration-200 ease-out active:scale-[0.98] active:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 gap-2';
  const primaryButtonStyle = { background: PANEL_BG, color: '#F5EFE2' };

  return (
    <div className="min-h-screen w-full bg-[var(--page-bg)] flex items-center justify-center p-4">
      <div className="max-w-4xl w-full md:min-h-[600px] grid grid-cols-1 md:grid-cols-2 rounded-[20px] overflow-hidden shadow-[0_20px_50px_rgba(26,23,18,0.12)]">
        <div className="relative overflow-hidden p-12 flex flex-col items-center justify-center text-center" style={{ background: PANEL_BG }}>
          <div
            className="pointer-events-none absolute rounded-full"
            style={{ width: 260, height: 260, background: 'radial-gradient(circle, rgba(217,183,126,.22) 0%, transparent 70%)' }}
          />
          <BrandRing size={64} />
          <h1 className="relative z-[1] font-serif text-2xl font-bold mt-[18px] mb-1.5" style={{ color: '#F5EFE2' }}>La Tribu</h1>
          <p className="relative z-[1] font-serif italic text-[12.5px]" style={{ color: '#B0A296' }}>Comunidad de bienestar y alto rendimiento.</p>
        </div>

        <div className="p-12 flex flex-col justify-center" style={{ background: 'var(--page-bg)' }}>
          <h2 className="font-serif text-[19px] font-semibold mb-1.5" style={{ color: 'var(--ink)' }}>Crea tu contraseña</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--ink-secondary)' }}>
            Tu acceso fue creado con una contraseña temporal. Antes de continuar, define una definitiva.
          </p>
          <form onSubmit={handleSubmit} className="w-full space-y-4" noValidate>
            {error && (
              <div role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <label htmlFor="set-password-current" className={labelClasses}>Contraseña temporal</label>
              <input
                id="set-password-current"
                type="password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="La que te asignaron"
                className={inputClasses}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="set-password-new" className={labelClasses}>Nueva contraseña</label>
              <input
                id="set-password-new"
                type="password"
                autoComplete="new-password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className={inputClasses}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="set-password-confirm" className={labelClasses}>Confirmar contraseña</label>
              <input
                id="set-password-confirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite tu contraseña"
                className={inputClasses}
              />
            </div>
            <button type="submit" disabled={loading} className={primaryButtonClasses} style={primaryButtonStyle}>
              {loading ? 'Guardando…' : 'Guardar y continuar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
