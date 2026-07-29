import type { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { clients } from '../models/schema.js';
import { verifyToken, isPlanExpired, type TokenPayload } from '../services/auth.service.js';

type ClientAuthRow = {
  id: string;
  status: string;
  clientType: string;
  permissions: Record<string, boolean>;
  planEndDate: string | null;
};

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

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return unauthorized(res, 'Token requerido.');

  let payload: TokenPayload;
  try {
    payload = verifyToken(header.slice(7));
  } catch {
    return unauthorized(res, 'Token inválido o expirado.');
  }

  if (payload.role === 'cliente') {
    const rows = await db
      .select({
        id: clients.id,
        status: clients.status,
        clientType: clients.clientType,
        permissions: clients.permissions,
        planEndDate: clients.planEndDate,
      })
      .from(clients)
      .where(eq(clients.id, payload.id))
      .limit(1);
    const client = rows[0] as ClientAuthRow | undefined;
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

export function ownerOrAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role === 'admin') return next();
  if (req.user?.id === req.params.id) {
    if (req.planExpired) return unauthorized(res, 'Tu plan ha vencido. Contacta a tu coach para renovarlo.', 402);
    return next();
  }
  return unauthorized(res, 'No tienes permiso para acceder a estos datos.', 403);
}
