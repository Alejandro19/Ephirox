# session-memory.md

> **Última actualización:** 2026-08-09
> **Propósito:** Resumen ejecutivo por sesión (orden cronológico) y plan de continuidad inmediato para la siguiente sesión.

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

### 10. Wizard de onboarding restyleado con el design system nuevo

Se aplicaron las guías de `docs/design-system-oura-brief.md` (floating labels, botones pill) al wizard de `/onboarding`, replicando visualmente el layout de "Información Personal" del front viejo. De paso se corrigieron asociaciones rotas `getByLabelText`/`getByRole` en 6 componentes reutilizables de `ui/` (los íconos deben ser hermanos del `<label>`, no hijos, porque el matching de RTL es por `textContent`, no por accessible-name de ARIA).

### 11. Módulo "Dispositivos y Laboratorios" (cliente tipo Mentoring) — nuevo paso 10 del wizard

Pedido explícito: extraer quirúrgicamente (sin leer completos) solo lo referido a wearables/labs de `BIO360Index.html` (732 KB) y `BIO360server.js` (107 KB) —localizados en la raíz del repo junto con los servicios reales de origen, `BIO360routes/` y `BIO360services/`— y portarlo a la arquitectura nueva, visible solo para un tipo de cliente nuevo, "Mentoring".

- **Backend:** 3 tablas nuevas (`wearable_tokens`, `wearable_metricas`, `lab_panels`, RLS `deny_all`, migración `tasks/migration-2026-08-05-dispositivos-laboratorios.sql`); `wearable.service.ts` + `whoop.service.ts` + `oura.service.ts` con OAuth y sync reales; `polar.service.ts` con OAuth real (la sync de métricas ya era un stub vacío en el origen BIO360, se mantuvo igual); Garmin no tenía servicio implementado en ningún lado del código fuente, así que su endpoint responde 503 controlado. `lab-panels.service.ts` con CRUD para los 3 checkpoints (semana 0/6/12) y OCR de 28 biomarcadores (reutiliza el mismo endpoint Google Vision que ya existía para InBody). `clientType` se agregó al payload del JWT para que el front sepa si debe mostrar el módulo sin round-trip extra. Constraint de `clients.client_type` en Postgres actualizado para aceptar `'mentoring'`.
- **Frontend:** `Module10.tsx` (selector de wearable, campos manuales de Apple Health, conectar/sincronizar/desconectar, panel de labs con OCR), agregado como **paso 10 del wizard** solo si `clientType === 'mentoring'` (el resto de tipos de cliente sigue viendo 9 pasos). Tipo "Mentoring" agregado al selector de tipo de cliente en el admin.
- **Activación pendiente:** para que WHOOP/Oura/Polar funcionen de verdad hace falta setear sus credenciales reales (`WHOOP_CLIENT_ID`/`SECRET`, `OURA_CLIENT_ID`/`SECRET`, `POLAR_CLIENT_ID`/`SECRET`) en `apps/api/.env` — hoy están en blanco a propósito y el connect responde 503 hasta que se configuren.
- Cliente de prueba creado en la BD de dev: `mentoring-demo@latribu.test` / `MentoringDemo123!` (tipo `mentoring`) para poder ver el paso 10 en `/onboarding`.

### 12. Fix de la base de datos de test (efecto colateral)

Al correr la suite completa para verificar el módulo de arriba se detectó que la BD de test (`/pruebas` en Supabase, separada de la de dev) estaba desincronizada — le faltaban varias migraciones históricas de sesiones anteriores (apple_id, evolution, community, cortisol, sleep). Se aplicaron todas cronológicamente, bajando los archivos de test rotos de 27 a 8. Los 8 restantes son preexistentes y no relacionados a este módulo (credenciales de Supabase Storage inválidas para test, y una migración vieja de julio con una columna `method` que no aplica limpio) — se dejaron sin tocar por estar fuera de alcance.

### 13. Fix de centrado de floating labels (`FloatingField.tsx`)

