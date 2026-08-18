# session-memory.md

> **Última actualización:** 2026-08-18
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

## Resumen Ejecutivo — Sesión 2026-08-09 (tarde) — Sistema de diseño premium (fase 2)

Continuación del sistema de diseño premium (Apple/Oura/Vercel) ya iniciado en fases anteriores de esta misma sesión larga (topbar horizontal para cliente y terapeuta, hero espresso/piedra, tokens nuevos). Esta parte cubrió dos prompts nuevos del usuario:

### 1. Corrección de jerarquía de contenedores (los 3 paneles)

Se eliminó el patrón de "card completa apilada" (fondo blanco + borde + radio) para todo el contenido secundario debajo de cada hero, en los 8 módulos de cliente, terapeuta (Mis casos) y ~20 archivos de admin — reemplazado por secciones abiertas separadas con `border-top` de 1px y padding vertical, dejando el borde completo solo para controles clicables (tabs, chips, filas de listado). Se agregó `mt-8` entre el topbar y el primer hero de cada pantalla, y se corrigieron badges que flotaban sueltos junto al hero (ej. racha "🔥 en riesgo" en Entrenamiento, ahora integrada dentro del hero).

### 2. Formularios: agrupación, tipografía, íconos, paleta

- **Cards agrupadas estilo Oura** en los 10 módulos de "Información Personal": se agregó metadata `group` (opcional) a `WizardFieldConfig` en `packages/shared-types/src/wizard.ts` (requirió `pnpm run build` en ese paquete para que `apps/web` viera el tipo nuevo, ya que importa el `dist/` compilado) y se anotó cada campo de `lib/wizard-modules.ts` con su grupo temático. `WizardShell.tsx` parte los campos de cada módulo en cards contiguas por grupo, cada una con ícono de línea (16px) + eyebrow mayúsculas. Módulo 3 (Composición Corporal) y Módulo 10 (Dispositivos y Laboratorios) — que son `custom` y no pasan por ese pipeline — recibieron el mismo tratamiento visual a mano, a pedido explícito del usuario tras una primera pasada incompleta.
- **Jerarquía tipográfica pregunta/respuesta**: label 12px/400/`--ink-secondary` siempre estático arriba, valor 14.5px/600/`--ink` abajo — reemplaza el floating-label animado que tenía `FloatingField.tsx` (ahora es un label fijo, ya no flota). Aplicado en todos los componentes compartidos de formulario (`FloatingField`, `SelectField`, `TimeField`, `SegmentedControl`, `ChevronStepper`, `SliderField`, `ChipGroup`) y en los `fieldStyle`/`labelStyle` locales de ~10 paneles admin/terapeuta.
- **`SelectField.tsx` — bug real encontrado y corregido**: el placeholder ("Seleccionar") nunca se mostraba visualmente cuando el campo estaba vacío — el `<span>` que dibuja el valor por encima del `<select>` nativo transparente mostraba string vacío en vez del placeholder, así que todo select sin valor se veía completamente en blanco. Corregido para mostrar "Seleccionar" en gris cuando no hay valor.
- **Emojis → íconos de línea**: nuevo archivo `components/ui/icons.tsx` con ~35 íconos SVG hand-rolled (mismo criterio que ya usaba la app, no se agregó ninguna librería de íconos como dependencia). Reemplazados todos los emojis reales encontrados por grep de rangos Unicode (🔥🔒🔔🏆🎖️📎📸🔀⚠️✅🧊🧘🏃🤝💆🩺🥗🧠), incluyendo los que se dibujaban con `fillText` en el canvas de la tarjeta de Instagram (`lib/training-card.ts` — se reemplazaron por funciones que dibujan trofeo/medalla como paths de canvas). El símbolo ✓ (check mark plano, no emoji de color) se dejó igual a propósito.
- **Chips/botones fuera de paleta — bug real encontrado y corregido**: `components/ui/ChipGroup.tsx` (el componente compartido detrás de TODOS los selectores múltiples: proteínas, carbohidratos, probióticos, suplementos, etc. en el onboarding) tenía naranja sólido hardcodeado (`var(--terracota)`) para el estado seleccionado — nunca se había retokenizado en ninguna fase anterior. Corregido al patrón de paleta (`--ink` sólido/pill). También corregido el dropzone de `FileField.tsx` (antes borde naranja sólido, ahora punteado) y luego, a pedido de seguimiento, hecho más visible (fondo con tinte, borde más marcado, ícono de clip dentro del recuadro — antes pasaba desapercibido).
- **Sliders**: `SliderField.tsx` tenía caja blanca + borde + verde viejo (`#5B7A4E`) sin retokenizar — ahora es un track delgado sin caja, con `accent-color` del dorado de marca.

### 3. Bug real encontrado detrás del error "preexistente" de toda la sesión

`components/nutrition/NutritionPdfGenerator.tsx` fallaba el build con "Modifiers cannot appear here" desde antes de que empezara este trabajo — se había reportado repetidamente como "preexistente, fuera de alcance". Al tocar este archivo para quitarle un emoji se encontró la causa real: a la función `mdBold` le faltaba la llave de cierre `}`, lo que corría todo lo demás dentro de su cuerpo y dejaba una llave extra sobrante al final del archivo. Corregido (dos líneas) — `next build` ahora compila 100% limpio, sin ningún error.

### 4. Incidente de `git stash` — corrupción y recuperación completa

Al comparar si un test roto era preexistente, se encadenó `git stash && npx vitest run ... && git stash pop` en un solo comando con timeout de 60s. El timeout mató el proceso a mitad del `git stash pop`, dejando ~15 archivos revertidos a su versión de antes de la sesión (incluyendo el borrado completo de `FloatingField.tsx`). Se diagnosticó comparando los 116 archivos del stash contra el disco uno por uno (`git show stash@{0}:<path>` vs archivo real) y se restauró cada uno exacto (`git checkout stash@{0} -- <path>`), verificado luego byte a byte. El stash se dropeó al final, ya verificado con `tsc`, `next build` y la suite de tests. **Ningún archivo del diseño de hoy se perdió.**

### 5. Tests corregidos y hallazgos de arquitectura preexistente (no tocados)

Corregidos por regresión real de esta sesión o por mocks incompletos: `admin-training-panel.test.tsx` (faltaban mocks de `getAchievements`/`getStreak`, usados por el `AdminAchievementsPanel` agregado en una fase anterior), `training-home-logic.test.ts` (fecha hardcodeada que ya había quedado en el pasado — se fijó el reloj con `vi.useFakeTimers`), `training-home.test.tsx` y `phrases-panel.test.tsx` (queries por texto de emoji que ya no existe, actualizadas), `client-detail-page.test.tsx` (reescrito completo).

