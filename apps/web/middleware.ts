import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/therapist-login", "/reset-password", "/_next", "/api", "/icon", "/apple-icon", "/landing", "/terminos", "/privacidad"];
const STATIC_EXTS = /\.(svg|png|jpg|jpeg|gif|ico|css|js|woff2?)$/;

// ephirox.com/www es el dominio público de marketing (landing B2B); el
// producto (login, dashboard, NFC, etc.) vive en app.ephirox.com. Un solo
// deployment de Vercel sirve ambos dominios — esta rama decide cuál mostrar
// según el Host, antes de que corra el auth-gate de abajo (que solo aplica
// al dominio del producto).
const MARKETING_HOSTS = new Set(["ephirox.com", "www.ephirox.com"]);
const MARKETING_ASSET_PATHS = ["/_next", "/favicon", "/icon", "/apple-icon"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // `request.nextUrl.hostname` no sirve para esto: en `next dev` siempre
  // devuelve el host real del servidor (localhost), ignorando el header Host
  // que mandó el cliente — confirmado corriendo el server local con un Host
  // spoofeado. El header crudo sí refleja el dominio pedido, tanto en local
  // como en producción (Vercel).
  const host = (request.headers.get("host") || "").split(":")[0];

  if (MARKETING_HOSTS.has(host)) {
    const isAsset =
      MARKETING_ASSET_PATHS.some((p) => pathname.startsWith(p)) ||
      STATIC_EXTS.test(pathname);

    if (isAsset) {
      return NextResponse.next();
    }
    if (pathname === "/") {
      return NextResponse.rewrite(new URL("/landing", request.url));
    }
    // Términos y Privacidad son públicos en ambos dominios (linkeados desde
    // el footer de la landing) — se sirven tal cual en vez de mandarse al
    // dominio del producto como el resto de rutas de acá abajo.
    if (pathname === "/terminos" || pathname === "/privacidad") {
      return NextResponse.next();
    }
    // Cualquier otra ruta pedida en el dominio de marketing (bookmarks
    // viejos de clientes reales, el NFC antes de reprogramarse, links de
    // correos con WEB_APP_URL desactualizado) se manda al dominio real del
    // producto, preservando path y query string.
    const target = new URL(request.url);
    target.hostname = "app.ephirox.com";
    target.port = "";
    return NextResponse.redirect(target, 307);
  }

  // Allow public paths and static assets
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    STATIC_EXTS.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Check for token in cookie or Authorization header
  const token =
    request.cookies.get("latribu_token")?.value ||
    request.headers.get("Authorization")?.replace("Bearer ", "");

  if (!token) {
    // Sin esto, entrar sin sesión a /therapist rebotaba al login de
    // clientes — un terapeuta que escribía bien su contraseña ahí recibía
    // "Credenciales incorrectas" porque ese formulario pega contra
    // /api/auth/login (tabla clients), nunca contra /api/auth/therapist/login.
    const isTherapistPath = pathname === "/therapist" || pathname.startsWith("/therapist/");
    const loginUrl = new URL(isTherapistPath ? "/therapist-login" : "/login", request.url);
    // Se preserva también el query string (no solo el pathname) — sin esto,
    // un cliente que tapea el sticker NFC (/training?m=entrenamiento&a=confirmar)
    // con la sesión vencida perdía la acción pendiente al pasar por /login.
    loginUrl.searchParams.set("from", pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */ 
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};