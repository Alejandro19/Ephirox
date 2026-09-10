'use client';

import React, { useEffect, useState, type FormEvent } from 'react';
import { therapistLogin } from '@/lib/blindspot-client';
import { forgotPasswordRequest } from '@/lib/api-client';
import Isotipo from '@/components/ui/Isotipo';
import '../../eph-login-shared.css';

// Misma identidad visual que (auth)/login/page.tsx (panel de marca, tarjeta,
// inputs, botón) — a propósito: un terapeuta no debe ver una pantalla de
// login que "se sienta distinta" a la de un cliente. Única diferencia real:
// sin Google/Apple (ese flujo OAuth es solo para clientes) y sin el pie de
// "Solicitar cohorte" (ese CTA es para prospectos B2B, no para terapeutas).
const PAGE_BG = '#0B0907';
const GOLD = '#C9A66B';

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
  const [showPassword, setShowPassword] = useState(false);
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

  return (
    <>
      {enteringLabel && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5" style={{ background: PAGE_BG }}>
          <svg className="animate-spin" viewBox="0 0 100 100" width="56" height="56" aria-hidden="true" style={{ animationDuration: '1.4s' }}>
            <circle cx="50" cy="50" r="40" fill="none" strokeWidth="6" stroke="rgba(245,241,232,0.14)" />
            <circle cx="50" cy="50" r="40" fill="none" strokeWidth="6" strokeLinecap="butt" strokeDasharray="70 251" stroke={GOLD} />
          </svg>
          <div className="flex flex-col items-center gap-1.5">
            <p className="font-display text-xl" style={{ color: '#FBF8F1' }}>Ephirox</p>
            <p className="font-body text-[10px] uppercase tracking-[0.16em]" style={{ color: 'rgba(245,241,232,0.6)' }}>{enteringLabel}</p>
          </div>
        </div>
      )}

      <div className="eph-login-page">
        <div className="eph-login-card">

          {/* ========== PANEL DE MARCA (izquierda en desktop, arriba en móvil) ========== */}
          <div className="eph-login-brand">
            <div className="eph-login-mark">
              <Isotipo size={100} tone="mono" className="eph-login-ring" />
              <p className="font-display uppercase eph-login-wordmark">Ephirox</p>
              <p className="font-display eph-login-tagline">Redefining limits.</p>
            </div>
            <div className="font-body eph-login-caption">
              <span className="eph-login-caption-line" />
              Sistema de Optimización Ejecutiva
              <span className="eph-login-caption-line" />
            </div>
          </div>

          {/* ========== PANEL DE FORMULARIO (derecha en desktop, abajo en móvil) ========== */}
          <div className="eph-login-form-panel">
            {view === 'forgot' ? (
              <form onSubmit={handleForgotPassword} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                <h1 className="font-display eph-login-title">Recuperar contraseña</h1>

                {forgotError && (
                  <p role="alert" className="font-body eph-login-error-text">{forgotError}</p>
                )}

                {forgotSent ? (
                  <p role="status" className="font-body" style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'rgba(245,241,232,0.8)' }}>
                    Si el correo existe, enviaremos instrucciones para restablecer tu contraseña.
                  </p>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      <label htmlFor="therapist-forgot-email" className="font-body eph-login-label">EMAIL</label>
                      <input
                        id="therapist-forgot-email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="nombre@empresa.com"
                        className={`font-body eph-login-input${forgotError ? ' has-error' : ''}`}
                      />
                    </div>
                    <button type="submit" disabled={forgotLoading} className="font-body eph-login-submit">
                      {forgotLoading ? 'Enviando…' : 'Enviar instrucciones'}
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => { setView('login'); setForgotError(null); setForgotSent(false); }}
                  className="font-body eph-login-forgot-link"
                  style={{ alignSelf: 'center' }}
                >
                  Volver a iniciar sesión
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                <h1 className="font-display eph-login-title">Acceso de terapeutas</h1>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <label htmlFor="therapist-email" className="font-body eph-login-label">EMAIL</label>
                  <input
                    id="therapist-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nombre@empresa.com"
                    className={`font-body eph-login-input${error ? ' has-error' : ''}`}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                    <label htmlFor="therapist-password" className="font-body eph-login-label">CONTRASEÑA</label>
                    <button
                      type="button"
                      onClick={() => { setView('forgot'); setError(null); }}
                      className="font-body eph-login-forgot-link"
                    >
                      ¿La olvidaste?
                    </button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="therapist-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`font-body eph-login-input${error ? ' has-error' : ''}`}
                      style={{ paddingRight: 66 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="font-body eph-login-pwd-toggle"
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPassword ? 'OCULTAR' : 'VER'}
                    </button>
                  </div>
                  {error && (
                    <p role="alert" className="font-body eph-login-error-text">{error}</p>
                  )}
                </div>

                <label className="eph-login-checkbox-row">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only eph-login-checkbox-input"
                  />
                  <span aria-hidden="true" className={`eph-login-checkbox-box${rememberMe ? ' is-checked' : ''}`}>
                    {rememberMe && (
                      <svg width="12" height="10" viewBox="0 0 12 10" fill="none" aria-hidden="true">
                        <path d="M1 5L4.2 8.5L11 1" stroke="#17130E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span className="font-body" style={{ fontSize: 14, fontWeight: 300, color: 'rgba(245,241,232,0.8)' }}>
                    Mantener sesión iniciada
                  </span>
                </label>

                <button type="submit" disabled={loading} className="font-body eph-login-submit">
                  {loading ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" stroke="#17130E" strokeOpacity="0.3" strokeWidth="4" />
                        <path fill="#17130E" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Ingresando…
                    </span>
                  ) : 'Entrar'}
                </button>
              </form>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