**Hallazgos de arquitectura preexistente, NO corregidos hoy (fuera de alcance, requieren decisión de producto):**
- **`client-detail-page.test.tsx` (ya corregido, pero reveló esto):** el historial de antropometría/InBody y el resumen de logros que este test esperaba ver en la página de detalle de cliente ya no se muestran ahí — un refactor real anterior a esta sesión movió esa información a "Mi Evolución" (antropometría/InBody) y al tab de Entrenamiento (`AdminAchievementsPanel`, logros). El test se reescribió para reflejar la arquitectura actual.
- **`login-page.test.tsx` (5 tests, fallo consistente, NO flaky):** `components/auth/LoginForm.tsx` — el componente que contiene la lógica real de redirección por rol/onboarding (admin→`/admin/clients`, onboarding incompleto→`/onboarding`, completo→`/training`, acción NFC pendiente→`/training`) — **no lo importa ningún archivo del proyecto**. `app/(auth)/login/page.tsx` (el que de verdad se usa) hace `window.location.href = '/'` sin condicionales, tanto para login por contraseña como por Google. Es un refactor a medias de antes de esta sesión. **Pendiente de decisión:** o se conecta `LoginForm.tsx` de verdad, o se borra como código muerto y se reescriben/eliminan estos tests.
- **`wizard-shell-finalize.test.tsx` (flaky, no determinístico):** sus 5 tests recorren los 9 pasos reales del wizard de punta a punta (~8-14s cada uno) — pasan siempre en aislamiento (verificado dos veces), pero fallan intermitentemente bajo la contención de CPU de la suite completa (~311 tests). Es un tradeoff ya documentado en los comentarios del propio archivo de test, no una regresión de esta sesión.
- Credenciales de Supabase Storage inválidas en el entorno de test — ya reportado en la sesión anterior (2026-08-09, sección "Fix de la base de datos de test"), sigue sin resolverse, no es de este trabajo.

### 6. Verificación final

`tsc --noEmit` limpio, `next build` 100% limpio (0 errores, incluyendo la ruta de nutrición que antes fallaba). Suite de tests: 302/311 pasan; los 9 restantes son los dos hallazgos preexistentes de la sección anterior (login-page: determinístico; wizard-shell-finalize: flaky), no regresiones de hoy.

---

## Próximas actividades — Siguiente sesión (actualizada 2026-08-09 tarde)

### Actividad 1 — Decidir sobre `login-page.test.tsx` / `LoginForm.tsx`

- Confirmar si se quiere restaurar el ruteo inteligente post-login (admin/onboarding-incompleto/training/acción-NFC-pendiente) conectando `components/auth/LoginForm.tsx` de verdad en `app/(auth)/login/page.tsx`, o si se prefiere borrar `LoginForm.tsx` como código muerto y simplificar/eliminar esos 5 tests para que reflejen el comportamiento actual (siempre redirige a `/`).

### Actividad 2 — Revisar flakiness de `wizard-shell-finalize.test.tsx`

- Si molesta en CI o en runs locales, evaluar correr ese archivo aislado (`vitest run test/wizard-shell-finalize.test.tsx`) o con `--pool=threads --poolOptions.threads.singleThread` en vez de subir más los timeouts — no es una regresión de código, es contención de CPU en la suite completa.

### Actividad 3 — Revisar visualmente en `dev:web` los cambios de hoy

- Cards agrupadas de Información Personal (los 10 módulos, incluidos 3 y 10), selects con "Seleccionar" visible, dropzones de archivo más visibles, jerarquía tipográfica label/valor, chips sin naranja, sliders sin caja, y la corrección de jerarquía de contenedores en los 3 paneles.

### Actividad 4 — Construir los 6 módulos placeholder del panel de terapeuta

- (Sigue pendiente de la sesión anterior, sin tocar hoy.) Mi perfil, Mis clientes, Mi agenda, Recursos clínicos, Comunidad de terapeutas, Dashboards.

---

## Resumen Ejecutivo — Sesión 2026-08-10 — Login, topbar admin, Cortisol por emoción, cards agrupadas

Sesión larga con varios pedidos encadenados del usuario. Todo en `apps/web`/`apps/api`, cero cambios en `server.js`/`index.html` (raíz).

### 1. Rediseño del login (cliente/admin y terapeuta)

Aplicado el prompt v2 del usuario (`login/page.tsx`, `therapist-login/page.tsx`): panel izquierdo `#2A2015` exclusivo de login (no reemplaza `--hero-espresso` en el resto de la app), halo radial + anillo de marca conic-gradient, panel derecho siempre `--page-bg` (se eliminó el sistema de tema día/noche `theme-login-light/dark` que hacía que el panel se viera oscuro según la hora — esa era la causa real del reclamo de legibilidad). Card `rounded-[20px]` + sombra. Los puntos 1 (bug de encoding) y 3 (logos sociales faltantes) del prompt se investigaron a fondo y **no existían** en el código actual — no se tocó nada ahí.
Iteración posterior: Google y Apple en una sola fila (antes apilados), textos cortos "Google"/"Apple", Google SDK a `theme:'outline'`/ancho 170px para que quepa junto a Apple. "¿Olvidaste tu contraseña? Recupérala" separado en texto+link (mismo patrón que el link de registro).
**Bug real encontrado y corregido:** el botón de Google desaparecía al navegar entre login/registro/recuperar y volver — `google.accounts.id.renderButton()` pinta un nodo del DOM concreto que se desmonta con cada cambio de `view`; el `ref` de objeto + efecto con `deps: []` nunca volvía a pintar en el nodo nuevo. Corregido con un callback ref (`setGoogleButtonNode`) que repinta cada vez que el nodo se remonta.
**Pendiente sin resolver, flagueado al usuario:** `reset-password/page.tsx` y `therapist/set-password/page.tsx` siguen con el sistema de tema día/noche viejo (`--lf-*` en `globals.css`) — quedarán visualmente inconsistentes con el login nuevo hasta que se decida si se migran también.

### 2. Panel admin: topbar horizontal reemplaza el sidebar vertical

