'use client';

import React, { useEffect, useState, type FormEvent } from 'react';
import { therapistLogin } from '@/lib/blindspot-client';
import { forgotPasswordRequest } from '@/lib/api-client';
import Isotipo from '@/components/ui/Isotipo';
import Button from '@/components/ui/Button';

// Misma identidad visual que (auth)/login/page.tsx (panel de marca, tarjeta,
// inputs, botón) — a propósito: un terapeuta no debe ver una pantalla de
// login que "se sienta distinta" a la de un cliente. Única diferencia real:
// sin Google/Apple (ese flujo OAuth es solo para clientes).
const LOGIN_PANEL_BG = 'var(--eph-bg)';
const FORM_INK_MUTED = 'var(--eph-muted)';
const FORM_BORDER = 'var(--eph-line-2)';
const FORM_ACCENT = 'var(--eph-accent)';
const LOGIN_PRIMARY_BUTTON_STYLE: React.CSSProperties = { minHeight: 0, padding: '19px', fontSize: 11, letterSpacing: '0.26em' };

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
      const { mustChangePassword } = await therapistLogin(email, password);
      if (typeof window !== 'undefined') {
        if (rememberMe) {
          window.localStorage.setItem(REMEMBER_EMAIL_KEY, email);
        } else {
          window.localStorage.removeItem(REMEMBER_EMAIL_KEY);
        }
      }
      setEnteringLabel('Calibrando…');
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
    'block w-full border-0 border-b border-[var(--eph-line-2)] rounded-none bg-transparent px-0 pt-2 pb-3 font-body text-[18px] font-normal text-[var(--eph-text)] outline-none transition-colors placeholder:text-[var(--eph-muted)] placeholder:opacity-70 focus:border-[var(--eph-accent)]';
  const labelClasses =
    'block font-mono text-[10px] font-normal uppercase tracking-[0.2em] text-[var(--eph-body)]';

  return (
    <>
      {enteringLabel && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5" style={{ background: LOGIN_PANEL_BG }}>
          <svg className="animate-spin" viewBox="0 0 100 100" width="56" height="56" aria-hidden="true" style={{ animationDuration: '1.4s' }}>
            <circle cx="50" cy="50" r="40" fill="none" strokeWidth="6" stroke="rgba(237,230,220,0.14)" />
            <circle cx="50" cy="50" r="40" fill="none" strokeWidth="6" strokeLinecap="butt" strokeDasharray="70 251" stroke={FORM_ACCENT} />
          </svg>
          <div className="flex flex-col items-center gap-1.5">
            <p className="font-display text-xl" style={{ color: 'var(--eph-text)' }}>Ephirox</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: FORM_INK_MUTED }}>{enteringLabel}</p>
          </div>
        </div>
      )}

      <div className="min-h-screen w-full flex items-center justify-center p-4" style={{ background: LOGIN_PANEL_BG }}>
        {/* md:min-h fija el mismo tamaño estándar de tarjeta que el login de clientes. */}
        <div className="max-w-4xl w-full md:min-h-[600px] grid grid-cols-1 md:grid-cols-2 rounded-none border overflow-hidden" style={{ borderColor: 'var(--eph-line-2)', boxShadow: 'var(--eph-shadow)' }}>

          {/* ========== LADO IZQUIERDO — IDENTIDAD EPHIROX ========== */}
          <div className="relative overflow-hidden p-12 flex flex-col items-center justify-center text-center gap-[34px]" style={{ background: 'var(--eph-panel)' }}>
            <Isotipo size={118} />
            <div style={{ textAlign: 'center' }}>
              <div
                className="font-display uppercase"
                style={{ fontWeight: 300, fontSize: 'clamp(34px, 4vw, 46px)', letterSpacing: '0.2em', textIndent: '0.2em', color: 'var(--eph-text)' }}
              >
                Ephirox
              </div>
              <div
                className="font-display italic"
                style={{ fontWeight: 400, fontSize: 22, letterSpacing: '0.02em', color: 'var(--eph-accent)', marginTop: 16 }}
              >
                Redefining limits.
              </div>
            </div>
            <div
              className="font-mono text-center"
              style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: FORM_INK_MUTED, lineHeight: 2.1, marginTop: 8 }}
            >
              Sistema de Optimización Ejecutiva
            </div>
          </div>

          {/* ========== LADO DERECHO — FORMULARIO ========== */}
          <div className="p-12 flex flex-col justify-center gap-[30px]" style={{ background: 'var(--eph-auth)', borderLeft: '1px solid var(--eph-line-2)' }}>
            {view === 'forgot' && (
              <h2 className="font-display text-[28px] font-normal" style={{ color: 'var(--eph-text)' }}>
                Recuperar contraseña
              </h2>
            )}

            {view === 'forgot' ? (
              <form onSubmit={handleForgotPassword} className="w-full space-y-4" noValidate>
                {forgotError && (
                  <div role="alert" className="rounded-none border px-4 py-3 font-body text-sm" style={{ borderColor: 'var(--eph-danger)', background: 'rgba(138,74,60,0.14)', color: 'var(--eph-text)' }}>
                    {forgotError}
                  </div>
                )}
                {forgotSent ? (
                  <div role="status" className="rounded-none border px-4 py-3 font-body text-sm" style={{ borderColor: 'var(--eph-line-2)', background: 'var(--eph-surface)', color: 'var(--eph-text)' }}>
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
                    <Button type="submit" variant="primary" disabled={forgotLoading} className="w-full" style={LOGIN_PRIMARY_BUTTON_STYLE}>
                      {forgotLoading ? 'Enviando…' : 'Enviar instrucciones'}
                    </Button>
                  </>
                )}
                <div className="text-center mt-6">
                  <Button
                    type="button"
                    variant="tertiary"
                    onClick={() => { setView('login'); setForgotError(null); setForgotSent(false); }}
                  >
                    Volver a iniciar sesión
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="w-full grid" style={{ gap: 30 }} noValidate>
                {error && (
                  <div role="alert" className="rounded-none border px-4 py-3 font-body text-sm" style={{ borderColor: 'var(--eph-danger)', background: 'rgba(138,74,60,0.14)', color: 'var(--eph-text)' }}>
                    {error}
                  </div>
                )}
                <div className="grid" style={{ gap: 26 }}>
                  <div className="space-y-2.5">
                    <label htmlFor="therapist-email" className={labelClasses}>Email</label>
                    <input id="therapist-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@ejemplo.com" className={inputClasses} />
                  </div>
                  <div className="space-y-2.5">
                    <label htmlFor="therapist-password" className={labelClasses}>Contraseña</label>
                    <input id="therapist-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={inputClasses} />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <label className="flex items-center gap-3 font-body cursor-pointer select-none" style={{ color: FORM_INK_MUTED, fontSize: 16, lineHeight: 1 }}>
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="peer sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className="block peer-checked:bg-[var(--eph-accent)] peer-checked:border-[var(--eph-accent)]"
                      style={{ width: 15, height: 15, border: `1px solid ${FORM_BORDER}`, background: 'transparent' }}
                    />
                    Recuérdame
                  </label>
                  <button
                    type="button"
                    onClick={() => { setView('forgot'); setError(null); }}
                    className="font-body transition-colors duration-150 hover:text-[var(--eph-text)] hover:border-[var(--eph-accent-line)]"
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 16, lineHeight: 1, color: FORM_INK_MUTED, borderBottom: '1px solid var(--eph-line)' }}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <Button type="submit" variant="primary" disabled={loading} className="w-full" style={LOGIN_PRIMARY_BUTTON_STYLE}>
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
                </Button>
              </form>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
