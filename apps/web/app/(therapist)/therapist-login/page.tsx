'use client';

import React, { useEffect, useState, type FormEvent } from 'react';
import { therapistLogin } from '@/lib/blindspot-client';
import { saveSession, forgotPasswordRequest } from '@/lib/api-client';

// Mismo patrón que (auth)/login/page.tsx: paleta fija (sin variante
// día/noche) — el panel izquierdo usa el café oscuro exclusivo de las
// pantallas de login (#2A2015), el derecho siempre claro (--page-bg).
const LOGIN_PANEL_BG = '#2A2015';

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
      <div style={{ position: 'absolute', inset: thickness, borderRadius: '50%', background: LOGIN_PANEL_BG }} />
    </div>
  );
}

// Igual que en el login de clientes: solo se recuerda el email, nunca la
// contraseña — el gestor de contraseñas del navegador ya cubre eso de forma segura.
const REMEMBER_EMAIL_KEY = 'latribu_remember_email_therapist';

export default function TherapistLoginPage(): React.ReactElement {
  const [view, setView] = useState<'login' | 'forgot'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [enteringLabel, setEnteringLabel] = useState<string | null>(null);

  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  useEffect(() => {
    const remembered = typeof window !== 'undefined' ? window.localStorage.getItem(REMEMBER_EMAIL_KEY) : null;
    if (remembered) {
      setEmail(remembered);
      setRememberMe(true);
    }
  }, []);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setLoading(true);
    let navigating = false;
    try {
      const { token, mustChangePassword } = await therapistLogin(email, password);
      if (typeof window !== 'undefined') {
        if (rememberMe) {
          window.localStorage.setItem(REMEMBER_EMAIL_KEY, email);
        } else {
          window.localStorage.removeItem(REMEMBER_EMAIL_KEY);
        }
      }
      saveSession(token);
      setEnteringLabel('Cargando sesión…');
      navigating = true;
      window.location.href = mustChangePassword ? '/therapist/set-password' : '/therapist';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión.');
    } finally {
      if (!navigating) setLoading(false);
    }
  }

  async function handleForgotPassword(e: FormEvent): Promise<void> {
    e.preventDefault();
    setForgotError(null);
    setForgotLoading(true);
    try {
      const result = await forgotPasswordRequest(forgotEmail);
      if (!result.success) {
        setForgotError(result.error || 'No se pudo procesar la solicitud.');
        return;
      }
      setForgotSent(true);
    } catch {
      setForgotError('Error de conexión. Intenta de nuevo.');
    } finally {
      setForgotLoading(false);
    }
  }

  const inputClasses =
    'block w-full h-9 border-0 border-b border-[var(--border-input)] rounded-none bg-transparent px-0.5 py-1.5 text-[14px] text-[var(--ink)] outline-none transition-colors placeholder:text-[var(--ink-secondary)] placeholder:opacity-60 focus:border-[var(--ink)]';
  const labelClasses = 'block text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-secondary)]';
  const primaryButtonClasses =
    'relative inline-flex w-full items-center justify-center h-11 rounded-[9px] font-semibold tracking-wide transition-all duration-200 ease-out active:scale-[0.98] active:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 gap-2';
  const primaryButtonStyle = { background: LOGIN_PANEL_BG, color: '#F5EFE2' };
  const linkClasses = 'underline underline-offset-4 font-medium text-sm hover:opacity-80 transition-opacity';
  const linkStyle = { color: 'var(--hero-piedra-accent)' };

  return (
    <>
      {enteringLabel && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-[var(--page-bg)]">
          <svg className="animate-spin" viewBox="0 0 100 100" width="64" height="64" aria-hidden="true" style={{ animationDuration: '1.4s' }}>
            <circle cx="50" cy="50" r="40" fill="none" strokeWidth="8" strokeLinecap="round" strokeDasharray="76 176" strokeDashoffset="0" opacity=".7" stroke="var(--ring-morning)" />
            <circle cx="50" cy="50" r="40" fill="none" strokeWidth="8" strokeLinecap="round" strokeDasharray="76 176" strokeDashoffset="-83.8" opacity=".7" stroke="var(--ring-afternoon)" />
            <circle cx="50" cy="50" r="40" fill="none" strokeWidth="8" strokeLinecap="round" strokeDasharray="76 176" strokeDashoffset="-167.6" opacity=".7" stroke="var(--ring-evening)" />
          </svg>
          <div className="flex flex-col items-center gap-1">
            <p className="font-serif text-xl font-bold text-[var(--ink)]">La Tribu</p>
            <p className="text-sm text-[var(--ink-secondary)]">{enteringLabel}</p>
          </div>
        </div>
      )}

      <div className="min-h-screen w-full bg-[var(--page-bg)] flex items-center justify-center p-4">
        {/* md:min-h fija el mismo tamaño estándar de tarjeta que el login de clientes. */}
        <div className="max-w-4xl w-full md:min-h-[600px] grid grid-cols-1 md:grid-cols-2 rounded-[20px] overflow-hidden shadow-[0_20px_50px_rgba(26,23,18,0.12)]">

          {/* ========== LADO IZQUIERDO — IDENTIDAD LA TRIBU ========== */}
          <div className="relative overflow-hidden p-12 flex flex-col items-center justify-center text-center" style={{ background: LOGIN_PANEL_BG }}>
            <div
              className="pointer-events-none absolute rounded-full"
              style={{ width: 260, height: 260, background: 'radial-gradient(circle, rgba(217,183,126,.22) 0%, transparent 70%)' }}
            />
            <BrandRing size={64} />
            <h1 className="relative z-[1] font-serif text-2xl font-bold mt-[18px] mb-1.5" style={{ color: '#F5EFE2' }}>La Tribu</h1>
            <p className="relative z-[1] font-serif italic text-[12.5px]" style={{ color: '#B0A296' }}>Club de bienestar y alto rendimiento.</p>
          </div>

          {/* ========== LADO DERECHO — FORMULARIO ========== */}
          <div className="p-12 flex flex-col justify-center" style={{ background: 'var(--page-bg)' }}>
            <h2 className="font-serif text-[19px] font-semibold mb-6" style={{ color: 'var(--ink)' }}>
              {view === 'login' ? 'Acceso terapeutas' : 'Recuperar contraseña'}
            </h2>

            {view === 'forgot' ? (
              <form onSubmit={handleForgotPassword} className="w-full space-y-4" noValidate>
                {forgotError && (
                  <div role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {forgotError}
                  </div>
                )}
                {forgotSent ? (
                  <div role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
                    Si el correo existe, enviaremos instrucciones para restablecer tu contraseña.
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <label htmlFor="therapist-forgot-email" className={labelClasses}>Email</label>
                      <input
                        id="therapist-forgot-email"
                        type="email"
                        autoComplete="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="tucorreo@ejemplo.com"
                        className={inputClasses}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className={primaryButtonClasses}
                      style={primaryButtonStyle}
                    >
                      {forgotLoading ? 'Enviando…' : 'Enviar instrucciones'}
                    </button>
                  </>
                )}
                <div className="text-center mt-6">
                  <button
                    type="button"
                    onClick={() => { setView('login'); setForgotError(null); setForgotSent(false); }}
                    className={linkClasses}
                    style={linkStyle}
                  >
                    Volver a iniciar sesión
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="w-full space-y-4" noValidate>
                {error && (
                  <div role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {error}
                  </div>
                )}
                <div className="space-y-1.5">
                  <label htmlFor="therapist-email" className={labelClasses}>Email</label>
                  <input
                    id="therapist-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tucorreo@ejemplo.com"
                    className={inputClasses}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="therapist-password" className={labelClasses}>Contraseña</label>
                  <input
                    id="therapist-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={inputClasses}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none" style={{ color: 'var(--ink-secondary)' }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-[var(--border-input)]"
                    style={{ accentColor: LOGIN_PANEL_BG }}
                  />
                  Recuérdame
                </label>
                <button
                  type="submit"
                  disabled={loading}
                  className={primaryButtonClasses}
                  style={primaryButtonStyle}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Ingresando…
                    </span>
                  ) : (
                    'Entrar'
                  )}
                </button>

                <div className="text-center mt-4 text-sm" style={{ color: 'var(--ink-secondary)' }}>
                  ¿Olvidaste tu contraseña?{' '}
                  <button
                    type="button"
                    onClick={() => { setView('forgot'); setError(null); }}
                    className={linkClasses}
                    style={linkStyle}
                  >
                    Recupérala
                  </button>
                </div>
              </form>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
