-- Fase 0 del rediseño del módulo Stress (ver docs/prompt-ajustes-flujo-narrativo.md
-- puntos 16-22 y /Users/alejandrogarcia/.claude/plans/eager-cuddling-mountain.md):
-- el módulo vivía con nombre interno "cortisol" — se renombra a "stress" en
-- tablas y en las 3 capas de permisos. Se elimina cortisol_checkins (el
-- check-in de ánimo sale del producto, no se migra — ver wellness-index.service.ts,
-- que ya deja de leer esta tabla). This project has no automated DB migration
-- system; run this SQL manually against the dev and test Supabase databases
-- via the SQL Editor.
--
-- IMPORTANTE: correr TODO este archivo dentro de una sola transacción
-- (BEGIN;...COMMIT;) contra DATABASE_URL y luego, por separado, contra
-- TEST_DATABASE_URL. No mezclar con drizzle-kit push.
--
-- Después de correr esto en producción: reiniciar el proceso de la API para
-- invalidar el cache in-memory de type-module-access.service.ts (o llamar a
-- invalidateModuleAccessCache()) — si no, puede haber 403 inconsistentes
-- durante el rato en que el proceso viejo siga con el cache de permisos
-- 'cortisol' cargado.

BEGIN;

ALTER TABLE cortisol_techniques   RENAME TO stress_techniques;
ALTER TABLE cortisol_completions  RENAME TO stress_completions;
ALTER TABLE cortisol_tips         RENAME TO stress_tips;

ALTER INDEX cortisol_techniques_client_id_idx  RENAME TO stress_techniques_client_id_idx;
ALTER INDEX cortisol_completions_client_id_idx RENAME TO stress_completions_client_id_idx;

-- El check-in de ánimo se elimina del producto (no se renombra ni se migra).
DROP TABLE IF EXISTS cortisol_checkins;

-- Las 3 capas de permisos usan la misma key literal 'cortisol'. La FK de
-- client_type_module_permissions.module_key -> permission_modules.key no es
-- deferrable ni tiene ON UPDATE CASCADE, así que un UPDATE del valor del
-- padre falla mientras el hijo siga apuntando al valor viejo sin importar el
-- orden — se suelta la constraint, se actualizan ambas tablas, y se vuelve a
-- crear idéntica (mismo nombre, misma definición que en schema.ts).
ALTER TABLE client_type_module_permissions
  DROP CONSTRAINT client_type_module_permissions_module_key_fkey;

UPDATE permission_modules
SET key = 'stress'
WHERE key = 'cortisol';

UPDATE client_type_module_permissions
SET module_key = 'stress'
WHERE module_key = 'cortisol';

ALTER TABLE client_type_module_permissions
  ADD CONSTRAINT client_type_module_permissions_module_key_fkey
  FOREIGN KEY (module_key) REFERENCES permission_modules(key) ON DELETE CASCADE;

UPDATE clients
SET permissions = (permissions - 'cortisol') || jsonb_build_object('stress', COALESCE(permissions->'cortisol', 'false'::jsonb))
WHERE permissions ? 'cortisol';

COMMIT;