A pedido explícito del usuario (revierte la decisión de la Fase 4 del plan de diseño premium, que dejaba a admin con sidebar). Nuevo `components/layout/AdminTopbar.tsx` (mismo patrón que `ClientTopbar`/`TherapistTopbar`: gradiente piedra, tabs con subrayado animado, dropdown de cuenta, colapso a drawer <1280px), con "Administración" como dropdown propio (Clientes/Frases/Roles). `AppShell.tsx` ahora siempre usa layout de columna (topbar arriba, sin fila+sidebar).
Se quitó "Información Personal" del propio menú del admin (llevaba a `/onboarding`, que es el wizard de datos del CLIENTE — el admin no tiene datos propios ahí, por eso siempre salía "no disponible"; ahora esa info se gestiona por cliente desde Administración → Clientes).
**Borrados por quedar sin uso:** `Sidebar.tsx`, `AdminNavItems.tsx`, `SidebarRing.tsx`, `UserChip.tsx`, `MobileTopbar.tsx`, y la constante `MODULE_THEME` en `lib/constants.ts` (solo la consumía `SidebarRing`).

### 3. Nutrición: PDF generado en vez de subida manual

El botón "Ver PDF"/subida manual del admin (`nt-pdf`) dependía de que alguien subiera un archivo a mano. Se restauró el generador de PDF de marca de la arquitectura anterior (`downloadNutritionPdf`, portado de `old_index.html:3865-3969` vía `git show HEAD:old_index.html`, ya que el archivo está borrado en el working tree pero sigue en el historial) — genera el documento completo (portada, macros, menú, recomendaciones, suplementos, cierre) a partir de los datos vigentes del plan, sin depender de un archivo subido. Botón "Descargar PDF" junto a "Ver más" en el panel cliente. Se quitó el input de archivo del panel admin (`AdminNutritionPanel.tsx`) y el estado/función que ya no se usaban.

### 4. Módulo Frases (admin) — restyle completo

`QuotesPanel.tsx` y `PhrasesPanel.tsx` no tenían ni una clase de estilo (HTML sin estilar desde siempre, nunca migrado). Reescritos con el mismo lenguaje visual que el resto del admin (cardStyle, labelStyle, fieldStyle, botones pill).

### 5. Roles y Perfiles — quitar "Agregar módulo", agregar "Eliminar módulo"

Se quitó `RolesAddModuleBar.tsx` (y `createModule`/`listModules` de `lib/roles-client.ts`, sin más consumidores) a pedido del usuario. Como el usuario había creado un módulo custom de prueba desde esa barra y pidió borrarlo, se agregó la capacidad de eliminar (backend: `deleteModule` en `roles.service.ts`/`roles.controller.ts`, ruta `DELETE /admin/roles/modules/:key`, solo permite borrar módulos `isCustom: true`, nunca los del sistema; frontend: botón "Eliminar" junto a cada módulo custom en `RolesMatrixTable.tsx`) — el usuario lo borra él mismo desde ahí.

### 6. Sistema de notificaciones — activado de cero

La campanita (`NotificationBell.tsx`) y la página `/admin/notifications` ya existían en el frontend pero pegaban a `/api/admin/notifications` y `/api/clients/:id/notifications`, que **no existían en el backend** (404 "Endpoint no encontrado") — las tablas `admin_notifications`/`client_notifications` ya estaban en el schema y varios servicios ya insertaban filas ahí, pero nadie las leía. Se construyeron `notifications.service.ts`/`.controller.ts`/`.routes.ts` (list + mark-as-read para ambos, montadas en `app.ts`). Se corrigió `NotificationBell.tsx` para consumir camelCase (`createdAt`/`clientId`, no `created_at`/`client_id` como el resto de la app ya migrada) y se le agregó marcar-como-leída + link "Ver cliente" (antes solo existían en la página de admin separada). Se borró esa página/componente (`admin/notifications/page.tsx`, `AdminNotificationsPanel.tsx`) y el ítem "Notificaciones" del nav admin — la campanita es ahora la única UI de notificaciones.

### 7. Cards agrupadas — panel admin y panel cliente

**Admin:** los 10 paneles admin (`Admin{Nutrition,Cortisol,Training,Rest,Evolution,Blindspot,Community}Panel`, `RestToolsAdminPanel`, `AdminAchievementsPanel`, `AdminClientDetail`) compartían el mismo `cardStyle` local con solo `borderTop` (sin caja real) — cambiado a caja completa (fondo `--paper`, borde, `--radius-card`, `marginBottom: 20`) en los 10 a la vez. Mismo arreglo en `AdminClientList.tsx` (bloques inline propios, no usaban `cardStyle`) y `RolesMatrixTable.tsx`.
**Cliente:** Entrenamiento, Nutrición, Gestión de Cortisol, Hackeando el sueño y Mi Evolución usaban `<section className="border-t border-[var(--border-hairline)] py-6">` (línea superior plana, sin caja) — convertido a `rounded-[var(--radius-card)] border border-[var(--border-hairline)] bg-[var(--paper)] p-6 mb-5` en todos los archivos (`TrainingHome.tsx`, `ClientNutritionPanel.tsx`, `ClientCortisolPanel.tsx`, `ClientRestPanel.tsx`, `EvolutionVisuals.tsx` — 5 sub-secciones ahí, incluyendo fusionar "Tu evolución física" + "KPIs principales" en una sola card ya que antes eran dos divs adyacentes sin borde inferior/superior). Punto Ciego y Comunidad ya estaban bien (no se tocaron).
De paso, las citas/mantras de Entrenamiento y Nutrición (antes un `<p>` con solo `border-b`, inconsistente) se migraron al componente compartido `MantraCard.tsx` que ya usaban Descanso/Evolución/Comunidad — se le agregó un prop `author` opcional para que Entrenamiento (que usa `MindsetQuote` con autor, no el banco de mantras genérico) también pudiera reusarlo.

### 8. Cortisol — técnica asignada por emoción

Antes, el hero "Recomendada para ti ahora" y el botón "Empezar técnica" adivinaban la técnica buscando una cuyo `title` coincidiera textualmente (case-insensitive) con un string hardcodeado en `CORTISOL_RECOMMENDATIONS` — frágil, no configurable. Se agregó columna `emotion` a `cortisol_techniques` (migración directa por script `tsx`/`postgres` desechable, aplicada a `DATABASE_URL` y `TEST_DATABASE_URL` — nunca `drizzle-kit push`, ver nota de memoria existente) + `CortisolTechniqueInputSchema` en `packages/shared-types` (requirió `pnpm run build` ahí). Admin ahora asigna, al crear/editar una técnica, la emoción a la que corresponde (select + badge dorado en la lista). Cliente: `matched = techniques.find(t => t.emotion === emotion)` manda sobre el fallback hardcodeado; "Empezar técnica" abre exactamente esa técnica.

### 9. Acordeón admin — Composición corporal con datos reales

