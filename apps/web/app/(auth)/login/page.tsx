'use client';

import React, { useState, useEffect, useRef, useCallback, type FormEvent } from 'react';
import {
  loginRequest, type LoginResult,
  fetchGoogleClientId, googleLoginRequest,
  fetchAppleClientId, appleLoginRequest,
  forgotPasswordRequest,
} from '@/lib/api-client';
import { getSafeRedirectTarget, getSetPasswordUrl } from '@/lib/login-redirect';

// "Recuérdame" solo guarda el email localmente (nunca la contraseña — un
// checkbox de la app no debe controlar si se persiste texto plano de una
// contraseña en el navegador). El gestor de contraseñas nativo del
// navegador, activado por autoComplete="current-password", ya cubre el
// caso de recordar la contraseña de forma segura.
const REMEMBER_EMAIL_KEY = 'latribu_remember_email';

// Tipado mínimo de los namespaces globales que inyectan los scripts de
// Google Identity Services y Sign in with Apple JS (cargados en layout.tsx)
// — ninguno de los dos publica un paquete npm oficial con tipos.
type GoogleCredentialResponse = { credential: string };
type GoogleMomentNotification = {
  isNotDisplayed: () => boolean;
  isSkippedMoment: () => boolean;
};
interface GoogleIdentityNamespace {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
        use_fedcm_for_prompt?: boolean;
      }) => void;
      prompt: (momentListener?: (notification: GoogleMomentNotification) => void) => void;
    };
  };
}
type AppleAuthorizationResponse = {
  authorization: { id_token: string; code: string; state?: string };
  user?: { name?: { firstName?: string; lastName?: string }; email?: string };
};
interface AppleIDNamespace {
  auth: {
    init: (config: { clientId: string; scope: string; redirectURI: string; usePopup: boolean }) => void;
    signIn: () => Promise<AppleAuthorizationResponse>;
  };
}
declare global {
  interface Window {
    google?: GoogleIdentityNamespace;
    AppleID?: AppleIDNamespace;
  }
}

// ============================================================
// PÁGINA DE LOGIN — rediseño a pedido de Alejandro (spec pixel a pixel):
// una sola implementación responsive SIN media queries — la card
// `panel-marca` / `panel-form` se apila sola vía flex-wrap cuando no caben
// los 400px mínimos de cada panel. Tokens hardcodeados en hex (no --eph-*)
// porque la spec los da como valores fijos, distintos de los tokens de
// tema del resto de la app.
// ============================================================

const PAGE_BG = '#0B0907';
const GOLD = '#C9A66B';
const ERROR_COLOR = '#E0A88A';

type LoginView = 'login' | 'forgot';

function GoogleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.4673-.8059 5.9564-2.1805l-2.9087-2.2581c-.8059.54-1.8368.8591-3.0477.8591-2.344 0-4.3282-1.5831-5.036-3.7104H.9573v2.3318C2.4382 15.9832 5.4818 18 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.2822-1.1168-.2822-1.71s.1023-1.17.2823-1.71V4.9582H.9573A8.9965 8.9965 0 000 9c0 1.4523.3477 2.8259.9573 4.0418L3.964 10.71z" />
      <path fill="#EA4335" d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5814-2.5814C13.4632.8918 11.426 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.964 7.29C4.6718 5.1627 6.656 3.5795 9 3.5795z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="16" height="19" viewBox="0 0 384 512" fill="#F5F1E8" aria-hidden="true">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76-19.7C64.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="10" viewBox="0 0 12 10" fill="none" aria-hidden="true">
      <path d="M1 5L4.2 8.5L11 1" stroke="#17130E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function LoginPage(): React.ReactElement {
  const [view, setView] = useState<LoginView>('login');

  // --- Login state ---
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // --- Recuperar contraseña ---
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  useEffect(() => {
    const remembered = typeof window !== 'undefined' ? window.localStorage.getItem(REMEMBER_EMAIL_KEY) : null;
    if (remembered) {
      setLoginEmail(remembered);
      setRememberMe(true);
    }
  }, []);

  // --- Pantalla transitoria de entrada (login normal y Google comparten esto) ---
  const [enteringLabel, setEnteringLabel] = useState<string | null>(null);

  // --- Google Sign-In ---
  // Botón propio (icono + texto) en vez del widget renderButton() de
  // Google — ese iframe siempre trae su propia caja de marca por política
  // de Google. Se dispara prompt() (One Tap/FedCM) al clic; si el
  // navegador lo bloquea (cookies de terceros, popups) o el usuario lo
  // descartó hace poco (cooldown de Google), el moment listener lo avisa en
  // vez de dejar el botón mudo.
  const googleInitializedRef = useRef(false);
  const [googleReady, setGoogleReady] = useState(false);

  const handleGoogleClick = useCallback(() => {
    if (typeof window === 'undefined' || !window.google?.accounts) return;
    setLoginError(null);
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        setLoginError('No se pudo abrir el inicio de sesión con Google. Revisa que las cookies de terceros no estén bloqueadas e intenta de nuevo.');
      }
    });
  }, []);

  // --- Apple Sign-In ---
  // appleReady solo pasa a true si el backend tiene APPLE_CLIENT_ID
  // configurado (vía /api/config) — mientras tanto se muestra el botón
  // deshabilitado de más abajo. El SDK y el flujo ya quedan completos acá,
  // listos para activarse solos apenas exista la cuenta de desarrollador.
  const [appleReady, setAppleReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let retriesLeft = 60;
    // Se pide en paralelo con la espera del script, no después — así no se
    // suman los dos tiempos de espera (script listo + ida y vuelta a /api/config).
    const clientIdPromise = fetchGoogleClientId();

    async function handleGoogleCredentialResponse(response: GoogleCredentialResponse): Promise<void> {
      setLoginError(null);
      setEnteringLabel('Calibrando…');
      let navigating = false;
      try {
        const result = await googleLoginRequest(response.credential);
        if (!result.success || !result.token) {
          setLoginError(result.error || 'No se pudo iniciar sesión con Google.');
          return;
        }
        navigating = true;
        window.location.href = getSafeRedirectTarget();
      } finally {
        // Si hubo éxito, el overlay se deja visible a propósito: cubre hasta
        // que "/" termine de cargar, en vez de mostrar un instante de login
        // sin cambios antes de que arranque la navegación completa.
        if (!navigating) setEnteringLabel(null);
      }
    }

    // El script de Google (accounts.google.com/gsi/client, cargado con
    // strategy="beforeInteractive" en layout.tsx) normalmente ya está listo
    // para cuando este efecto corre, pero se reintenta con backoff corto en
    // vez de asumirlo, por si la red va lenta.
    async function initGoogleSignIn(): Promise<void> {
      if (cancelled) return;
      if (typeof window === 'undefined' || !window.google?.accounts) {
        if (retriesLeft > 0) {
          retriesLeft -= 1;
          setTimeout(initGoogleSignIn, 100);
        }
        return;
      }
      const clientId = await clientIdPromise;
      if (cancelled || !clientId) return;
      if (!googleInitializedRef.current) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCredentialResponse,
          // FedCM: diálogo nativo del navegador en vez del popup con la
          // pantalla completa de accounts.google.com — bastante más rápido y
          // es el flujo que Google recomienda de aquí en adelante.
          use_fedcm_for_prompt: true,
        });
        googleInitializedRef.current = true;
      }
      setGoogleReady(true);
    }

    initGoogleSignIn();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let retriesLeft = 60;
    const clientIdPromise = fetchAppleClientId();

    // Mismo patrón: reintenta con backoff corto hasta que el SDK de Apple
    // (cargado con strategy="beforeInteractive" en layout.tsx) esté listo.
    async function initAppleSignIn(): Promise<void> {
      if (cancelled) return;
      if (typeof window === 'undefined' || !window.AppleID?.auth) {
        if (retriesLeft > 0) {
          retriesLeft -= 1;
          setTimeout(initAppleSignIn, 100);
        }
        return;
      }
      const clientId = await clientIdPromise;
      // Sin APPLE_CLIENT_ID en el backend, el botón se queda en su versión
      // deshabilitada (ver JSX) — el resto de la lógica ya queda lista para
      // cuando exista la cuenta de desarrollador de Apple.
      if (cancelled || !clientId) return;
      window.AppleID.auth.init({
        clientId,
        scope: 'name email',
        redirectURI: `${window.location.origin}/login`,
        usePopup: true,
      });
      setAppleReady(true);
    }

    initAppleSignIn();
    return () => { cancelled = true; };
  }, []);

  async function handleAppleClick(): Promise<void> {
    if (!window.AppleID?.auth) return;
    setLoginError(null);
    try {
      const response = await window.AppleID.auth.signIn();
      // Apple solo manda el nombre la primera vez que el usuario autoriza
      // la app — en logins posteriores response.user viene undefined.
      const fullName = response.user?.name
        ? [response.user.name.firstName, response.user.name.lastName].filter(Boolean).join(' ')
        : undefined;
      setEnteringLabel('Calibrando…');
      let navigating = false;
      try {
        const result = await appleLoginRequest(response.authorization.id_token, fullName);
        if (!result.success || !result.token) {
          setLoginError(result.error || 'No se pudo iniciar sesión con Apple.');
          return;
        }
        navigating = true;
        window.location.href = getSafeRedirectTarget();
      } finally {
        if (!navigating) setEnteringLabel(null);
      }
    } catch {
      // Cerrar el popup de Apple sin completar el login también cae acá —
      // no es un error real del usuario, así que no se muestra nada.
    }
  }

  async function handleLogin(e: FormEvent): Promise<void> {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    let navigating = false;
    try {
      const result: LoginResult = await loginRequest(loginEmail, loginPassword);
      if (!result.success || !result.token) {
        setLoginError(result.error || 'Error al iniciar sesión.');
        return;
      }
      if (typeof window !== 'undefined') {
        if (rememberMe) {
          window.localStorage.setItem(REMEMBER_EMAIL_KEY, loginEmail);
        } else {
          window.localStorage.removeItem(REMEMBER_EMAIL_KEY);
        }
        // Igual que el login con Google: el anillo cubre el tramo hasta que
        // "/" termine de cargar, en vez de un instante de login sin cambios.
        setEnteringLabel('Calibrando…');
        navigating = true;
        // El admin le asignó una contraseña temporal (checkbox en Crear
        // Usuario) — antes de entrar a la app, tiene que definir una nueva.
        window.location.href = result.mustChangePassword ? getSetPasswordUrl() : getSafeRedirectTarget();
      }
    } catch {
      setLoginError('Error de conexión. Intenta de nuevo.');
    } finally {
      if (!navigating) setLoginLoading(false);
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
      {/* Pantalla transitoria mientras se procesa el login (con Google, con
          Apple o con email/contraseña) y se entra a la plataforma — cubre el
          tramo hasta la navegación a "/", que si no se cubre se ve como si
          "regresara" al login sin cambios por un instante. */}
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
              <img
                src="/brand/ephirox-lockup-vertical-oro.svg"
                alt="Ephirox"
                className="eph-login-lockup"
              />
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
                      <label htmlFor="forgot-email" className="font-body eph-login-label">EMAIL</label>
                      <input
                        id="forgot-email"
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
              <form onSubmit={handleLogin} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                <h1 className="font-display eph-login-title">Acceso de miembros</h1>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <label htmlFor="login-email" className="font-body eph-login-label">EMAIL</label>
                  <input
                    id="login-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="nombre@empresa.com"
                    className={`font-body eph-login-input${loginError ? ' has-error' : ''}`}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                    <label htmlFor="login-password" className="font-body eph-login-label">CONTRASEÑA</label>
                    <button
                      type="button"
                      onClick={() => { setView('forgot'); setLoginError(null); }}
                      className="font-body eph-login-forgot-link"
                    >
                      ¿La olvidaste?
                    </button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`font-body eph-login-input${loginError ? ' has-error' : ''}`}
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
                  {loginError && (
                    <p role="alert" className="font-body eph-login-error-text">{loginError}</p>
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
                    {rememberMe && <CheckIcon />}
                  </span>
                  <span className="font-body" style={{ fontSize: 14, fontWeight: 300, color: 'rgba(245,241,232,0.8)' }}>
                    Mantener sesión iniciada
                  </span>
                </label>

                <button type="submit" disabled={loginLoading} className="font-body eph-login-submit">
                  {loginLoading ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" stroke="#17130E" strokeOpacity="0.3" strokeWidth="4" />
                        <path fill="#17130E" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Ingresando…
                    </span>
                  ) : 'Entrar'}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span className="eph-login-divider-line" />
                  <span className="font-body" style={{ fontSize: 11, fontWeight: 300, letterSpacing: '0.16em', color: 'rgba(245,241,232,0.6)', whiteSpace: 'nowrap' }}>
                    O CONTINÚA CON
                  </span>
                  <span className="eph-login-divider-line" />
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  <button
                    type="button"
                    onClick={googleReady ? handleGoogleClick : undefined}
                    disabled={!googleReady}
                    title={googleReady ? undefined : 'Cargando…'}
                    aria-disabled={!googleReady}
                    className="font-body eph-login-social-btn"
                  >
                    <GoogleIcon /> Google
                  </button>
                  <button
                    type="button"
                    onClick={appleReady ? handleAppleClick : undefined}
                    disabled={!appleReady}
                    title={appleReady ? undefined : 'Próximamente'}
                    aria-disabled={!appleReady}
                    className="font-body eph-login-social-btn"
                  >
                    <AppleIcon /> Apple
                  </button>
                </div>

                <p className="font-body" style={{ textAlign: 'center', margin: 0, fontSize: 14, fontWeight: 300, color: 'rgba(245,241,232,0.62)' }}>
                  ¿Sin acceso todavía? <a href="https://ephirox.com/#llevarlo" className="eph-login-footer-link">Solicitar cohorte</a>
                </p>
              </form>
            )}
          </div>

        </div>
      </div>

      <style jsx>{`
        .eph-login-page {
          min-height: 100dvh;
          width: 100%;
          background: ${PAGE_BG};
          display: flex;
          align-items: center;
          justify-content: center;
          padding: clamp(0px, 4vw, 56px) clamp(0px, 4vw, 48px);
        }
        .eph-login-card {
          max-width: 1060px;
          width: 100%;
          display: flex;
          flex-wrap: wrap;
          border-radius: clamp(0px, 2vw, 22px);
          overflow: hidden;
          border: 1px solid rgba(201, 166, 107, 0.16);
          box-shadow: 0 60px 120px -60px rgba(0, 0, 0, 0.95);
        }
        .eph-login-brand {
          flex: 1 1 400px;
          position: relative;
          overflow: hidden;
          background: #100d0a;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: clamp(38px, 6vw, 64px) 32px;
          min-height: clamp(240px, 34vw, 620px);
        }
        .eph-login-mark {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 18px;
        }
        .eph-login-lockup {
          width: clamp(180px, 26vw, 300px);
          height: auto;
          display: block;
        }
        .eph-login-tagline {
          margin: 0;
          font-style: italic;
          font-weight: 500;
          font-size: clamp(17px, 2vw, 21px);
          letter-spacing: 0.01em;
          color: ${GOLD};
        }
        .eph-login-caption {
          position: absolute;
          left: 50%;
          bottom: clamp(20px, 5vw, 40px);
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 14px;
          white-space: nowrap;
          font-weight: 300;
          font-size: 11px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: rgba(245, 241, 232, 0.55);
        }
        .eph-login-caption-line {
          width: 28px;
          height: 1px;
          background: rgba(201, 166, 107, 0.5);
        }
        .eph-login-form-panel {
          flex: 1 1 400px;
          background: #1a160f;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 22px;
          padding: clamp(30px, 5vw, 56px) clamp(24px, 4.4vw, 52px) calc(clamp(30px, 5vw, 56px) + env(safe-area-inset-bottom));
        }
        .eph-login-title {
          margin: 0;
          font-weight: 300;
          font-size: clamp(26px, 3.4vw, 34px);
          line-height: 1.1;
          color: #fbf8f1;
        }
        .eph-login-label {
          font-weight: 400;
          font-size: 10px;
          letter-spacing: 0.2em;
          color: ${GOLD};
        }
        .eph-login-input {
          box-sizing: border-box;
          width: 100%;
          height: 52px;
          padding: 0 16px;
          border-radius: 10px;
          border: 1px solid rgba(245, 241, 232, 0.16);
          background: #221c15;
          color: #f5f1e8;
          font-weight: 300;
          font-size: 16px;
          outline: none;
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        .eph-login-input::placeholder {
          color: rgba(245, 241, 232, 0.42);
        }
        .eph-login-input:focus {
          border-color: ${GOLD};
          background: #261f16;
        }
        .eph-login-input.has-error {
          border-color: ${ERROR_COLOR};
        }
        .eph-login-error-text {
          margin: 0;
          font-size: 13px;
          font-weight: 300;
          color: ${ERROR_COLOR};
        }
        .eph-login-pwd-toggle {
          position: absolute;
          top: 50%;
          right: 8px;
          transform: translateY(-50%);
          height: 40px;
          min-width: 52px;
          padding: 0 8px;
          background: transparent;
          border: none;
          font-weight: 400;
          font-size: 11px;
          letter-spacing: 0.12em;
          color: ${GOLD};
          cursor: pointer;
        }
        .eph-login-pwd-toggle:hover {
          color: #e4c88f;
        }
        .eph-login-forgot-link {
          background: none;
          border: none;
          padding: 0;
          margin: 0;
          font-weight: 300;
          font-size: 13px;
          color: ${GOLD};
          cursor: pointer;
          min-height: 44px;
          display: inline-flex;
          align-items: center;
        }
        .eph-login-forgot-link:hover {
          color: #e4c88f;
        }
        .eph-login-checkbox-row {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 44px;
          cursor: pointer;
          user-select: none;
        }
        .eph-login-checkbox-box {
          flex-shrink: 0;
          width: 20px;
          height: 20px;
          border-radius: 5px;
          border: 1px solid rgba(201, 166, 107, 0.65);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s ease, border-color 0.15s ease;
        }
        .eph-login-checkbox-box.is-checked {
          background: ${GOLD};
          border-color: ${GOLD};
        }
        .eph-login-checkbox-input:focus-visible + .eph-login-checkbox-box {
          outline: 2px solid ${GOLD};
          outline-offset: 2px;
        }
        .eph-login-submit {
          width: 100%;
          height: 56px;
          border-radius: 10px;
          border: none;
          background: linear-gradient(180deg, #d9b87c, #c09a5c);
          color: #17130e;
          font-weight: 500;
          font-size: 13px;
          letter-spacing: 0.26em;
          text-indent: 0.26em;
          box-shadow: 0 16px 34px -20px rgba(201, 166, 107, 0.9);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s ease, transform 0.1s ease;
        }
        .eph-login-submit:hover:not(:disabled) {
          background: linear-gradient(180deg, #e4c88f, #cba669);
        }
        .eph-login-submit:active:not(:disabled) {
          transform: translateY(1px);
        }
        .eph-login-submit:disabled {
          cursor: not-allowed;
          opacity: 0.85;
        }
        .eph-login-divider-line {
          flex: 1;
          height: 1px;
          background: rgba(245, 241, 232, 0.14);
        }
        .eph-login-social-btn {
          flex: 1 1 140px;
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border-radius: 10px;
          border: 1px solid rgba(245, 241, 232, 0.18);
          background: transparent;
          color: #f5f1e8;
          font-weight: 300;
          font-size: 15px;
          cursor: pointer;
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        .eph-login-social-btn:hover:not(:disabled) {
          border-color: rgba(201, 166, 107, 0.6);
          background: rgba(201, 166, 107, 0.06);
        }
        .eph-login-social-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .eph-login-footer-link {
          color: ${GOLD};
          text-decoration: none;
        }
        .eph-login-footer-link:hover {
          text-decoration: underline;
        }
        .eph-login-forgot-link:focus-visible,
        .eph-login-pwd-toggle:focus-visible,
        .eph-login-submit:focus-visible,
        .eph-login-social-btn:focus-visible,
        .eph-login-input:focus-visible,
        .eph-login-footer-link:focus-visible {
          outline: 2px solid ${GOLD};
          outline-offset: 2px;
        }
      `}</style>
    </>
  );
}
