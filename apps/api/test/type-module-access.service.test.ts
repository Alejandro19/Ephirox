import { describe, it, expect } from 'vitest';
import { eq, and } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { clientTypeModulePermissions } from '../src/models/schema.js';
import { isModuleAllowedForType, invalidateModuleAccessCache } from '../src/services/type-module-access.service.js';

describe('type-module-access.service', () => {
  it('reads the seeded matrix correctly', async () => {
    // Sembrado por 2026-08-10-roles-and-profiles-matrix.sql — coaching_1_1
    // siempre tiene training en true.
    expect(await isModuleAllowedForType('coaching_1_1', 'training')).toBe(true);
    expect(await isModuleAllowedForType('lead_wellness', 'training')).toBe(false);
  });

  it('defaults to false for an (type, module) pair not present in the matrix', async () => {
    expect(await isModuleAllowedForType('coaching_1_1', 'un_modulo_que_no_existe')).toBe(false);
  });

  it('reflects a change on the next call after invalidateModuleAccessCache()', async () => {
    // isModuleAllowedForType cachea toda la matriz en memoria — sin invalidar
    // el cache, un UPDATE directo a la tabla no se vería hasta el próximo
    // reinicio del proceso. invalidateModuleAccessCache() es justo lo que
    // roles.service.ts llama después de cada guardado desde la pantalla de
    // admin, para que el cambio aplique en la siguiente request.
    await isModuleAllowedForType('coaching_1_1', 'community'); // fuerza a llenar el cache

    await db
      .update(clientTypeModulePermissions)
      .set({ allowed: false })
      .where(and(eq(clientTypeModulePermissions.clientType, 'coaching_1_1'), eq(clientTypeModulePermissions.moduleKey, 'community')));

    expect(await isModuleAllowedForType('coaching_1_1', 'community')).toBe(true); // cache viejo, todavía no refleja el cambio

    invalidateModuleAccessCache();
    expect(await isModuleAllowedForType('coaching_1_1', 'community')).toBe(false); // ahora sí

    // Restaura el seed original.
    await db
      .update(clientTypeModulePermissions)
      .set({ allowed: true })
      .where(and(eq(clientTypeModulePermissions.clientType, 'coaching_1_1'), eq(clientTypeModulePermissions.moduleKey, 'community')));
    invalidateModuleAccessCache();
  });
});