`OnboardingSummaryAccordion.tsx` (usado en `AdminClientDetail.tsx`) solo mostraba las respuestas del wizard inicial + un texto "mira Mi Evolución". Ahora trae y muestra ahí mismo (nuevo prop `clientId`, reusa `getEvolutionData` de `evolution-client.ts` y `getPhotos` de `personal-info-client.ts`, mismos endpoints que Mi Evolución): medidas antropométricas por fecha, registros InBody completos (talla/altura, peso, peso ideal/`pesoObjetivo`, SMM, masa ósea/`masaOsea`, % grasa, IMC, grasa visceral, agua corporal ECW/TBW, BMR, link al archivo) y miniaturas de fotos de progreso.

### 10. Verificación

`tsc --noEmit` y `next build` limpios en `apps/web` y `apps/api` en cada paso. Suite web completa corrida varias veces: siempre los mismos ~5-11 fallos de la baseline ya documentada (`login-page.test.tsx` determinístico, `wizard-shell-*.test.tsx` flaky bajo carga — varía cuál de los archivos `wizard-shell-*` falla según la corrida, nunca en aislamiento), cero regresiones nuevas atribuibles a esta sesión. Suite de `apps/api`: mismos fallos preexistentes de siempre en `storage.test.ts`/`rest-tools.routes.test.ts` (credenciales de Supabase Storage inválidas en el entorno, ya documentado en sesiones anteriores) — tests dirigidos a lo tocado hoy (`roles.routes.test.ts`, `cortisol-techniques.routes.test.ts`) pasan completos salvo esos mismos 2 de storage.

---

## Próximas actividades — Siguiente sesión (actualizada 2026-08-10)

### Actividad 1 — Decidir sobre `login-page.test.tsx` / `LoginForm.tsx`

- (Sigue sin resolver desde 2026-08-09 tarde.) Confirmar si se quiere restaurar el ruteo inteligente post-login conectando `components/auth/LoginForm.tsx` de verdad en `app/(auth)/login/page.tsx`, o si se prefiere borrar `LoginForm.tsx` como código muerto y simplificar/eliminar esos 5 tests.

### Actividad 2 — `reset-password` / `therapist/set-password` con el tema día/noche viejo

- Estas dos pantallas siguen usando `theme-login-light/dark` (`--lf-*` en `globals.css`), ahora visualmente inconsistentes con el login rediseñado (`#2A2015`/`--page-bg` fijos). Decidir si se migran al mismo patrón fijo.

### Actividad 3 — Revisar flakiness de `wizard-shell-finalize.test.tsx` (y afines)

- (Sigue sin resolver.) No es una regresión de código, es contención de CPU en la suite completa — evaluar `--pool=threads --poolOptions.threads.singleThread` o correr ese archivo aislado en CI si molesta.

### Actividad 4 — Revisar visualmente en `dev:web` los cambios de hoy

- Topbar admin (colapso <1280px, dropdown de Administración), campanita con marcar-como-leída y "Ver cliente", botón "Descargar PDF" en Nutrición, técnica por emoción en Cortisol (asignar en admin → verificar que "Empezar técnica" abra la correcta en cliente), cards agrupadas nuevas en los 5 módulos de cliente + 10 de admin, Composición corporal con datos reales en el detalle de cliente.

### Actividad 5 — Construir los 6 módulos placeholder del panel de terapeuta

- (Sigue pendiente de sesiones anteriores, sin tocar.) Mi perfil, Mis clientes, Mi agenda, Recursos clínicos, Comunidad de terapeutas, Dashboards.

---

## Resumen Ejecutivo — Sesión 2026-08-15 — Nutrición/Club/Retiros, Índice de bienestar, membresías Explorador/Premium, fotos en Comunidad

### 1. Testing NFC/QR en el celular vía túneles de cloudflared

Se diagnosticó y resolvió una cadena de bloqueos para poder probar el flujo NFC→confirmar-sesión desde el teléfono en la misma wifi que la Mac: `localhost` en una URL apunta al propio teléfono (no a la Mac) → se pasó a la IP LAN → HTTPS-Only Mode del navegador bloquea HTTP plano → Google OAuth rechaza orígenes de IP privada por completo → solución final: túneles `cloudflared` (`brew install cloudflared`), que además se caían solos por QUIC/UDP degradado en la red del usuario — corregido agregando `--protocol http2`. Los `.env.local` de `apps/web` se fueron actualizando con las URLs de túnel según iban rotando.

### 2. Ronda de bugs desde capturas de mobile

- Botones de Google/Apple desalineados en mobile: causa raíz un `width:170` fijo en `renderButton` de Google; se probó ancho dinámico y luego `ResizeObserver` (inestable, encogía el botón de Apple) — se resolvió con una altura fija `GOOGLE_APPLE_BUTTON_HEIGHT = 44` para ambos.
- Menú hamburguesa no abría en los 3 topbars: un `transform` inline siempre pisaba la clase `.open` — se sacó el inline y se agregó la regla base en CSS.
- Notificaciones desbordaban en mobile; anillo de macros de Nutrición desbordaba en mobile.
- Doble llamada a `confirmSession` bajo React Strict Mode (dev) causaba un 500 espurio — un `useRef` guard evita que el branch NFC corra dos veces por instancia de página.
- Cierre de sesión prematuro en blips de red justo después de loguearse: `refreshAuth()` trataba CUALQUIER fallo de `/auth/me` como token inválido — se agregó `AuthInvalidError` (solo en 401/403) + reintentos con backoff antes de limpiar la sesión.
- Desalineación vertical de campos en Módulos 2/6/8 del wizard de onboarding: `ChevronStepper`/`SliderField`/`TimeField` dibujan su label en fila propia arriba de la caja, distinto a `SelectField`/`FloatingField` — se corrigió una vez armando el emparejamiento de filas (`WizardShell.tsx`), pero quedó un bug real: `slider` no estaba en el set `EXTERNAL_LABEL_TYPES` que dispara la corrección de alto — con datos cargados (texto en negro, no placeholder) el desalineamiento se hacía obvio. Corregido agregando `slider` al set.

### 2b. Explorado y descartado: `LoginForm.tsx`/`login-page.test.tsx`

No se tocó — sigue como Actividad 1 pendiente (ver abajo).

### 3. Nutrición — rediseño de hero, Recetas saludables, Tips and tricks, reposicionamiento de marca (7 fases)

