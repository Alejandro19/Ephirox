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
  getSessionToken,
  saveSession,
  clearSession,
  fetchAuthMe,
  loginRequest,
  registerRequest,
  decodeTokenPayload,
  AuthInvalidError,
  type LoginResult,
  type RegisterResult,
} from "./api-client";

type AuthUser = {
  id: string;
  name: string;
  email: string;
};

type AuthState = {
  token: string | null;
  role: "admin" | "cliente" | "terapeuta" | null;
  user: AuthUser | null;
  permissions: Record<string, boolean>;
  clientType: string | null;
  onboardingComplete: boolean;
  planExpired: boolean;
  planEndDate: string | null;
  isLoading: boolean;
  isAuthLoading: boolean;
};

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<LoginResult>;
  register: (name: string, email: string) => Promise<RegisterResult>;
  googleLogin: (credential: string) => Promise<LoginResult>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  showAuthLoading: () => void;
  hideAuthLoading: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const initialState: AuthState = {
  token: null,
  role: null,
  user: null,
  permissions: {},
  clientType: null,
  onboardingComplete: false,
  planExpired: false,
  planEndDate: null,
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
    clearSession();
    setState({ ...initialState, isLoading: false, isAuthLoading: false });
  }, []);

  const refreshAuth = useCallback(async () => {
    const token = getSessionToken();
    if (!token) {
      setState((prev) => ({ ...prev, isLoading: false, isAuthLoading: false }));
      return;
    }
    // Justo después de un login (ej. redirect de NFC a través de un túnel),
    // esta primera llamada a /auth/me puede fallar por un motivo transitorio
    // (red, cold-start del túnel) sin que el token en sí sea inválido —
    // tratarlo igual que un 401 real cerraba una sesión recién iniciada y
    // obligaba a loguearse dos veces. Solo un AuthInvalidError (401/403)
    // cierra sesión de inmediato; cualquier otro fallo reintenta un par de
    // veces antes de darse por vencido.
    const MAX_ATTEMPTS = 5;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const data = await fetchAuthMe();
        setState({
          token,
          role: data.role ?? null,
          user: data.user ?? decodeUserFromToken(token),
          permissions: data.permissions ?? {},
          clientType: data.clientType ?? null,
          onboardingComplete: !!data.onboardingComplete,
          planExpired: !!data.planExpired,
          planEndDate: data.planEndDate ?? null,
          isLoading: false,
          isAuthLoading: false,
        });
        return;
      } catch (e: unknown) {
        const isAuthInvalid = e instanceof AuthInvalidError;
        if (!isAuthInvalid && attempt < MAX_ATTEMPTS) {
          await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
          continue;
        }
        // Token realmente inválido (JWT_SECRET diferente entre APIs, expirado,
        // cuenta inactiva) o fallo transitorio persistente tras reintentar:
        // limpiar sesión y forzar redirect a login para que el middleware de
        // Next.js redirija correctamente. Sin window.location.href, las
        // páginas protegidas harían flash del contenido antes de redirigir.
        clearSession();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        setState({ ...initialState, isLoading: false, isAuthLoading: false });
        return;
      }
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginRequest(email, password);
    if (result.success && result.token) {
      saveSession(result.token);
      setState({
        token: result.token,
        role: result.role ?? null,
        user: result.user ?? decodeUserFromToken(result.token),
        permissions: result.permissions ?? {},
        clientType: result.clientType ?? null,
        onboardingComplete: !!result.onboardingComplete,
        planExpired: !!result.planExpired,
        planEndDate: result.planEndDate ?? null,
        isLoading: false,
        isAuthLoading: false,
      });
    }
    return result;
  }, []);

  // La solicitud de membresía ("Solicita tu membresía") no crea sesión —
  // el cliente queda "inactive" hasta que un admin lo active, así que acá
  // no hay token/estado de auth que setear, solo se propaga el resultado.
  const register = useCallback(async (name: string, email: string) => {
    return registerRequest(name, email, 'membership_request');
  }, []);

  // Google login — conservado para cuando se reactive, pero no usado por la UI de Fase 0
  const googleLogin = useCallback(async (credential: string) => {
    const res = await fetch(`http://localhost:3003/api/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ credential }),
    });
    const result: LoginResult = await res.json();
    if (result.success && result.token) {
      saveSession(result.token);
      setState({
        token: result.token,
        role: result.role ?? null,
        user: result.user ?? decodeUserFromToken(result.token),
        permissions: result.permissions ?? {},
        clientType: result.clientType ?? null,
        onboardingComplete: !!result.onboardingComplete,
        planExpired: !!result.planExpired,
        planEndDate: result.planEndDate ?? null,
        isLoading: false,
        isAuthLoading: false,
      });
    }
    return result;
  }, []);

  useEffect(() => { refreshAuth(); }, [refreshAuth]);

  const value: AuthContextValue = {
    ...state, login, register, googleLogin, logout, refreshAuth,
    showAuthLoading, hideAuthLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}