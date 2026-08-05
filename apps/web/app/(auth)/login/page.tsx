'use client';

import React, { useState, useEffect, type FormEvent } from 'react';
import { loginRequest, saveSession, type LoginResult } from '@/lib/api-client';

// ============================================================
// FASE 0 — PÁGINA DE LOGIN AUTOCONTENIDA (CERO DEPENDENCIAS EXTERNAS)
// Split Screen: izquierda (identidad La Tribu) / derecha (formulario)
// Tema día/noche por hora real del dispositivo (no prefers-color-scheme),
// portado 1:1 del front antiguo: antes de las 18:00 tema "light", desde
// las 18:00 tema "dark" — los paneles hero/formulario intercambian toda
// su paleta entre uno y otro (ver .theme-login-* en globals.css).
// ============================================================

// Código fuente del script que fija el tema en <html> ANTES del primer
// pintado (se ejecuta durante el parseo del HTML, antes de que React
// hidrate) — así no hay flash del tema equivocado ni salto de color al
// refrescar la página.
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

export default function LoginPage(): React.ReactElement {
  const [view, setView] = useState<'login' | 'register'>('login');

  // --- Login state ---
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // --- Register state ---
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regError, setRegError] = useState<string | null>(null);
  const [regLoading, setRegLoading] = useState(false);

  useEffect(() => {
    // Cubre navegación interna (SPA) hacia /login, donde el <script>
    // inline no vuelve a ejecutarse. Redundante pero inofensivo en la
    // carga inicial (mismo tema, sin parpadeo).
    applyLoginTheme();
    const interval = setInterval(applyLoginTheme, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  async function handleLogin(e: FormEvent): Promise<void> {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    try {
      const result: LoginResult = await loginRequest(loginEmail, loginPassword);
      if (!result.success || !result.token) {
        setLoginError(result.error || 'Error al iniciar sesión.');
        return;
      }
      if (typeof window !== 'undefined') {
        saveSession(result.token);
        window.location.href = '/';
      }
    } catch {
      setLoginError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleRegister(e: FormEvent): Promise<void> {
    e.preventDefault();
    setRegError(null);
    if (regPassword !== regConfirm) {
      setRegError('Las contraseñas no coinciden.');
      return;
    }
    if (regPassword.length < 6) {
      setRegError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setRegLoading(true);
    try {
      const res = await fetch('http://localhost:3003/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: regName, email: regEmail, password: regPassword }),
      });
      const data: LoginResult = await res.json();
      if (!data.success || !data.token) {
        setRegError(data.error || 'Error al registrarse.');
        return;
      }
      if (typeof window !== 'undefined') {
        saveSession(data.token);
        window.location.href = '/';
      }
    } catch {
      setRegError('Error de conexión. Intenta de nuevo.');
    } finally {
      setRegLoading(false);
    }
  }

  const inputClasses: string = 'block w-full h-11 rounded-xl px-4 text-sm transition-all duration-200 ease-in-out outline-none bg-[var(--lf-input-bg)] border border-[var(--lf-input-border)] text-[var(--lf-input-text)] placeholder:text-[var(--lf-label)] placeholder:opacity-60 focus:border-[var(--lf-link)] focus:ring-4 focus:ring-[var(--lf-link)]/10';
  const labelClasses: string = 'block text-sm font-medium text-[var(--lf-label)] transition-colors duration-[600ms]';

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script dangerouslySetInnerHTML={{ __html: LOGIN_THEME_SCRIPT }} />
      <div className="min-h-screen w-full bg-[var(--cream)] flex items-center justify-center p-4">
        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 rounded-3xl overflow-hidden shadow-[0_30px_80px_-15px_rgba(43,36,32,0.18)]">

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
              {view === 'login' ? 'Qué bueno verte de nuevo' : 'Crea tu cuenta premium'}
            </h2>

            {view === 'login' ? (
              <form onSubmit={handleLogin} className="w-full space-y-4" noValidate>
                {loginError && (
                  <div role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {loginError}
                  </div>
                )}
                <div className="space-y-1.5">
                  <label htmlFor="login-email" className={labelClasses}>Email</label>
                  <input id="login-email" type="email" autoComplete="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="tucorreo@ejemplo.com" className={inputClasses} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="login-password" className={labelClasses}>Contraseña</label>
                  <input id="login-password" type="password" autoComplete="current-password" required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="••••••••" className={inputClasses} />
                </div>
                <button type="submit" disabled={loginLoading} className="relative inline-flex w-full items-center justify-center h-11 rounded-xl bg-[var(--lf-btn-bg)] text-[var(--lf-btn-text)] font-semibold tracking-wide transition-all duration-200 ease-out active:scale-[0.98] active:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 gap-2">
                  {loginLoading ? (<span className="flex items-center gap-2"><svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>Ingresando…</span>) : 'Entrar'}
                </button>

                <div className="flex items-center gap-2.5 my-4">
                  <span className="flex-1 h-px bg-[var(--lf-input-border)] transition-colors duration-[600ms]" />
                  <span className="text-[11px] uppercase tracking-wide text-[var(--lf-foot)] transition-colors duration-[600ms]">o</span>
                  <span className="flex-1 h-px bg-[var(--lf-input-border)] transition-colors duration-[600ms]" />
                </div>
                <button
                  type="button"
                  disabled
                  title="Próximamente"
                  aria-disabled="true"
                  className="w-full h-11 rounded-xl border border-[var(--lf-input-border)] bg-[var(--lf-input-bg)] text-[var(--lf-input-text)] text-sm font-medium flex items-center justify-center gap-2 opacity-60 cursor-not-allowed transition-colors duration-[600ms]"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.85 2.09-1.8 2.73v2.27h2.92c1.71-1.57 2.68-3.88 2.68-6.64z" />
                    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.17l-2.92-2.27c-.8.54-1.83.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.34C2.44 15.98 5.48 18 9 18z" />
                    <path fill="#FBBC05" d="M3.97 10.71A5.4 5.4 0 013.68 9c0-.59.1-1.17.29-1.71V4.96H.96A9 9 0 000 9c0 1.45.35 2.83.96 4.04l3.01-2.33z" />
                    <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.59-2.59C13.47.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
                  </svg>
                  Continuar con Google
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="w-full space-y-4" noValidate>
                {regError && (
                  <div role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {regError}
                  </div>
                )}
                <div className="space-y-1.5">
                  <label htmlFor="register-name" className={labelClasses}>Nombre completo</label>
                  <input id="register-name" type="text" autoComplete="name" required value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="Tu nombre completo" className={inputClasses} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="register-email" className={labelClasses}>Email</label>
                  <input id="register-email" type="email" autoComplete="email" required value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="tucorreo@ejemplo.com" className={inputClasses} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="register-password" className={labelClasses}>Contraseña</label>
                  <input id="register-password" type="password" autoComplete="new-password" required value={regPassword} onChange={(e) => setRegPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className={inputClasses} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="register-confirm" className={labelClasses}>Confirmar contraseña</label>
                  <input id="register-confirm" type="password" autoComplete="new-password" required value={regConfirm} onChange={(e) => setRegConfirm(e.target.value)} placeholder="Repite tu contraseña" className={inputClasses} />
                </div>
                <button type="submit" disabled={regLoading} className="relative inline-flex w-full items-center justify-center h-11 rounded-xl bg-[var(--lf-btn-bg)] text-[var(--lf-btn-text)] font-semibold tracking-wide transition-all duration-200 ease-out active:scale-[0.98] active:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 gap-2">
                  {regLoading ? (<span className="flex items-center gap-2"><svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>Creando cuenta…</span>) : 'Crear cuenta'}
                </button>
              </form>
            )}

            <div className="text-center mt-6">
              <button
                type="button"
                onClick={() => { setView(view === 'login' ? 'register' : 'login'); setLoginError(null); setRegError(null); }}
                className="text-[var(--lf-link)] hover:opacity-80 underline underline-offset-4 transition-colors duration-[600ms] font-medium text-sm"
              >
                {view === 'login' ? '¿Aún no tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