Prompt grande de 4 partes ejecutado con flujo research→plan→clarificar→aprobar→ejecutar (3 agentes Explore + 1 Plan + 4 `AskUserQuestion`, todas con la opción recomendada):
- **Hero de Nutrición**: rediseñado a "Meta nutricional diaria" con 3 `RingProgress` reales (% de kcal por macro: prot×4/carb×4/grasa×9), reemplazando los tiles viejos y el `MacroRing` local duplicado.
- **Recetas saludables**: tabla nueva `recipes` (PDF admin-managed, mismo patrón multer+Supabase Storage que el PDF de plan nutricional), biblioteca global vista por todos los clientes de Nutrición.
- **Tips and tricks**: tabla nueva `nutrition_tips`, mismo patrón que `cortisol_tips`, biblioteca global.
- **Comunidad → Club Wellness**: solo renombre de copy visible (constants.ts, topbars, community page) — cero cambios de rutas/tablas/nombres internos.
- **"Solicita tu membresía"**: bug real confirmado y corregido — el registro nunca devolvía token pero el frontend lo exigía para considerar éxito, así que todo registro exitoso mostraba error. Se simplificó a nombre+email sin contraseña.
- **Número de miembro automático**: secuencia Postgres (`member_number_seq`) asignada atómicamente dentro de una transacción en `updateStatus()` al pasar a `active`, con backfill retroactivo por antigüedad para clientes ya activos. Nueva `MemberCard.tsx` en el home.
- **Retiros en Club Wellness**: tercera sección junto a Eventos/Terapias, mismo sistema de reservas (tablas `community_retreats`/`retreat_reservations`), gateado igual que Terapias (bloqueado para Lead Wellness).

Migraciones SQL corridas a mano contra `DATABASE_URL` y `TEST_DATABASE_URL` (nunca `drizzle-kit push`, como siempre). Suite completa de `apps/api` (276 tests) y `apps/web` verificada sin regresiones al cierre de las 7 fases.

### 4. Fixes puntuales post-entrega

- Botón de Google roto: el túnel de cloudflared usado para las pruebas NFC ya estaba muerto y `apps/web/.env.local` seguía apuntando ahí — se volvió a `http://localhost:3003` para pruebas en el navegador de la Mac (con nota de volver a levantar el túnel si hace falta probar desde el celular).
- "Descargar PDF" quitado de la card de suplementos (y la función local que ya no se usaba).
- Texto morado del protocolo de sueño (Descanso) cambiado a negro, tanto en la vista del cliente como en el panel admin donde se escribe.
- Recetas/Tips "no aparecían": no era bug — simplemente no había contenido cargado (las secciones se ocultan vacías por diseño). Se aprovechó para mover la administración de Tips (antes sin ningún link de acceso) a una card dentro del panel admin de Nutrición, junto a Recetas — se sacó la página standalone `/admin/nutrition-tips` del hub de Administración.
- Anillos de Nutrición: ajustados de tamaño/color varias veces según feedback (más grandes → más chicos, piedra → espresso → piedra) hasta converger en 68px, un solo tono espresso con track translúcido (el track claro por defecto de `RingProgress` no se leía bien sobre fondo oscuro).
- Recetas/Tips reordenadas al final del módulo de Nutrición (después de Suplementos), no justo debajo del hero.
- Heroes de Nutrición y Club Wellness unificados a espresso plano (igual que Entrenamiento), con el mismo destello radial decorativo que ya tenía Entrenamiento/Cortisol.

### 5. Índice de bienestar — nuevo, unificado con Mi Evolución

Ya existía un "Índice de bienestar general" en Mi Evolución (40% entrenamiento/30% sueño/30% cortisol, calculado en el cliente). El pedido nuevo era un KPI en el home con pesos distintos (15/15/15/15/40 entrenamiento/nutrición/cortisol/sueño/evolución) renormalizados según qué módulos tiene realmente el tipo de cliente. Se resolvió el solape con 3 preguntas ya respondidas (todas la opción recomendada): nutrición queda siempre excluida (sin dato medible hoy), el componente "Mi Evolución" reusa el cálculo clásico existente (anidado, entrenamiento/sueño/cortisol cuentan dos veces — intencional), y se unifica en un solo índice (mismo valor en home y Mi Evolución, fuente de verdad en el backend).

Implementación: `apps/api/src/services/wellness-index.service.ts` (nuevo, consulta `client_type_module_permissions` vía `isModuleAllowedForType`), tabla `wellness_index_history` (snapshot semanal, upsert por `client_id`+lunes-de-la-semana, usado para el delta "vs. semana pasada"), endpoint `GET /api/clients/:id/wellness-index`. Frontend: `WellnessIndexCard.tsx` nueva en el home (oculta para Lead Wellness), y `ClientEvolutionPanel.tsx`/`AdminEvolutionPanel.tsx` dejaron de calcular localmente — ahora consumen el mismo endpoint. Se retiró `computeWellnessIndex` de `apps/web/lib/evolution-logic.ts` (y su test) al quedar sin callers, para no mantener dos fórmulas divergiendo con el tiempo. Hallazgo real durante la investigación: la matriz de Roles y Perfiles en la base de datos ya tenía `lead_wellness: training=false, nutrition=false` (editado a mano por Alejandro desde el admin) pero el frontend de esos dos módulos nunca capturaba el 403 (ver sección 7).

### 6. Member card — fix de logo, anillo más fino

El logo real (`BrandRing`) ya estaba en la member card — el problema era que el fondo de la card era un *gradient* mientras `BrandRing` recibía un color plano como `background`, así que el círculo interior no calzaba con el fondo real detrás (se veía como un parche, no un "donut" limpio). Fondo cambiado a plano. De paso, a pedido explícito, el trazo del anillo (`BrandRing.tsx`) se hizo ~45% más fino (`size * 0.22` → `size * 0.12`) en toda la app.

### 7. Membresías: Club Explorador / Online / Presencial / Elite

