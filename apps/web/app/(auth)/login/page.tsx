'use client';

import React, { useState, useEffect, useRef, useCallback, type FormEvent } from 'react';
import {
  loginRequest, saveSession, type LoginResult,
  fetchGoogleClientId, googleLoginRequest,
  fetchAppleClientId, appleLoginRequest,
  forgotPasswordRequest,
} from '@/lib/api-client';
import { getSafeRedirectTarget, getSetPasswordUrl } from '@/lib/login-redirect';
import BrandRing from '@/components/ui/BrandRing';
import Button from '@/components/ui/Button';

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
interface GoogleIdentityNamespace {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
        use_fedcm_for_prompt?: boolean;
      }) => void;
      renderButton: (
        parent: HTMLElement,
        options: { theme?: string; size?: string; shape?: string; width?: number; text?: string }
      ) => void;
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
// PÁGINA DE LOGIN — Split Screen, identidad Ephirox (reskin, ver plan de
// reskin): fondo --eph-bg en toda la pantalla, sin variante día/noche.
// Los valores de abajo apuntan a los tokens --eph-* (no son hex fijos) —
// se usan vía `style` porque las clases Tailwind arbitrarias construidas
// con interpolación de variables JS (`` `border-[${X}]` ``) no generan CSS
// real: el content-scanner de Tailwind lee el texto fuente sin evaluar, así
// que nunca ve el valor final. Donde se necesita una clase (no un `style`),
// el token va escrito literal en el string (ver inputClasses/labelClasses).
// ============================================================

const LOGIN_PANEL_BG = 'var(--eph-bg)';
const FORM_INK_MUTED = 'var(--eph-muted)';
const FORM_BORDER = 'var(--eph-line-2)';
const FORM_ACCENT = 'var(--eph-accent)';
// Anula la altura/padding por defecto de Button (pensados para pantallas de
// contenido) solo en el login — acá el CTA debe leerse como un acento
// discreto, no un bloque dominante, sin tocar el componente compartido.
const LOGIN_PRIMARY_BUTTON_STYLE: React.CSSProperties = { minHeight: 38, padding: '9px 30px', fontSize: 10 };

type LoginView = 'login' | 'forgot';