El usuario reportó dos bugs visuales en "Información Personal" a partir de capturas: (a) el campo "Ciudad" mostraba el label superpuesto con el placeholder de ayuda "Primero selecciona tu país" porque el código desactivaba por completo el comportamiento flotante cuando había un `placeholder` custom, dejando el label siempre centrado encima del hint; (b) preguntas largas (ej. "¿Cuáles son tus 3 frutas preferidas?") no tenían límite de ancho en el label, así que en pantallas angostas envolvían a 2 líneas y se salían de la caja de 48px. Fix: si hay `placeholder`, el label ahora flota arriba (chico) siempre en vez de desactivar el flotado; se agregó `right-3.5 truncate` a los labels de `FloatingField` y `FloatingTextarea` para que corten con "…" en vez de envolver.

### 14. Rediseño completo del módulo Entrenamiento (vista cliente)

El módulo de Entrenamiento que construyó la otra IA (`TrainingHome`, `TrainingDayView`, `TrainingPlayer`, `SessionConfirmedScreen`) tenía toda la lógica funcional (streak, protector de racha, calendario de disciplina, timers de descanso/duración, share card) pero **cero estilos** — solo `<div>`/`<button>` sin className, texto crudo sin layout. El usuario pidió unir esa lógica con el diseño visual del front viejo. Se extrajo quirúrgicamente el markup/CSS de `index.html` (funciones `renderTrainingHome`, `renderTrainingDay`, `renderTrainingPlayer`, `renderStreakBadge`, `renderWeekProgressCard`, `renderNfcConfirmationScreen`, sin leer el archivo completo) y se portó a Tailwind usando las mismas CSS custom properties que ya existían en `globals.css` (`--ink`, `--terracota`, `--sage`, `--gold`, etc. — el design system nuevo ya coincidía 1:1 con las variables del legacy).

- Nuevo archivo compartido `components/training/TrainingVisuals.tsx` (`ProgressBar`, `MiniRing`, `CategoryIcon`, `CATEGORY_LABELS`) para no duplicar SVGs entre los 3 componentes.
- **Gap de lógica encontrado y corregido:** `TrainingDayView` no tenía forma de volver a Home (sin botón atrás, sin prop `onBack`) — se agregó el prop y se conectó en `TrainingShell.tsx`.
- `SessionConfirmedScreen` pasó a ser un overlay oscuro `fixed inset-0` de pantalla completa (celebración), como en el legacy.
- Se ajustaron 3 tests (`training-home.test.tsx`, `training-player.test.tsx`, `training-shell.test.tsx`) para reflejar cambios de comportamiento intencionales: el acordeón "Nivel de disciplina" ahora arranca colapsado (antes no existía como acordeón), y se desambiguó `/Descanso/` → `/Descanso: \d+s/` porque la nueva tarjeta KPI también muestra la palabra "Descanso" como label estático. 84 tests del módulo pasan; `tsc --noEmit` limpio.
- **Fuera de alcance, no tocado:** el panel de admin de Entrenamiento (`AdminExercisePanel`, fallback `<div><h1>Entrenamiento</h1>` para rol admin) sigue sin estilo — no apareció en las capturas que mandó el usuario.
- **Preexistente, no tocado:** `test/training-home-logic.test.ts` tiene una fecha hardcodeada (`2026-07-29`) que ya quedó en una semana pasada respecto a la fecha real del sistema — falla por paso del calendario, no por este trabajo.

---

## Próximas actividades — Siguiente sesión

### Actividad 1 — Probar en navegador el módulo de Dispositivos y Laboratorios

- Loguearse como `mentoring-demo@latribu.test` / `MentoringDemo123!`, ir a `/onboarding`, confirmar que aparecen 10 pasos (no 9), y que el paso 10 respeta la línea visual del resto del wizard.
- Confirmar que un cliente que NO es tipo `mentoring` sigue viendo solo 9 pasos.

### Actividad 2 — Probar en navegador el rediseño de Entrenamiento

- Ir a `/training` como cliente y confirmar visualmente el hero card, badge de racha, protector, grid de días y el acordeón de disciplina.
- Completar un ejercicio para ver el timer de descanso y la pantalla de celebración (`SessionConfirmedScreen`).
- Si se quiere, estilar el panel de admin de Entrenamiento (`AdminExercisePanel`) — quedó pendiente, fuera de lo pedido esta sesión.

### Actividad 3 — Activar wearables reales cuando haya credenciales