- **Nombres cara-al-cliente**: nuevo `MEMBERSHIP_LABELS` en `constants.ts` (Lead Wellness→"Club Explorador", Coaching Online→"Club Online", Coaching 1:1→"Club Presencial", Mentoring→"Club Elite"), separado de `CLIENT_TYPE_LABELS` (queda igual para admin). Aplicado en member card y en el copy hardcodeado de "plan Mentoring" en Descanso/Punto Ciego.
- **Login con dos puertas de entrada**: "Únete como Explorador" (nombre+email o Google/Apple, alta **instantánea** `status:active`/`clientType:lead_wellness`, sin contraseña, auto-login inmediato con el mismo token que un login normal) vs. "Membresía Premium" (la solicitud con aprobación manual que ya existía, sin cambios de comportamiento). Nueva función `createActiveExplorerClient` en `clients.service.ts` (asigna número de miembro atómicamente, igual que `updateStatus`). `RegisterInputSchema` ganó un campo `intent` (`explorer`|`membership_request`) — requirió rebuild de `packages/shared-types`.
- **Regla unificada de SSO**: Google/Apple con un email que no existe en la base ahora crea un Explorador activo con token de una, en vez de quedar `pending` en cola de aprobación (comportamiento anterior). Cambio de conducta real en producción, hecho a pedido explícito.
- **`<LockedBenefit variant="apply"|"upgrade">`** nuevo (`apps/web/components/ui/LockedBenefit.tsx`), envolviendo el `LockedOverlay` ya existente. Reemplazó los candados de copy hardcodeado en Terapias, Retiros y Hackeando el sueño (Club Elite específico). Se agregó además a Entrenamiento y Nutrición, que hoy NO tenían ningún manejo de 403 en el frontend (`training-client.ts`/`nutrition-client.ts` nunca chequeaban `res.status === 403`) aunque el backend ya los bloqueaba para Lead Wellness — decisión explícita de Alejandro de completar ese bloqueo visualmente ahora. `variant="apply"` queda construido pero sin caller real hoy: una cuenta `inactive` no puede ni loguearse (bloqueada en el login mismo), así que nunca llega a ver un módulo bloqueado — queda listo por si esa regla cambia más adelante.

### 8. Fotos y edición en Eventos/Terapias/Retiros (Club Wellness admin)

- Subida de foto opcional (16:9→2:1 según tipo, JPG/PNG, máx 5MB) al crear cada uno, con preview local antes de subir (`ImageField.tsx`, nuevo — `FileField.tsx` no soportaba preview de imagen). Backend: endpoint separado `POST .../:id/upload-image` por cada uno (multer + `uploadFile()`, mismo patrón que Recetas), no combinado con el create JSON existente, para no tener que tocar los schemas/tests ya validados.
- Bug real encontrado y corregido: `updateEvent`/`updateRetreat` en el backend borraban `event_date`/`start_date`/`end_date` en CUALQUIER update parcial que no repitiera esos campos (ternario sin rama `undefined`) — afectaba silenciosamente al simple botón "Desactivar". Corregido para distinguir "campo ausente = no tocar" de "campo vacío = borrar a propósito".
- Botón "Editar" agregado a las 3 listas "publicados" (antes solo Desactivar/Eliminar) — formulario inline con todos los campos + reemplazo de foto.
- Precio de retiros pasado a USD (antes formateaba como pesos colombianos).
- Tamaño de las cards de Eventos/Terapias/Retiros reducido en 2 pasadas (padding, tipografía, foto) según feedback iterativo — Eventos terminó con una foto más cuadrada (2:1) que Terapias/Retiros (2.4:1) porque se veía demasiado alargada; Retiros combinó "Fecha inicio"+"Fecha fin" en un solo campo "Fechas" y pasó a grilla de 3 columnas para ocupar menos alto.

### 9. Verificación

`tsc --noEmit` y `next build` limpios en `apps/web` y `apps/api` en cada fase. Suites completos corridos repetidas veces a lo largo de la sesión: siempre la misma baseline ya documentada (`login-page.test.tsx` determinístico por `router.push` vs. `window.location.href`, `wizard-shell-finalize.test.tsx`/`training.routes.test.ts` flaky por contención de CPU bajo carga completa, ~15 tests de Supabase Storage con credenciales inválidas en este entorno) — cero regresiones nuevas atribuibles a esta sesión, siempre reconfirmadas corriendo el archivo sospechoso aislado antes de descartarlas.

### 10. Commit y push

Todo lo de esta sesión (167 archivos) se commiteó en un solo commit sobre `backup-migracion-2026-08-05` y se pusheó a `origin/backup-migracion-2026-08-05`. Se dejó fuera a propósito `index.html` (raíz, 567KB) — copia de referencia del monolito legacy, sin trackear en git igual que `BIO360*`.

---

## Próximas actividades — Siguiente sesión (actualizada 2026-08-15)

### Actividad 1 — Decidir sobre `login-page.test.tsx` / `LoginForm.tsx`

- (Sigue sin resolver desde 2026-08-09 tarde.) Confirmar si se quiere restaurar el ruteo inteligente post-login conectando `components/auth/LoginForm.tsx` de verdad en `app/(auth)/login/page.tsx`, o si se prefiere borrar `LoginForm.tsx` como código muerto y simplificar/eliminar esos 5 tests (los mismos que siguen fallando en la suite completa por testear `router.push`, que la página real no usa).

### Actividad 2 — `reset-password` / `therapist/set-password` con el tema día/noche viejo

- (Sigue sin resolver.) Estas dos pantallas siguen usando `theme-login-light/dark` (`--lf-*` en `globals.css`), visualmente inconsistentes con el login/set-password nuevos (`#2A2015`/`--page-bg` fijos).

### Actividad 3 — Construir los 6 módulos placeholder del panel de terapeuta

- (Sigue pendiente de varias sesiones atrás, sin tocar.) Mi perfil, Mis clientes, Mi agenda, Recursos clínicos, Comunidad de terapeutas, Dashboards.

### Actividad 4 — Revisar visualmente en `dev:web` los cambios de hoy

- Login con las dos puertas de entrada (Explorador auto-login, Premium con solicitud), `<LockedBenefit>` en los 5 módulos donde se aplicó, member card con el anillo/fondo corregido, subida de fotos en Eventos/Terapias/Retiros + botón Editar, Índice de bienestar en el home. Todo se verificó por tests/tsc/build, no hay confirmación visual en navegador real de esta sesión.

### Actividad 5 — `variant="apply"` de `<LockedBenefit>` sin caller real

- Queda construido y probado pero nunca se dispara en la app hoy (una cuenta `inactive` no puede loguearse, así que nunca ve un módulo bloqueado). Si en algún momento se decide dejar loguear a cuentas pendientes con todo bloqueado en vez de rechazarlas en el login, ahí se conectaría.

---

## Resumen Ejecutivo — Sesión 2026-08-18 — Módulo de cuenta (perfil/membresía/privacidad) y pago digital con Stripe

### 1. Integración de `AceptacionRegistro` + `PanelConfiguracion` en un módulo de cuenta real

