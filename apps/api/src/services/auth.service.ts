import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Client } from '../models/schema.js';

function requireJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'JWT_SECRET no está configurada. Define esta variable de entorno antes ' +
      'de arrancar el servidor — nunca debe operar con un secreto por defecto.'
    );
  }
  return secret;
}

const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '8h') as jwt.SignOptions['expiresIn'];

export type TokenPayload = {
  id: string;
  role: 'admin' | 'cliente' | 'terapeuta';
  name: string;
  email: string;
  plan?: string;
  clientType?: string;
  mustChangePassword?: boolean;
};

// 12, no 10 — el mínimo de OWASP para bcrypt es 10, pero esta plataforma
// guarda datos de salud y de pago; no rompe hashes existentes (bcrypt
// codifica el costo dentro del propio hash, así que las contraseñas ya
// guardadas con costo 10 siguen verificando bien, solo las nuevas usan 12).
const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Hash fijo (de un valor arbitrario, no de ninguna contraseña real) para
// cuando el email no corresponde a ninguna cuenta — sin esto, "cuenta
// inexistente" responde casi instantáneo mientras "cuenta real, password
// incorrecta" siempre paga el costo de un bcrypt.compare real (~60-100ms),
// una diferencia medible que permite enumerar cuentas válidas por timing
// (ver auditoría de seguridad). Comparar siempre contra algo, real o no,
// iguala el tiempo de respuesta en ambos casos.
export const DUMMY_PASSWORD_HASH = bcrypt.hashSync('no-such-account-timing-equalizer', SALT_ROUNDS);

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, requireJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, requireJwtSecret()) as TokenPayload;
}

// mentoring también vence a los 3 meses desde que se sumó el pago digital
// por Stripe — antes nunca bloqueaba, porque nadie renovaba su
// plan_end_date en la práctica (ver renewPlan, huérfano hasta el webhook).
const ACTIVE_PLAN_TYPES = ['coaching_1_1', 'mentoring'];

export function isPlanExpired(client: Pick<Client, 'clientType' | 'planEndDate'> | null): boolean {
  if (!client) return false;
  if (!ACTIVE_PLAN_TYPES.includes(client.clientType)) return false;
  if (!client.planEndDate) return false;
  const today = new Date().toISOString().slice(0, 10);
  return today > client.planEndDate;
}
