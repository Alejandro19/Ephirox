'use client';

import React, { useEffect, useState, type FormEvent } from 'react';
import { therapistLogin } from '@/lib/blindspot-client';
import { saveSession, forgotPasswordRequest } from '@/lib/api-client';

// Mismo patrón autocontenido que (auth)/login/page.tsx: tema día/noche por
// hora real del dispositivo, fijado antes del primer pintado para evitar
// flash del tema equivocado.
const LOGIN_THEME_SCRIPT = `(function(){try{
  var h=new Date().getHours();
  var theme=h<18?'theme-login-light':'theme-login-dark';
  var other=theme==='theme-login-light'?'theme-login-dark':'theme-login-light';
  var root=document.documentElement;
  if(!root.classList.contains(theme))root.classList.add(theme);
  root.classList.remove(other);
}catch(e){}})();`;

function applyLoginTheme(): void {
  const hour = new Date().getHours();
  const theme = hour < 18 ? 'theme-login-light' : 'theme-login-dark';
  const other = theme === 'theme-login-light' ? 'theme-login-dark' : 'theme-login-light';
  const root = document.documentElement;
  if (!root.classList.contains(theme)) root.classList.add(theme);
  root.classList.remove(other);
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
    applyLoginTheme();
    const interval = setInterval(applyLoginTheme, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

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
    'block w-full h-11 rounded-xl px-4 text-sm transition-all duration-200 ease-in-out outline-none bg-[var(--lf-input-bg)] border border-[var(--lf-input-border)] text-[var(--lf-input-text)] placeholder:text-[var(--lf-label)] placeholder:opacity-60 focus:border-[var(--lf-link)] focus:ring-4 focus:ring-[var(--lf-link)]/10';
  const labelClasses = 'block text-sm font-medium text-[var(--lf-label)] transition-colors duration-[600ms]';

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script dangerouslySetInnerHTML={{ __html: LOGIN_THEME_SCRIPT }} />

      {enteringLabel && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-[var(--cream)]">
          <svg className="animate-spin" viewBox="0 0 100 100" width="64" height="64" aria-hidden="true" style={{ animationDuration: '1.4s' }}>
            <circle cx="50" cy="50" r="40" fill="none" strokeWidth="8" strokeLinecap="round" strokeDasharray="76 176" strokeDashoffset="0" opacity=".7" stroke="var(--ring-morning)" />
            <circle cx="50" cy="50" r="40" fill="none" strokeWidth="8" strokeLinecap="round" strokeDasharray="76 176" strokeDashoffset="-83.8" opacity=".7" stroke="var(--ring-afternoon)" />
            <circle cx="50" cy="50" r="40" fill="none" strokeWidth="8" strokeLinecap="round" strokeDasharray="76 176" strokeDashoffset="-167.6" opacity=".7" stroke="var(--ring-evening)" />
          </svg>
          <div className="flex flex-col items-center gap-1">
            <p className="font-serif text-xl font-bold text-[var(--ink)]">La Tribu</p>
            <p className="text-sm text-[var(--ink-soft)]">{enteringLabel}</p>
          </div>
        </div>
      )}

      <div className="min-h-screen w-full bg-[var(--cream)] flex items-center justify-center p-4">
        {/* md:min-h fija el mismo tamaño estándar de tarjeta que el login de clientes. */}
        <div className="max-w-4xl w-full md:min-h-[600px] grid grid-cols-1 md:grid-cols-2 rounded-3xl overflow-hidden shadow-[0_30px_80px_-15px_rgba(43,36,32,0.18)]">

          {/* ========== LADO IZQUIERDO — IDENTIDAD LA TRIBU ========== */}
          <div className="relative overflow-hidden p-12 flex flex-col items-center justify-center text-center bg-[var(--lh-bg)] transition-colors duration-[600ms]">
            <div className="absolute w-[280px] h-[280px] rounded-full blur-[50px] opacity-40 pointer-events-none -top-[70px] -left-[70px]" style={{ background: '#D9A441' }} />
            <div className="absolute w-[280px] h-[280px] rounded-full blur-[50px] opacity-40 pointer-events-none -bottom-[90px] left-[28%]" style={{ background: '#7C8B6F' }} />
            <div className="absolute w-[280px] h-[280px] rounded-full blur-[50px] opacity-40 pointer-events-none top-[15%] -right-[90px]" style={{ background: '#8A5FA0' }} />

            <svg className="relative z-[1] -rotate-90" viewBox="0 0 100 100" width="56" height="56" aria-hidden="true">
              <circle cx="50" cy="50" r="40" fill="none" strokeWidth="8" strokeLinecap="round" strokeDasharray="76 176" strokeDashoffset="0" opacity=".5" stroke="var(--ring-morning)" />
              <circle cx="50" cy="50" r="40" fill="none" strokeWidth="8" strokeLinecap="round" strokeDasharray="76 176" strokeDashoffset="-83.8" opacity=".5" stroke="var(--ring-afternoon)" />
              <circle cx="50" cy="50" r="40" fill="none" strokeWidth="8" strokeLinecap="round" strokeDasharray="76 176" strokeDashoffset="-167.6" opacity=".5" stroke="var(--ring-evening)" />
            </svg>
            <h1 className="relative z-[1] font-serif text-[32px] font-bold text-[var(--lh-word)] mt-[18px] mb-1.5 transition-colors duration-[600ms]">La Tribu</h1>
            <p className="relative z-[1] font-serif italic text-[15px] text-[var(--lh-slogan)] transition-colors duration-[600ms]">Comunidad de bienestar y alto rendimiento.</p>
          </div>

          {/* ========== LADO DERECHO — FORMULARIO ========== */}
          <div className="bg-[var(--lf-bg)] p-12 flex flex-col justify-center transition-colors duration-[600ms]">
            <h2 className="text-2xl font-semibold tracking-tight mb-6 text-[var(--lf-title)] transition-colors duration-[600ms]">
              {view === 'login' ? 'Acceso Terapeutas' : 'Recuperar contraseña'}
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
                      className="relative inline-flex w-full items-center justify-center h-11 rounded-xl bg-[var(--lf-btn-bg)] text-[var(--lf-btn-text)] font-semibold tracking-wide transition-all duration-200 ease-out active:scale-[0.98] active:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 gap-2"
                    >
                      {forgotLoading ? 'Enviando…' : 'Enviar instrucciones'}
                    </button>
                  </>
                )}
                <div className="text-center mt-6">
                  <button
                    type="button"
                    onClick={() => { setView('login'); setForgotError(null); setForgotSent(false); }}
                    className="text-[var(--lf-link)] hover:opacity-80 underline underline-offset-4 transition-colors duration-[600ms] font-medium text-sm"
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
                <label className="flex items-center gap-2 text-sm text-[var(--lf-label)] transition-colors duration-[600ms] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-[var(--lf-input-border)] accent-[var(--lf-link)]"
                  />
                  Recuérdame
                </label>
                <button
                  type="submit"
                  disabled={loading}
                  className="relative inline-flex w-full items-center justify-center h-11 rounded-xl bg-[var(--lf-btn-bg)] text-[var(--lf-btn-text)] font-semibold tracking-wide transition-all duration-200 ease-out active:scale-[0.98] active:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 gap-2"
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

                <div className="text-center mt-2">
                  <button
                    type="button"
                    onClick={() => { setView('forgot'); setError(null); }}
                    className="text-[var(--lf-link)] hover:opacity-80 underline underline-offset-4 transition-colors duration-[600ms] font-medium text-sm"
                  >
                    ¿Has olvidado tu contraseña?
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
