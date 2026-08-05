# session-memory.md

> **Fecha:** 2026-08-05
> **Propósito:** Resumen ejecutivo de la sesión de hoy y plan de continuidad inmediato para la siguiente sesión.

---

## Resumen Ejecutivo — Sesión 2026-08-05

### 1. Cadena de bugs de login resuelta (front nuevo ↔ back nuevo)

El login de `apps/web` no conectaba con el backend real. Se diagnosticaron y corrigieron 6 problemas encadenados:
- Ruta mock en `apps/api/src/app.ts` que bypaseaba la autenticación real — eliminada.
- `credentials: 'include'` + CORS `origin: '*'` es una combinación inválida en el navegador (curl no lo detecta porque ignora CORS) — se quitó `credentials: 'include'` de todos los fetch de login/registro (la app usa Bearer tokens, no cookies, para la API).
- Faltaban exports (`decodeTokenPayload`, `fetchAuthMe`) en `apps/web/lib/api-client.ts` que rompían el bundle entero de JS.
- `middleware.ts` de Next.js lee la sesión desde una cookie (`latribu_token`), pero `saveSession()` solo escribía en `sessionStorage` — se corrigió para que también setee/borre la cookie.
- `apps/web/app/page.tsx` era un stub que redirigía siempre a `/login` — reemplazado (luego superado por el App Shell real de la otra IA en `app/(app)/`).

### 2. Theming día/noche del login portado del front viejo

Se portó el mecanismo exacto de cambio de color día/noche desde `old_index.html` (solo la sección de login, sin leer el archivo completo) a `apps/web/app/(auth)/login/page.tsx`, vía variables CSS en `globals.css` (`theme-login-light` / `theme-login-dark`) y un script inline bloqueante para evitar flash de tema incorrecto al refrescar. Se corrigió también un warning de hidratación de React agregando `suppressHydrationWarning` al `<html>`.

### 3. Verificación del backend nuevo para operaciones de admin

Se confirmó por curl (login + `/me` + creación/listado de clientes) que el backend nuevo funciona end-to-end para el flujo de admin, aunque el front nuevo todavía no tiene UI de admin propia en ese momento.

### 4. Respaldo en GitHub sin tocar producción

Se creó la rama `backup-migracion-2026-08-05` desde `main` (que estaba 148 commits adelante de `origin/main`, nunca pusheada) y se pusheó a `origin/backup-migracion-2026-08-05`. **Se dejó `origin/main` intacto a propósito**: Vercel deploya producción desde ahí y su `vercel.json` todavía apunta al monolito legacy (`index.html` / `server.js`), así que mezclar ramas ahí rompería el deploy en vivo. Todo el trabajo de la migración (mío + el de la otra IA) se sigue commiteando solo en esa rama de respaldo.

Se aprovechó para corregir gaps del `.gitignore` (`.env.local`, `.env.dev-local`, `.env.*.local`, `vendor/`, `.claude/worktrees/`) — se verificó con `git log --all` / `git log origin/main` que ningún secreto llegó nunca a `origin/main` ni a GitHub en general (solo existía en una rama local nunca pusheada).

### 5. Brief de diseño para la otra IA (`docs/design-system-oura-brief.md`)

Documento 100% textual (la otra IA no recibe imágenes) describiendo el patrón de floating-label inputs, botones pill, layout de checkout y mega-menú de referencia (Oura.com), pero manteniendo el acento dorado/terracota propio de La Tribu en vez del azul de Oura. Se marcó como convención **permanente de todo el proyecto**, no solo de una fase, e incluye una sección de disciplina de alcance (tocar solo lo pedido, no dejar mocks, listar archivos tocados al final).

### 6. Google OAuth funcional + pantalla de transición

El backend ya tenía Google OAuth completo; solo faltaba conectar el front. Se agregó:
- Botón de Google real en `/login`, con pantalla de transición ("anillo" giratorio de 3 colores + "La Tribu" + "Cargando sesión…") que se muestra durante el login por Google, por email/password, y se unificó visualmente con el loading state del AppShell (mismo anillo, mismo texto) — cero discontinuidad visual entre login y entrada a la app.
- Optimización de velocidad: el script de Google pasó a `next/script strategy="beforeInteractive"`, se agregó `<link rel="preconnect">`, y se paralelizó el fetch de `/api/config` con el polling del SDK (antes eran secuenciales y además se pedía la config dos veces por un bug propio, ya corregido).