export default function LoginPage(): React.ReactElement {
  const [view, setView] = useState<LoginView>('login');

  // --- Login state ---
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

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
  // El botón se desmonta y remonta cada vez que se cambia de vista
  // (login -> recuperar/registro -> login), porque ese bloque de JSX vive
  // dentro de un ternario por `view`. google.accounts.id.renderButton()
  // solo pinta en el nodo del DOM que existía cuando se llamó, así que un
  // ref de objeto normal + un efecto con deps [] deja el botón vacío al
  // volver a 'login' (el nuevo nodo nunca recibe el render). Un callback
  // ref + estos valores guardados en refs permiten volver a pintar el
  // botón cada vez que el nodo se remonta, sin repetir el fetch del
  // client ID ni el `initialize()`.
  const googleButtonNodeRef = useRef<HTMLDivElement | null>(null);
  const googleClientIdRef = useRef<string | null>(null);
  const googleInitializedRef = useRef(false);
  const [googleReady, setGoogleReady] = useState(false);
  // Altura fija que comparten el botón de Google y el de Apple. Se probó
  // medir el alto real del iframe de Google con ResizeObserver para que
  // Apple lo replicara exactamente, pero el iframe reporta tamaños
  // inestables mientras termina de cargar (a veces valores chicos de
  // transición) — eso encogía el botón de Apple y dejaba un hueco debajo
  // del de Google. Un valor fijo es menos "perfecto" pero siempre estable.
  const GOOGLE_APPLE_BUTTON_HEIGHT = 36;

  const renderGoogleButtonIfReady = useCallback(() => {
    const node = googleButtonNodeRef.current;
    const clientId = googleClientIdRef.current;
    if (!node || !clientId || typeof window === 'undefined' || !window.google?.accounts) return;
    // Ancho fijo (170) desbordaba el botón de Google fuera de su mitad de la
    // fila en pantallas angostas, tapando el de Apple al lado — se mide el
    // espacio real disponible (el wrapper flex-1) en vez de un valor fijo.
    // En mobile los botones se apilan a ancho completo (ver flex-col más
    // abajo): el tope debe ser el máximo real de Google (400), no un valor
    // menor arbitrario — con un tope más chico, Google quedaba centrado y
    // angosto mientras Apple ocupaba el 100% del ancho, otra vez desparejos.
    const available = node.parentElement?.clientWidth || 200;
    window.google.accounts.id.renderButton(node, {
      theme: 'filled_black',
      size: 'medium',
      shape: 'rectangular',
      width: Math.max(200, Math.min(400, available)),
      text: 'continue_with',
    });
    setGoogleReady(true);
  }, []);

  const setGoogleButtonNode = useCallback((node: HTMLDivElement | null) => {
    googleButtonNodeRef.current = node;
    if (node) renderGoogleButtonIfReady();
  }, [renderGoogleButtonIfReady]);

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
        saveSession(result.token);
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
      googleClientIdRef.current = clientId;
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
      renderGoogleButtonIfReady();
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
        saveSession(result.token);
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
        saveSession(result.token);
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

  const inputClasses =
    'block w-full h-10 border-0 border-b border-[var(--eph-line-2)] rounded-none bg-transparent px-0.5 py-1.5 font-body text-[18px] font-normal text-[var(--eph-text)] outline-none transition-colors placeholder:text-[var(--eph-muted)] placeholder:opacity-70 focus:border-[var(--eph-accent)]';
  const labelClasses =
    'block font-mono text-[10px] font-normal uppercase tracking-[0.18em] text-[var(--eph-muted)]';

  const socialButtons = (
    <>
      <div className="flex items-center gap-2.5 my-4">
        <span className="flex-1 h-px" style={{ background: FORM_BORDER }} />
        <span className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: FORM_INK_MUTED }}>o continúa con</span>
        <span className="flex-1 h-px" style={{ background: FORM_BORDER }} />
      </div>
      {/* Siempre apilados (nunca lado a lado): el botón nativo de Google
          tiene un ancho mínimo real (~200px) que no cede aunque su
          contenedor sea más angosto — en una fila de dos columnas, ese piso
          lo hacía desbordar sobre el botón de Apple en paneles angostos.
          A ancho completo, el contenedor siempre supera ese mínimo (tiene
          que caber el mismo ancho que los inputs de email/contraseña). */}
      <div className="flex flex-col gap-3">
        <div className="relative flex items-center justify-center" style={{ height: GOOGLE_APPLE_BUTTON_HEIGHT }}>
          {!googleReady && (
            <div
              aria-hidden="true"
              className="absolute inset-0 flex items-center justify-center gap-2 rounded-none border font-body"
              style={{ background: 'transparent', color: FORM_INK_MUTED, borderColor: FORM_BORDER, fontSize: 12, opacity: 0.85 }}
            >
              <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.7-.4-3.5z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.6 3 24 3 16.3 3 9.7 7.3 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 45c5.5 0 10.4-2.1 14.1-5.6l-6.5-5.5C29.6 35.6 26.9 37 24 37c-5.3 0-9.7-3.3-11.3-8l-6.6 5.1C9.6 40.6 16.3 45 24 45z"/>
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.5 5.5C40.9 36.6 45 30.9 45 24c0-1.4-.1-2.7-.4-3.5z"/>
              </svg>
              Google
            </div>
          )}
          <div ref={setGoogleButtonNode} className="flex justify-center" style={{ opacity: 0.85 }} />
        </div>

        <button
          type="button"
          onClick={appleReady ? handleAppleClick : undefined}
          disabled={!appleReady}
          title={appleReady ? undefined : 'Próximamente'}
          aria-disabled={!appleReady}
          className="w-full rounded-none border font-body flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60 transition-colors duration-150 hover:border-[var(--eph-accent)]"
          style={{ background: 'transparent', color: FORM_INK_MUTED, borderColor: FORM_BORDER, height: GOOGLE_APPLE_BUTTON_HEIGHT, fontSize: 12 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.08-2.383 1.39-2.383 4.26 0 3.4 2.982 4.55 3.043 4.57z" />
          </svg>
          Apple
        </button>
      </div>
    </>
  );

  return (
    <>

      {/* Pantalla transitoria mientras se procesa el login (con Google o con
          email/contraseña) y se entra a la plataforma — cubre el tramo hasta
          la navegación a "/", que si no se cubre se ve como si "regresara"
          al login sin cambios por un instante. */}
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
        {/* md:min-h fija un tamaño de tarjeta estándar — no debe crecer o
            encogerse según cuántos botones tenga cada formulario (login,
            registro, recuperar contraseña). */}
        <div className="max-w-4xl w-full md:min-h-[600px] grid grid-cols-1 md:grid-cols-2 rounded-none border overflow-hidden" style={{ borderColor: 'var(--eph-line)' }}>

          {/* ========== LADO IZQUIERDO — IDENTIDAD EPHIROX ========== */}
          <div className="relative overflow-hidden p-12 flex flex-col items-center justify-center text-center" style={{ background: LOGIN_PANEL_BG }}>
            <div
              className="pointer-events-none absolute rounded-full"
              style={{
                width: 320, height: 320, top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                background: 'radial-gradient(circle, rgba(201,164,106,.18) 0%, transparent 70%)',
              }}
            />
            {/* Envuelto aparte para que el centrado vertical del panel (flex
                justify-center) se calcule SOLO con este bloque — el texto de
                pie de página de abajo va con position:absolute, fuera del
                flujo, así nunca desplaza este centrado. */}
            <div className="relative z-[1] flex flex-col items-center">
              <BrandRing size={64} />
              <h1 className="font-display text-3xl font-normal uppercase tracking-[0.18em] mt-5 mb-2" style={{ color: 'var(--eph-text)' }}>Ephirox</h1>
              <p className="font-display italic text-[13px]" style={{ color: FORM_ACCENT }}>Redefining limits.</p>
            </div>
            <p
              className="absolute left-0 right-0 z-[1] font-mono text-center"
              style={{ bottom: 40, fontSize: 10, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.16em', color: FORM_INK_MUTED, opacity: 0.4 }}
            >
              Sistema de optimización ejecutiva
            </p>
          </div>

          {/* ========== LADO DERECHO — FORMULARIO ========== */}
          <div className="p-12 flex flex-col justify-center" style={{ background: LOGIN_PANEL_BG }}>
            {view === 'forgot' && (
              <h2 className="font-display text-[28px] font-normal mb-10" style={{ color: 'var(--eph-text)' }}>
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
                      <label htmlFor="forgot-email" className={labelClasses}>Email</label>
                      <input
                        id="forgot-email"
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
              <form onSubmit={handleLogin} className="w-full space-y-4" noValidate>
                {loginError && (
                  <div role="alert" className="rounded-none border px-4 py-3 font-body text-sm" style={{ borderColor: 'var(--eph-danger)', background: 'rgba(138,74,60,0.14)', color: 'var(--eph-text)' }}>
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
                <div className="flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 font-body text-sm cursor-pointer select-none" style={{ color: FORM_INK_MUTED }}>
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded-none"
                      style={{ accentColor: FORM_ACCENT, borderColor: FORM_BORDER }}
                    />
                    Recuérdame
                  </label>
                  <Button
                    type="button"
                    variant="tertiary"
                    onClick={() => { setView('forgot'); setLoginError(null); }}
                  >
                    ¿Olvidaste tu contraseña?
                  </Button>
                </div>
                <Button type="submit" variant="primary" disabled={loginLoading} className="w-full" style={LOGIN_PRIMARY_BUTTON_STYLE}>
                  {loginLoading ? (<span className="flex items-center gap-2"><svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>Ingresando…</span>) : 'Entrar'}
                </Button>

                {socialButtons}
              </form>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