`PanelConfiguracion.jsx` (creado en otra sesión como mock 100% estático) se movió a `components/account/` y se conectó de punta a punta:
- **Perfil**: `PUT /api/clients/:id` (ya existía) ganó validación de email duplicado, que no tenía — un cliente podía pisar el email de otro sin aviso, solo fallaba con un error crudo de Postgres.
- **Membresía**: reusa la misma key SWR de `MemberCard.tsx` (`['client-detail-for-member-card', clientId]`) — cero fetch nuevo.
- **Privacidad y datos**: lectura nueva de `legal_acceptances` (antes solo se podía insertar, nunca leer) vía `apps/api/src/services/account.service.ts`; "Actualizar mi autorización" reabre el `AceptacionRegistro.jsx` real en vez de duplicar el formulario de consentimiento. "Descargar mis datos" es un export mínimo (perfil + membresía + historial legal) a propósito — mediciones/Oura/nutrición quedaron fuera de alcance por decisión explícita.
- **Dispositivos**: reusa `wearable-client.ts` ya existente (conectar/desconectar Oura).
- **Notificaciones**: columna nueva `notification_preferences` (jsonb) en `clients` — lo único genuinamente nuevo del módulo, según lo esperado.
- **Solicitud de eliminación de cuenta**: columna nueva `deletion_requested_at`, idempotente, visible en `admin/clientes` (lista y detalle) con botón "Marcar como resuelta". No dispara ningún borrado real — es evidencia para que un humano contacte al cliente.
- Nuevo módulo backend `account.{service,controller,routes}.ts`, montado en `/api/account`, siempre `req.user.id` (nunca `:id` de otro cliente).
- **Hallazgo real**: cambiar el correo desde el panel rompía el re-login por Google/Apple, porque ambos flujos buscan al cliente por email primero — se agregó respaldo por `googleId`/`appleId` en `googleLogin`/`appleLogin` (`auth.controller.ts`).
- Dropdown del avatar en `ClientTopbar.tsx` rediseñado a pedido explícito posterior: de botones-píldora con borde propio a filas ícono+texto sin borde, con hairline separando "cabecera" de "navegación" de "sesión" — nuevo componente `AccountMenuRow` pensado para escalar sin rediseñar. 2 íconos nuevos en `ui/icons.tsx` (`IconSettings`, `IconLogout`).

### 2. Pago digital con Stripe para membresías (pago único, no suscripción)

Coexiste con el pago en efectivo (aprobación manual del admin, sin tocar). Alejandro confirmó explícitamente: el webhook de Stripe activa la membresía solo con la confirmación del pago, sin pasar por esa cola de aprobación.

- **Hallazgo real importante**: el campo de vencimiento (`clients.plan_end_date`) y la función que lo calcula (`clientsService.renewPlan`) ya existían desde antes — pero estaban huérfanos, sin ningún botón real en producción que los llamara (el flujo de aprobación en efectivo nunca los toca). El webhook de Stripe es el primer consumidor real de esa función en toda la app.
- **Hallazgo real**: `mentoring` no estaba en `ACTIVE_PLAN_TYPES` (`auth.service.ts`) — un cliente Elite nunca se marcaba como vencido sin importar la fecha. Se agregó a pedido explícito de Alejandro.
- **Blocker real resuelto**: `PlanExpiredScreen` bloquea TODA la app sin ninguna salida — sin ajustar esto, un cliente ya vencido nunca podría llegar a la pantalla de pago para volver a pagar. Se agregó una excepción de ruta en `AppShell.tsx` (`pathname !== "/configuracion/membresias"`) + un botón "Renovar membresía" nuevo en esa pantalla.
- 2 tablas nuevas: `membership_prices` (5 filas fijas — Presencial/Online 1 y 3 meses, Elite 3 meses —, editables desde un panel admin nuevo en `/admin/membership-prices`, mismo patrón que "Roles y Perfiles") y `membership_payments` (ledger + mecanismo de idempotencia: Stripe puede reenviar el mismo evento de webhook más de una vez). Precios en tabla de DB, no env vars, porque Alejandro espera que cambien y no quiere depender de un redeploy.
- **Detalle técnico crítico**: el webhook (`/api/stripe/webhook`) se monta en `app.ts` ANTES del `express.json()` global, con su propio `express.raw()` — Stripe exige el body sin parsear para verificar la firma. Es el primer middleware `raw` del proyecto.
- El endpoint que crea el `PaymentIntent` (`POST /api/account/membership/checkout`) NUNCA activa nada — valida server-side la combinación tier/duración (nunca confía en lo que manda el cliente; ej. Elite solo se puede pagar a 3 meses) y solo arma el pago. Únicamente el webhook, tras verificar la firma, activa la membresía reusando en secuencia `updateStatus`/`updateClientType`/`renewPlan` ya existentes.
- Frontend nuevo: `/configuracion/membresias` (`PanelMembresias.tsx`) con Stripe Elements (`PaymentElement`). Estados explícitos por card: seleccionando → pagando → confirmando → activo — **nunca marca "activo" solo porque `stripe.confirmPayment()` no tiró error**; hace polling contra `GET /api/account/membership/payments/:id` (nuestro backend, que solo lo sabe con certeza tras el webhook) hasta ver `succeeded`.
- `MemberCard.tsx` y la sección Membresía del panel de cuenta ya muestran el vencimiento (mismo dato/hook, sin fetch nuevo) — acento dorado (no rojo, la card no tenía ningún color de alerta) si venció.

### 3. Commit

Todo lo de esta sesión, más trabajo de sesiones anteriores que seguía sin commitear (candados de topbar/`moduleAccess` resuelto contra la matriz real, accesos rápidos del inicio condicionados a datos reales cargados), se commiteó en 2 commits sobre `backup-migracion-2026-08-05`, **sin pushear** (no pedido explícitamente). Quedaron fuera del commit, sin investigar su origen: `Documentos/` e `index.html` (raíz) — no tienen relación con este trabajo.

### 4. Verificación

`tsc --noEmit` limpio en `apps/api`/`apps/web`/`packages/shared-types`. Suites completos corridos varias veces: la única baseline de fallas es la ya documentada (`login-page.test.tsx` determinístico, `wizard-shell-finalize.test.tsx` flaky por CPU, ~15 tests de Supabase Storage con credenciales inválidas en este entorno) — cero regresiones nuevas atribuibles a esta sesión. Verificación visual en navegador real: pendiente de Alejandro (todo el desarrollo se hizo por tests/tsc, sin acceso a browser en este entorno).

---

## Próximas actividades — Siguiente sesión (actualizada 2026-08-18)

### Actividad 1 — Activar el cobro real de Stripe (bloqueante para probar el flujo)