- Setear `WHOOP_CLIENT_ID`/`SECRET`, `OURA_CLIENT_ID`/`SECRET`, `POLAR_CLIENT_ID`/`SECRET` en `apps/api/.env` (no requiere más cambios de código, igual que Apple Sign-In).
- Garmin no tiene servicio portado (no existía en el código fuente de BIO360) — si se necesita, habría que escribirlo desde cero.

### Actividad 4 — Activar Apple Sign-In cuando haya cuenta de desarrollador

- Crear Services ID en Apple Developer, configurar dominio/redirect URI (`{origin}/login`), setear `APPLE_CLIENT_ID` en `apps/api/.env`. No requiere más cambios de código — el botón se activa solo.

### Actividad 5 — Seguir coordinando con la otra IA

- La otra IA sigue construyendo partes del App Shell y páginas de admin/cliente bajo `apps/web/app/(app)/`. Antes de tocar esos archivos, confirmar que no estén en curso de edición activa (para evitar conflictos como el ya visto con `AdminClientDetail.tsx`/`AdminClientList.tsx`, que tuvieron errores de sintaxis que rompían el dev server entero).

---

## Resumen Ejecutivo — Sesión 2026-08-09

### 1. Módulo "Punto Ciego" (Mentoría) construido de punta a punta

Nuevo módulo premium exclusivo del tier Mentoring: Alejandro hace una evaluación inicial y refiere al cliente a un terapeuta externo curado, que da seguimiento (tareas, sesiones) dentro de la plataforma. Se escribió primero un spec completo (`docs/spec-punto-ciego.md`, con la skill `spec-driven-development`) y luego se implementó entero:

