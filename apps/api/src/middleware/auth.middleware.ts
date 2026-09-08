import type { Request, Response, NextFunction } from 'express';
import { verifyToken, isPlanExpired, type TokenPayload } from '../services/auth.service.js';
import { findClientAuthRowById, type ClientAuthRow } from '../services/clients.service.js';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      client?: ClientAuthRow;
      planExpired?: boolean;
    }
  }
}

function unauthorized(res: Response, message: string, status = 401) {
  return res.status(status).json({ success: false, error: message });
}

// Cookie httpOnly como mecanismo principal de sesión (ver auditoría de
// seguridad: antes el JWT vivía en sessionStorage + una cookie legible por
// JS, robable por cualquier XSS en cualquier parte del sitio — ahora el
// frontend nunca ve el token, el navegador la adjunta solo). Sesión, no
// persistente (sin maxAge/expires): se borra al cerrar el navegador, mismo
// comportamiento que tenía sessionStorage antes; el JWT igual expira solo
// del lado del servidor (JWT_EXPIRES_IN) sin importar cuánto dure la cookie.
const isProd = process.env.NODE_ENV === 'production';
// Sin domain explícito, una cookie queda atada al host EXACTO que la fija —
// api.ephirox.com nunca sería visible para app.ephirox.com (que es quien
// necesita leerla, ver middleware.ts). Default seguro en producción para que
// esto funcione de fábrica sin depender de que alguien recuerde configurar
// la variable de entorno — mismo criterio que CORS_ORIGINS en app.ts.
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || (isProd ? '.ephirox.com' : undefined);
const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax' as const,
  domain: COOKIE_DOMAIN,
  path: '/',
};

export function setSessionCookie(res: Response, token: string): void {
  res.cookie('latribu_token', token, SESSION_COOKIE_OPTIONS);
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie('latribu_token', SESSION_COOKIE_OPTIONS);
}

// El header Authorization sigue soportado (llamadas server-to-server, tests)
// pero el frontend ya no lo arma a mano — manda la cookie automáticamente
// vía `credentials: 'include'`. Una navegación de página completa (ej. el
// redirect a un proveedor OAuth de wearables, ver wearable.routes.ts)
// tampoco podría llevar headers custom de todos modos, solo cookies.
function readCookieToken(req: Request): string | null {
  const raw = req.headers.cookie;
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === 'latribu_token') {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return null;
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : readCookieToken(req);
  if (!token) return unauthorized(res, 'Token requerido.');

  let payload: TokenPayload;
  try {
    payload = verifyToken(token);
  } catch {
    return unauthorized(res, 'Token inválido o expirado.');
  }

  if (payload.role === 'cliente') {
    let client: ClientAuthRow | null;
    try {
      client = await findClientAuthRowById(payload.id);
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === '22P02') {
        // El id del JWT no tiene forma de UUID válido — tratar igual que
        // "cliente no encontrado", nunca dejar la petición colgada.
        return unauthorized(res, 'Tu cuenta está inactiva. Contacta al administrador.', 403);
      }
      return next(error);
    }
    if (!client || client.status === 'inactive') {
      return unauthorized(res, 'Tu cuenta está inactiva. Contacta al administrador.', 403);
    }
    req.client = client;
    req.planExpired = isPlanExpired(client);
  }

  req.user = payload;
  next();
}

export function adminOnly(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') return unauthorized(res, 'Acceso restringido a administradores.', 403);
  next();
}

export function therapistOnly(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'terapeuta') return unauthorized(res, 'Acceso restringido a terapeutas.', 403);
  next();
}

export function clientOnly(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'cliente') return unauthorized(res, 'Acceso restringido a clientes.', 403);
  next();
}

export function ownerOrAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role === 'admin') return next();
  if (req.user?.id === req.params.id) return next();
  return unauthorized(res, 'No tienes permiso para acceder a estos datos.', 403);
}

// Acceso no restrictivo (estilo Oura): un cliente vencido navega la app con
// normalidad — ownerOrAdmin ya no lo bloquea a nivel de cuenta. La única
// excepción "sin excepciones" que sigue en pie es Presencial: no puede
// registrar más clases de un paquete vencido, sin importar sesiones_restantes
// (ver manual-migrations y clients.service.ts::activatePaidPlan). Este
// middleware es ese único bloqueo puntual — se monta solo en
// confirm-session, no en el resto de rutas.
export function blockExpiredPresencialSession(req: Request, res: Response, next: NextFunction) {
  if (req.planExpired && req.client?.clientType === 'coaching_1_1') {
    return unauthorized(res, 'Tu plan ha vencido. Contacta a tu coach para renovarlo.', 402);
  }
  next();
}