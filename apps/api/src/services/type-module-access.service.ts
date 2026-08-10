import { db } from '../db/index.js';
import { clientTypeModulePermissions } from '../models/schema.js';

// Cache en memoria de la matriz completa tipo-de-cliente × módulo — son pocas
// filas (9 módulos base + los que agregue un admin) así que cachear evita una
// consulta extra en CADA request autenticado. Se invalida en cada guardado
// desde roles.service.ts, así que un cambio en la matriz aplica desde la
// siguiente request de cualquier cliente, sin esperar a que cierre sesión.
let cache: Map<string, boolean> | null = null;

function cacheKey(clientType: string, moduleKey: string): string {
  return `${clientType}::${moduleKey}`;
}

async function loadCache(): Promise<Map<string, boolean>> {
  const rows = await db.select().from(clientTypeModulePermissions);
  const map = new Map<string, boolean>();
  for (const row of rows) {
    map.set(cacheKey(row.clientType, row.moduleKey), row.allowed);
  }
  return map;
}

export function invalidateModuleAccessCache(): void {
  cache = null;
}

// Un (tipo, módulo) que no está en la matriz (ej. un módulo recién creado
// antes de que se le guarde ninguna fila) se trata como no permitido — el
// mismo comportamiento "cerrado por defecto" del sistema anterior.
export async function isModuleAllowedForType(clientType: string, moduleKey: string): Promise<boolean> {
  if (!cache) cache = await loadCache();
  return cache.get(cacheKey(clientType, moduleKey)) ?? false;
}