- **Backend:** 4 tablas nuevas (`therapists`, `blindspot_cases`, `blindspot_tasks`, `blindspot_session_logs`), rol nuevo de JWT `'terapeuta'` (login propio en `/api/auth/therapist/login`, middleware `therapistOnly`), `blindspot.service.ts` + `blindspot.controller.ts` + `blindspot.routes.ts` (montado en `/api/blindspot`), con separación estricta de privacidad: `adminPrivateNotes` nunca llega al terapeuta, `internalSummary` nunca llega al cliente (verificado con tests, no solo por convención). Alerta de crisis: notificación in-app + email (reusa el patrón nodemailer de `personal-info.service.ts`), con degradación silenciosa a log si no hay SMTP configurado.
- **Frontend:** vistas separadas por rol en una sola ruta `/blindspot` (`AdminBlindspotPanel`, `ClientBlindspotPanel` con `LockedOverlay` si el cliente no es `mentoring`, igual que "Descanso") + un panel de terapeuta completo bajo su propio grupo de rutas `(therapist)`.
- **Regresión propia detectada y corregida:** `drizzle-kit push` reveló que `sleep_logs`/`wearable_tokens`/`wearable_metricas`/`lab_panels` tenían constraints `UNIQUE` compuestos que existían en la BD real pero nunca se habían declarado en `schema.ts` — al hacer push los iba a borrar. Se declararon en el schema antes de aplicar nada.
- **`drizzle-kit push` no es confiable en este repo:** dos veces distintas en esta sesión se quedó colgado esperando una confirmación interactiva de TTY (truncar tabla) que nunca llega en un proceso en background — no es un cuelgue real, es un prompt invisible. Desde entonces, todo cambio de schema se aplica con un script `tsx` desechable que corre SQL directo (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`), contando filas antes de cualquier operación potencialmente destructiva, y se borra después de usarlo. Aplicado así, sin pérdida de datos, a las dos bases (test y real) en cada cambio de esta sesión.

### 2. Login de terapeutas + sistema de recuperación de contraseña

- Login de terapeutas (`/therapist-login`) rediseñado para compartir la misma esencia visual que `/login` (logo, slogan, tema día/noche, splitscreen) pero sin Google/Apple ni registro.
- **Bug encontrado y corregido:** el `AuthProvider` global (envuelve toda la app, incluida `/therapist`) valida el token contra `/api/auth/me` en cada carga de página; ese endpoint no reconocía el rol `terapeuta` y caía al branch de cliente → 404 → cierre de sesión forzado. Se agregó el branch faltante en `me()`.
- Sistema de "¿Has olvidado tu contraseña?" genérico por email (busca en admins/clientes/terapeutas, misma respuesta siempre exista o no la cuenta), tabla `password_reset_tokens` (token de un solo uso, expira en 1h), página compartida `/reset-password`.
- Contraseña temporal para terapeutas: el admin les asigna una al crearlos (`mustChangePassword: true`); en su primer login se les fuerza a `/therapist/set-password` antes de dejarlos entrar, reemitiendo un token limpio al terminar.
- "Recuérdame" en ambos logins: solo persiste el email en `localStorage`, nunca la contraseña en texto plano (el gestor de contraseñas del navegador ya cubre eso de forma segura vía `autoComplete`).
- Tarjetas de login estandarizadas a un alto fijo (`md:min-h-[600px]`) para que no cambien de tamaño según cuántos botones tengan.

### 3. Numeración de casos, navegación y buscador

- `blindspot_cases.case_number`: columna `serial` de Postgres, se asigna sola en orden de creación. Se muestra como `#N` en los tres paneles (admin, terapeuta, cliente).
- Módulo "Punto Ciego" agregado a la navegación real (`ADMIN_NAV`/`CLIENT_NAV`/`VIEW_TO_PATH` en `lib/constants.ts`) — antes solo era alcanzable por URL directa. En el panel de cliente usa el mismo candado 🔒 que "Descanso" si el `clientType` no es `mentoring`.
- Buscador/filtro de casos en el panel admin y en el panel de terapeuta.

### 4. Rediseño completo del panel de terapeuta ("Punto Ciego")

Sidebar nuevo (`TherapistSidebar.tsx`) con los 7 módulos pedidos (Mi perfil, Mis casos, Mis clientes, Mi agenda, Recursos clínicos, Comunidad de terapeutas, Dashboards), resaltado del módulo activo reusando el patrón real que ya usa el admin (`--terracota`/`--terracota-soft` — no existe un token "coral" en `globals.css`, se reusó el existente para mantener consistencia real con el resto de la app), bloque de cuenta fijo abajo (avatar + nombre + "Terapeuta") con "Cerrar sesión". Todo vive como un mini-SPA dentro de `/therapist` (`TherapistShell.tsx`), sin rutas nuevas por módulo — los 6 módulos no construidos muestran un placeholder "Próximamente".

Único módulo construido a fondo: **Mis casos** (`TherapistCasesModule.tsx`, reemplaza a `TherapistBlindspotPanel.tsx`) — tabs Activos/En crisis/Cerrados con contador, lista con avatar+inicial, nombre+#caso, motivo corto y "última sesión hace...", badge de estado; detalle con grid de datos personales de solo lectura (Nombre, Cédula, País, Ciudad, Email, Celular), motivo/área lado a lado con labels en mayúsculas trackeadas, botón sólido de crisis con confirmación, checklist de tareas con círculo-checkbox, y "Registrar sesión" con selects de igual alto y botón negro de guardar.

- **Dato nuevo que no existía:** "Cédula" no estaba en ningún lado del modelo (`personal_info`). Se agregó la columna (migración aditiva, segura) y se expone de solo lectura al terapeuta vía `therapistGetCase`, pero **no se construyó un formulario de admin para cargarla** — hoy el admin tampoco tiene edición de ningún otro dato personal, solo lectura. Pendiente de decisión del usuario si se quiere ese formulario.
- **Decisión de seguridad tomada sin preguntar:** el spec pedido decía que el "resumen interno" de sesión lo ven "tú y el cliente", pero eso contradice la barrera de privacidad ya probada por tests (el cliente nunca debe ver `internalSummary`). Se dejó el texto original ("solo tú y Alejandro lo ven") en vez de implementar literalmente lo pedido. **Pendiente de confirmación del usuario.**
- `therapistListCases`/`therapistGetCase` se enriquecieron en el backend con nombre del cliente, fecha de última sesión y los datos personales de solo lectura (antes el terapeuta no tenía acceso a ninguno de estos datos).

### 5. Verificación

`tsc --noEmit` limpio en ambas apps en cada paso. Suite de backend sin regresiones (auth: 17→31 tests con los nuevos de forgot/reset/mustChangePassword; blindspot: 14 tests). `next build` compila todo lo nuevo — solo falla en el mismo bug preexistente y no tocado de `AdminClientDetail.tsx` (mismatch de tipos en `PersonalInfo`, fuera de alcance, ya reportado en sesiones anteriores). Fallas preexistentes no relacionadas confirmadas de nuevo: credenciales de Supabase Storage inválidas en test, un test de login obsoleto (`login-page.test.tsx`) que prueba una lógica de `router.push` que ya no existe desde el rediseño "Fase 0", y flakiness conocida por fecha relativa/timeout en `training-home-logic.test.ts`/`wizard-shell-*.test.tsx`.

### 6. Estado del working tree al cerrar la sesión

`old_index.html` (tracked, borrado) e `index.html` (nuevo, sin trackear) en la raíz quedaron **fuera del commit de esta sesión a propósito** — tocan el archivo que Vercel deploya en producción desde `origin/main` (ver Notas adicionales) y ese cambio no fue parte de ningún pedido de esta sesión ni se investigó su origen. `BIO360Index.html`/`BIO360server.js` y los binarios `apps/api/*.traineddata` se movieron a `.gitignore` (ya eran "sin trackear a propósito" mencionado en la sesión 2026-08-05, pero no estaban en `.gitignore` todavía, así que un `git add -A` los habría capturado por error).

---

## Próximas actividades — Siguiente sesión

### Actividad 1 — Decidir sobre "Cédula" y el texto del resumen interno

- Confirmar si se quiere un formulario de admin para cargar la cédula (y de paso el resto de datos personales, que hoy tampoco son editables desde el panel admin).
- Confirmar el texto correcto de la etiqueta "Resumen interno" en Registrar sesión — hoy dice "solo tú y Alejandro lo ven", el pedido original decía "tú y el cliente", lo cual no puede ser cierto sin romper la privacidad ya garantizada por tests.

### Actividad 2 — Probar en navegador el panel de terapeuta rediseñado

- Loguearse con una cuenta de terapeuta, confirmar navegación entre los 7 módulos del sidebar, y probar el flujo completo de "Mis casos": tabs, buscador, marcar crisis, agregar/completar/omitir tareas, registrar sesión.
- Probar el flujo de "olvidé mi contraseña" end-to-end en ambos logins (clientes y terapeutas) con SMTP real o revisando el link en los logs del backend si no hay SMTP configurado.

### Actividad 3 — Revisar `old_index.html` / `index.html` en la raíz

- Antes de cualquier commit futuro, entender por qué `old_index.html` (tracked) aparece borrado y hay un `index.html` nuevo sin trackear — no se tocó ni se investigó en esta sesión porque no fue parte de ningún pedido y el archivo es el que usa producción en Vercel.

### Actividad 4 — Construir los 6 módulos placeholder del panel de terapeuta

- Mi perfil (reusar la estética de rachas/medallas ya usada con clientes), Mis clientes, Mi agenda, Recursos clínicos, Comunidad de terapeutas, Dashboards — hoy son solo navegación + "Próximamente".

---

## Notas adicionales

- **No modificar `server.js` ni `index.html` (raíz):** son el monolito legacy que Vercel sigue deployando en producción desde `origin/main`. Todo desarrollo nuevo va en `apps/api` / `apps/web`, commiteado en `backup-migracion-2026-08-05`.
- **`BIO360Index.html`, `BIO360server.js`, `BIO360routes/`, `BIO360services/` (raíz):** copia de referencia del monolito legacy usada solo para extraer quirúrgicamente el módulo de Dispositivos y Laboratorios (sección 11). Quedan sin trackear en git a propósito (son archivos grandes de solo consulta, no forman parte de la arquitectura nueva) — no leerlos completos, solo con grep/sed dirigido.
- **Puertos:** backend nuevo `:3003`, front nuevo `:3000`, backend legacy `:3001` (ver sección 8). Usar `npm run dev:api` / `npm run dev:web` desde la raíz para evitar confusión.
- **Dos bases de datos Supabase separadas:** dev (`DATABASE_URL` en `apps/api/.env`) y test (`TEST_DATABASE_URL` en `apps/api/.env.test`) — las migraciones de `tasks/*.sql` hay que aplicarlas a mano en ambas, no se sincronizan solas.
- **Nunca commitear/pushear a `origin/main` directamente** — riesgo real de romper el deploy de producción en Vercel.
- **Nunca cambiar de rama, commitear o pushear sin pedido explícito del usuario en ese turno**, incluso si ya se autorizó antes en la misma sesión.