### 7. Sign in with Apple — implementación completa pero inactiva

A petición explícita del usuario ("front + backend completos"), se implementó el flujo real de Apple completo, dejado **intencionalmente inactivo** hasta que el usuario consiga cuenta de Apple Developer:
- Backend: columna `apple_id` en `admins`/`clients` (migración `tasks/migration-2026-08-05-apple-auth.sql`), `apps/api/src/services/apple-auth.service.ts` (verificación JWKS con `jose`), endpoint `POST /api/auth/apple` (espeja exactamente el patrón de Google, responde 503 si `APPLE_CLIENT_ID` no está seteado), `/api/config` ahora expone también `appleClientId`.
- Frontend: SDK de Apple cargado igual que el de Google, botón "Continuar con Apple" que se renderiza deshabilitado mientras `appleClientId` sea `null` y se activa solo (sin más cambios de código) en cuanto se setee `APPLE_CLIENT_ID` en `apps/api/.env`.
- `packages/shared-types` requirió rebuild (`npm run build`) porque `apps/api` importa el `dist/` compilado, no `src/` directamente.

### 8. Confusión de puertos (front vs. legacy) — resuelta

`npm run dev` en la raíz del repo levanta el **backend legacy** (`nodemon server.js`, puerto 3001 por `PORT` en el `.env` raíz), no el front nuevo. Se agregaron scripts explícitos al `package.json` raíz: `dev:web` (`apps/web`, siempre puerto 3000 — ya estaba hardcodeado) y `dev:api` (`apps/api`, puerto 3003). El script `dev` original se dejó intacto por compatibilidad, con alias `dev:legacy`.

### 9. Commit y push

Todo lo anterior (excepto lo ya commiteado previamente) se commiteó en un solo commit sobre `backup-migracion-2026-08-05` (90 archivos) y se pusheó a `origin/backup-migracion-2026-08-05`.

---

## Próximas actividades — Siguiente sesión

### Actividad 1 — Probar en navegador lo construido hoy

- Verificar visualmente: botón de Google aparece sin delay perceptible, botón de Apple se ve deshabilitado ("Próximamente") debajo del divisor, pantalla de anillo se ve idéntica en login (Google/email) y en el AppShell al entrar.

### Actividad 2 — Activar Apple Sign-In cuando haya cuenta de desarrollador

- Crear Services ID en Apple Developer, configurar dominio/redirect URI (`{origin}/login`), setear `APPLE_CLIENT_ID` en `apps/api/.env`. No requiere más cambios de código — el botón se activa solo.

### Actividad 3 — Seguir coordinando con la otra IA

- La otra IA sigue construyendo el App Shell y páginas de admin/cliente bajo `apps/web/app/(app)/`. Antes de tocar esos archivos, confirmar que no estén en curso de edición activa (para evitar conflictos como el ya visto con `AdminClientDetail.tsx`/`AdminClientList.tsx`, que tuvieron errores de sintaxis que rompían el dev server entero).

---

## Notas adicionales

- **No modificar `server.js` ni `index.html` (raíz):** son el monolito legacy que Vercel sigue deployando en producción desde `origin/main`. Todo desarrollo nuevo va en `apps/api` / `apps/web`, commiteado en `backup-migracion-2026-08-05`.
- **Puertos:** backend nuevo `:3003`, front nuevo `:3000`, backend legacy `:3001` (ver sección 8). Usar `npm run dev:api` / `npm run dev:web` desde la raíz para evitar confusión.
- **Nunca commitear/pushear a `origin/main` directamente** — riesgo real de romper el deploy de producción en Vercel.
- **Nunca cambiar de rama, commitear o pushear sin pedido explícito del usuario en ese turno**, incluso si ya se autorizó antes en la misma sesión.
