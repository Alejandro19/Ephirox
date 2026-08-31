// Resolución de tema Ephirox — única fuente de verdad (ver
// docs/EPHIROX-spec-temas.md §1.2). Login, Splash y Dashboard quedan
// bloqueados en dark-brand y nunca muestran el toggle; todo lo demás
// alterna dark-carbon / light-premium según la preferencia guardada.

export type ThemeMode = "dark" | "light";
export type Theme = "dark-brand" | "dark-carbon" | "light-premium";

const BRAND_LOCKED = new Set(["login", "splash", "dashboard"]);

export function resolveTheme(screen: string, mode: ThemeMode): Theme {
  if (BRAND_LOCKED.has(screen)) return "dark-brand";
  return mode === "light" ? "light-premium" : "dark-carbon";
}

export function isBrandLockedScreen(screen: string): boolean {
  return BRAND_LOCKED.has(screen);
}

export const THEME_MODE_STORAGE_KEY = "ephirox.theme-mode";

// Los 8 módulos con toggle (ver spec §1.1). Cualquier otra ruta (dashboard,
// login, configuración, admin, terapeuta, auth) no está cubierta por el
// spec de reskin y se trata como 'dashboard': dark-brand, sin toggle.
const TOGGLEABLE_MODULE_PATHS = [
  "/onboarding",
  "/training",
  "/nutrition",
  "/cortisol",
  "/rest",
  "/blindspot",
  "/community",
  "/evolution",
];

export function screenForPathname(pathname: string): string {
  if (pathname === "/login") return "login";
  if (
    TOGGLEABLE_MODULE_PATHS.some(
      (base) => pathname === base || pathname.startsWith(`${base}/`)
    )
  ) {
    return "module";
  }
  return "dashboard";
}

export function readStoredThemeMode(): ThemeMode {
  try {
    const stored = window.localStorage.getItem(THEME_MODE_STORAGE_KEY);
    return stored === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}
