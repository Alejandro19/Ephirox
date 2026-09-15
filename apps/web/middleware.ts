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
    // /landing servía el mismo contenido que "/" (arriba) como una segunda
    // URL indexable — Google veía ephirox.com/ y ephirox.com/landing como
    // páginas distintas con contenido idéntico (contenido duplicado). 301
    // a "/" para que /landing deje de existir como URL viva y todo el
    // tráfico/señal de indexación se consolide en la raíz.
    if (pathname === "/landing") {
      return NextResponse.redirect(new URL("/", request.url), 301);
    }
    // Términos y Privacidad son públicos en el dominio de marketing — se
    // sirven tal cual en vez de mandarse al dominio del producto como el
    // resto de rutas de acá abajo.
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

  let response: NextResponse;

  // Allow public paths and static assets
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    STATIC_EXTS.test(pathname)
  ) {
    response = NextResponse.next();
  } else {
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
      response = NextResponse.redirect(loginUrl);
    } else {
      response = NextResponse.next();
    }
  }

  // app.ephirox.com es el producto (login, dashboard, NFC) — no debería
  // aparecer en resultados de Google, a diferencia del dominio de marketing
  // de arriba. Header en vez de un <meta robots> porque cubre TODAS las
  // rutas de este host (incluidas las que redirigen a /login) desde un solo
  // lugar, sin depender de que cada página lo declare por su cuenta.
  if (host === "app.ephirox.com") {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  return response;
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