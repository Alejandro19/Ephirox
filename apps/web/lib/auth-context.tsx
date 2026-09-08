"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import {
  clearSession,
  fetchAuthMe,
  loginRequest,
  decodeTokenPayload,
  AuthInvalidError,
  type LoginResult,
} from "./api-client";

type AuthUser = {
  id: string;
  name: string;
  email: string;
};

type AuthState = {
  // Antes era `token: string | null` — el string en sí nunca se usaba fuera
  // de acá (ni AppShell.tsx ni nada más lo mandaban a ningún lado), solo se
  // chequeaba su presencia. Ahora la sesión vive en una cookie httpOnly que
  // el frontend nunca ve, así que el campo pasa a ser lo que siempre fue en
  // la práctica: un booleano.
  isAuthenticated: boolean;
  role: "admin" | "cliente" | "terapeuta" | null;
  user: AuthUser | null;
  permissions: Record<string, boolean>;
  moduleAccess: Record<string, boolean>;
  clientType: string | null;
  onboardingComplete: boolean;
  planExpired: boolean;
  planEndDate: string | null;
  // Idioma de la interfaz fija (Configuración > Idioma) — 'es' | 'en', 'es' por defecto.
  language: string;
  // Solo relevante para terapeutas — ver auth.controller.ts::me.
  mustChangePassword: boolean;
  isLoading: boolean;
  isAuthLoading: boolean;
};

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  showAuthLoading: () => void;
  hideAuthLoading: () => void;
  // Actualiza el estado en memoria de inmediato (toda la app cambia de
  // idioma sin recargar) — quien llame a esto es responsable de persistirlo
  // en el backend (ver PanelConfiguracion.jsx).
  setLanguage: (language: string) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const initialState: AuthState = {
  isAuthenticated: false,
  role: null,
  user: null,
  permissions: {},
  moduleAccess: {},
  clientType: null,
  onboardingComplete: false,
  planExpired: false,
  planEndDate: null,
  language: "es",
  mustChangePassword: false,
  isLoading: true,
  isAuthLoading: false,
};

function decodeUserFromToken(token: string): AuthUser | null {
  const payload = decodeTokenPayload<{ id?: string; name?: string; email?: string }>(token);
  if (!payload?.id) return null;
  return { id: payload.id, name: payload.name ?? "", email: payload.email ?? "" };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);

  const showAuthLoading = useCallback(() => {
    setState((prev) => ({ ...prev, isAuthLoading: true }));
  }, []);

  const hideAuthLoading = useCallback(() => {
    setState((prev) => ({ ...prev, isAuthLoading: false }));
  }, []);

  const logout = useCallback(() => {
    void clearSession();
    setState({ ...initialState, isLoading: false, isAuthLoading: false });
  }, []);

  const refreshAuth = useCallback(async () => {
    // Ya no hay forma de chequear "hay sesión" del lado del cliente antes de
    // preguntar — la cookie es httpOnly. Este mismo hook corre en TODAS las
    // páginas (incluida la landing pública, montado en el layout raíz), así
    // que un 401 acá es el estado normal de un visitante anónimo, no un
    // error: nunca redirige por su cuenta. Las páginas protegidas ya se
    // cubren solas — middleware.ts del lado del servidor antes de renderizar
    // nada, y AppShell.tsx (`!isAuthenticated`) si el estado cambia a
    // "no autenticado" mientras el usuario ya está adentro.
    const MAX_ATTEMPTS = 5;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const data = await fetchAuthMe();
        setState({
          isAuthenticated: true,
          role: data.role ?? null,
          user: data.user ?? null,
          permissions: data.permissions ?? {},
          moduleAccess: data.moduleAccess ?? {},
          clientType: data.clientType ?? null,
          onboardingComplete: !!data.onboardingComplete,
          planExpired: !!data.planExpired,
          planEndDate: data.planEndDate ?? null,
          language: data.language ?? "es",
          mustChangePassword: !!data.mustChangePassword,
          isLoading: false,
          isAuthLoading: false,
        });
        return;
      } catch (e: unknown) {
        const isAuthInvalid = e instanceof AuthInvalidError;
        // Justo después de un login (ej. redirect de NFC a través de un
        // túnel), esta primera llamada a /auth/me puede fallar por un motivo
        // transitorio (red, cold-start del túnel) sin que la sesión en sí
        // sea inválida — tratarlo igual que un 401 real cerraba una sesión
        // recién iniciada y obligaba a loguearse dos veces. Solo un
        // AuthInvalidError (401/403, sesión real y verdaderamente inválida)
        // corta de inmediato; cualquier otro fallo reintenta antes de
        // darse por vencido.
        if (!isAuthInvalid && attempt < MAX_ATTEMPTS) {
          await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
          continue;
        }
        // Best-effort — si la cookie ya está vencida/ausente esto no hace
        // nada útil, pero si quedó una cookie inválida pero presente, la
        // limpia. No es crítico: es de sesión, se va sola al cerrar el
        // navegador de todos modos.
        void clearSession();
        setState({ ...initialState, isLoading: false, isAuthLoading: false });
        return;
      }
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginRequest(email, password);
    if (result.success) {
      setState({
        isAuthenticated: true,
        role: result.role ?? null,
        // result.token viene en el body además de la cookie (para tooling y
        // compatibilidad de tests del backend) — usarlo acá para el fallback
        // es seguro porque es un valor transitorio de esta respuesta, nunca
        // se guarda en ningún lado persistente.
        user: result.user ?? (result.token ? decodeUserFromToken(result.token) : null),
        permissions: result.permissions ?? {},
        moduleAccess: result.moduleAccess ?? {},
        clientType: result.clientType ?? null,
        onboardingComplete: !!result.onboardingComplete,
        planExpired: !!result.planExpired,
        planEndDate: result.planEndDate ?? null,
        language: result.language ?? "es",
        mustChangePassword: !!result.mustChangePassword,
        isLoading: false,
        isAuthLoading: false,
      });
    }
    return result;
  }, []);

  const setLanguage = useCallback((language: string) => {
    setState((prev) => ({ ...prev, language }));
  }, []);

  useEffect(() => { refreshAuth(); }, [refreshAuth]);

  const value: AuthContextValue = {
    ...state, login, logout, refreshAuth,
    showAuthLoading, hideAuthLoading, setLanguage,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}