- Alejandro debe dar: `STRIPE_SECRET_KEY` y `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (modo test), y configurar el endpoint del webhook (`/api/stripe/webhook`) en el dashboard de Stripe para obtener `STRIPE_WEBHOOK_SECRET`. Además, cargar los 5 montos reales desde `/admin/membership-prices` — hoy arrancan en $0 y el checkout rechaza pagar un plan en $0 (`PriceNotConfiguredError`, 409).
- Con eso, probar un pago end-to-end con la tarjeta de test `4242 4242 4242 4242`: confirmar que el webhook llega, el PaymentIntent queda `succeeded` en el dashboard de Stripe, y que `clients.status`/`client_type`/`plan_end_date` se actualizan correctamente.

### Actividad 2 — Verificación visual pendiente (todo esta sesión se hizo por tests/tsc, sin browser)

- Panel de Configuración completo (perfil, avatar, notificaciones, privacidad, dispositivos, seguridad, eliminar cuenta), el dropdown rediseñado del avatar en el topbar, `/configuracion/membresias`, y `PlanExpiredScreen` con el botón "Renovar membresía" nuevo.

### Actividad 3 — Decidir sobre `login-page.test.tsx` / `LoginForm.tsx`

- (Sigue sin resolver desde 2026-08-09 tarde.) Confirmar si se quiere restaurar el ruteo inteligente post-login conectando `components/auth/LoginForm.tsx` de verdad en `app/(auth)/login/page.tsx`, o si se prefiere borrar `LoginForm.tsx` como código muerto y simplificar/eliminar esos 5 tests.

### Actividad 4 — Construir los 6 módulos placeholder del panel de terapeuta

- (Sigue pendiente de varias sesiones atrás, sin tocar.) Mi perfil, Mis clientes, Mi agenda, Recursos clínicos, Comunidad de terapeutas, Dashboards.

---

## Notas adicionales

- **No modificar `server.js` ni `index.html` (raíz):** son el monolito legacy que Vercel sigue deployando en producción desde `origin/main`. Todo desarrollo nuevo va en `apps/api` / `apps/web`, commiteado en `backup-migracion-2026-08-05`.
- **`BIO360Index.html`, `BIO360server.js`, `BIO360routes/`, `BIO360services/` (raíz):** copia de referencia del monolito legacy usada solo para extraer quirúrgicamente el módulo de Dispositivos y Laboratorios (sección 11). Quedan sin trackear en git a propósito (son archivos grandes de solo consulta, no forman parte de la arquitectura nueva) — no leerlos completos, solo con grep/sed dirigido.
- **Puertos:** backend nuevo `:3003`, front nuevo `:3000`, backend legacy `:3001` (ver sección 8). Usar `npm run dev:api` / `npm run dev:web` desde la raíz para evitar confusión.
- **Dos bases de datos Supabase separadas:** dev (`DATABASE_URL` en `apps/api/.env`) y test (`TEST_DATABASE_URL` en `apps/api/.env.test`) — las migraciones de `tasks/*.sql` hay que aplicarlas a mano en ambas, no se sincronizan solas.
- **Nunca commitear/pushear a `origin/main` directamente** — riesgo real de romper el deploy de producción en Vercel.
- **Nunca cambiar de rama, commitear o pushear sin pedido explícito del usuario en ese turno**, incluso si ya se autorizó antes en la misma sesión.
- **Nunca encadenar `git stash` con un comando largo y `git stash pop` en una sola invocación de shell** (ej. `git stash && npx vitest run && git stash pop`) — si el comando del medio se corta por timeout, el `stash pop` puede quedar aplicado a medias y corromper archivos silenciosamente (visto en la sesión 2026-08-09 tarde). Si hace falta comparar contra un estado previo, usar `git show <ref>:<path>` para leer sin tocar el working tree, o ejecutar cada paso (`stash`, el comando, `stash pop`) como llamadas separadas.
- **Cambios de schema (nueva columna/tabla):** nunca `drizzle-kit push` (se cuelga esperando confirmación de un TUI invisible en background). Escribir un script `tsx` desechable con el paquete `postgres` (mismo patrón que `apps/api/src/db/index.ts`), correr el DDL a mano (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...`) contra `DATABASE_URL` y `TEST_DATABASE_URL` (las dos, no se sincronizan solas), borrar el script al terminar, y reflejar el cambio a mano en `apps/api/src/models/schema.ts` (Drizzle no lo detecta solo).
- **Panel admin usa topbar horizontal (`AdminTopbar.tsx`), no sidebar** desde la sesión 2026-08-10 — `Sidebar.tsx`/`AdminNavItems.tsx`/`SidebarRing.tsx`/`UserChip.tsx`/`MobileTopbar.tsx` fueron borrados por quedar sin uso. Los tres roles (cliente, terapeuta, admin) usan topbar horizontal ahora, ninguno usa sidebar vertical.
- **API camelCase, no snake_case:** las respuestas del backend (Drizzle) usan las mismas keys camelCase que las columnas TS del schema (`createdAt`, `clientId`, etc.), nunca snake_case — si un componente nuevo espera `created_at`/`client_id` lo más probable es que esté copiado de un patrón legacy y haya que corregirlo, no que el backend esté mal.
- **Cuidado con `campo ? new Date(campo) : null` en updates parciales de servicios `updateX()`:** si el campo no viene en el `input` (undefined), ese ternario igual evalúa a `null` y borra el valor existente en la base — a diferencia de `campo ?? undefined` (que sí deja el valor intacto cuando falta). Encontrado y corregido en `events.service.ts`/`retreats.service.ts` (2026-08-15): togglear "Desactivar" borraba silenciosamente la fecha del evento. Antes de escribir un `updateX()` nuevo con campos de fecha, usar el patrón correcto: `campo !== undefined ? (campo ? new Date(campo) : null) : undefined`. Vale la pena revisar si el mismo patrón roto existe en otros `updateX()` no tocados todavía.
- **Webhooks de terceros (Stripe y cualquier futuro) necesitan el body crudo:** montar esa ruta específica en `app.ts` ANTES del `express.json()` global, con su propio `express.raw({ type: 'application/json' })` — si se monta después, la firma nunca verifica porque el body ya llegó parseado a objeto. Ver `apps/api/src/routes/stripe-webhook.routes.ts` (sesión 2026-08-18) como referencia del patrón.
- **`membership_prices` arranca en $0 para los 5 planes** (Presencial/Online/Elite) hasta que Alejandro los cargue desde `/admin/membership-prices` — el checkout de Stripe rechaza pagar un plan en $0 a propósito (`PriceNotConfiguredError`, 409). Cualquier prueba end-to-end del pago necesita esto cargado primero.
