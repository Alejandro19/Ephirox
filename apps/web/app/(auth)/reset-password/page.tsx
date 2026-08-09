'use client';

import React, { useEffect, useState, type FormEvent } from 'react';
import { resetPasswordRequest } from '@/lib/api-client';

// Mismo patrón autocontenido que las páginas de login: tema día/noche fijado
// antes del primer pintado para evitar flash del tema equivocado.
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

export default function ResetPasswordPage(): React.ReactElement {
  const [token, setToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    applyLoginTheme();
    const params = new URLSearchParams(window.location.search);
    setToken(params.get('token'));
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
    if (!token) {
      setError('El enlace es inválido o ya expiró. Solicita uno nuevo.');
      return;
    }
    setLoading(true);
    try {
      const result = await resetPasswordRequest(token, newPassword);
      if (!result.success) {
        setError(result.error || 'No se pudo actualizar la contraseña.');
        return;
      }
      setDone(true);
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  const inputClasses =
    'block w-full h-11 rounded-xl px-4 text-sm transition-all duration-200 ease-in-out outline-none bg-[var(--lf-input-bg)] border border-[var(--lf-input-border)] text-[var(--lf-input-text)] placeholder:text-[var(--lf-label)] placeholder:opacity-60 focus:border-[var(--lf-link)] focus:ring-4 focus:ring-[var(--lf-link)]/10';
  const labelClasses = 'block text-sm font-medium text-[var(--lf-label)] transition-colors duration-[600ms]';

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script dangerouslySetInnerHTML={{ __html: LOGIN_THEME_SCRIPT }} />

      <div className="min-h-screen w-full bg-[var(--cream)] flex items-center justify-center p-4">
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
              Nueva contraseña
            </h2>

            {done ? (
              <div className="space-y-4">
                <div role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
                  Contraseña actualizada. Ya puedes iniciar sesión.
                </div>
                <div className="flex flex-col gap-2 text-sm text-center mt-4">
                  <a href="/login" className="text-[var(--lf-link)] hover:opacity-80 underline underline-offset-4 font-medium">Ir al acceso de miembros</a>
                  <a href="/therapist-login" className="text-[var(--lf-link)] hover:opacity-80 underline underline-offset-4 font-medium">Ir al acceso de terapeutas</a>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="w-full space-y-4" noValidate>
                {error && (
                  <div role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {error}
                  </div>
                )}
                <div className="space-y-1.5">
                  <label htmlFor="new-password" className={labelClasses}>Nueva contraseña</label>
                  <input
                    id="new-password"
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
                  <label htmlFor="confirm-password" className={labelClasses}>Confirmar contraseña</label>
                  <input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite tu contraseña"
                    className={inputClasses}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="relative inline-flex w-full items-center justify-center h-11 rounded-xl bg-[var(--lf-btn-bg)] text-[var(--lf-btn-text)] font-semibold tracking-wide transition-all duration-200 ease-out active:scale-[0.98] active:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 gap-2"
                >
                  {loading ? 'Actualizando…' : 'Actualizar contraseña'}
                </button>
              </form>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
