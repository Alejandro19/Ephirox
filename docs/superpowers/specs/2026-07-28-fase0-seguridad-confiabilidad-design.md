# Fase 0 — Red de seguridad (tests, CI, hardening puntual) — Design

## Contexto

LATRIBU es hoy un monolito sin red de seguridad: `index.html` (~6,400 líneas,
todo el frontend en un `<script>` inline, sin build ni framework) y
`server.js` (~2,300 líneas, Express + Supabase vía PostgREST, sin ORM). No
hay tests, no hay CI, las migraciones de DB se corren a mano en el SQL
Editor de Supabase, y el deploy a producción (Vercel) ocurre automáticamente
en cada `git push origin main`.

Esta es la primera de tres fases de una reestructuración por fases hacia un
sistema más seguro, confiable y escalable:

- **Fase 0 (este spec):** tests mínimos + CI + hardening de seguridad
  puntual. Riesgo bajo, no toca la arquitectura.
- **Fase 1 (futura):** modularizar el frontend, automatizar migraciones,
  ambiente de staging. Riesgo medio.
- **Fase 2 (futura):** separar rutas/controladores/servicios,
  observabilidad real, posible framework de componentes. Riesgo alto.

Las fases 1 y 2 dependen de que la Fase 0 exista — sin tests ni CI,
cualquier refactor de arquitectura es un salto a ciegas.

## Objetivo

Dar a LATRIBU una red de seguridad mínima (tests + CI) y cerrar dos
vulnerabilidades concretas ya identificadas, sin cambiar ningún
comportamiento visible para el cliente final (salvo rate limiting en login
y el bloqueo de orígenes CORS no autorizados, ambos invisibles en uso
normal).

## Alcance

### 1. Suite de tests — auth y permisos

**Framework:** `node:test` (módulo built-in de Node.js). Cero dependencias
nuevas de testing, coherente con el estilo actual del proyecto (sin build
step, sin frameworks).

**Entorno:** un proyecto Supabase **separado**, dedicado solo a tests —
mismo `schema.sql` corrido ahí, datos completamente descartables. Los tests
golpean la base de datos real (no mocks), porque el objetivo es detectar
problemas reales de queries/schema/permisos, no solo de lógica JS.

- Nueva variable de entorno de test: `.env.test`, con `SUPABASE_URL` /
  `SUPABASE_SERVICE_ROLE_KEY` apuntando al proyecto de pruebas. Nunca debe
  apuntar al proyecto de producción — el runner de tests debe fallar
  fuerte si detecta que `SUPABASE_URL` de `.env.test` coincide con la de
  `.env` de producción.
- `.env.test` se agrega a `.gitignore` (igual que `.env`), no se commitea.

**Cobertura de esta fase (auth + permisos únicamente):**
- Login de admin exitoso y con credenciales inválidas.
- Login de cliente exitoso y con credenciales inválidas.
- JWT: token válido, token expirado, token manipulado (firma inválida) —
  las tres rutas de `authMiddleware`.
- `ownerOrAdmin`: un cliente A no puede leer/editar el recurso de un
  cliente B; el mismo cliente sí puede leer/editar el suyo; un admin puede
  todo.
- `adminOnly`: un cliente (no-admin) no puede pegarle a endpoints
  exclusivos de admin.
- `blockForLeadWellness`: un cliente tipo `lead_wellness` recibe 403 en los
  endpoints bloqueados para ese tipo de cliente; otros tipos de cliente no.

**Explícitamente fuera de esta fase:** tests de InBody, objetivos,
cadencia, Mi Evolución, entrenamiento, etc. Quedan para una fase de
cobertura posterior — este spec cubre solo la superficie de mayor impacto
si falla (acceso cruzado entre clientes).

`package.json` gana un script: `"test": "node --test"`.

### 2. CI — GitHub Actions

El repo ya vive en `github.com/Alejandro19/latribu` (remoto `origin`
confirmado), así que no hace falta conectar nada nuevo.

`.github/workflows/ci.yml`:
- Dispara en push y pull request a `main`.
- Pasos: checkout → `npm install` → `node --check server.js` → `npm test`.
- Los secrets de Supabase de test se configuran como GitHub Actions
  Secrets (`TEST_SUPABASE_URL`, `TEST_SUPABASE_SERVICE_ROLE_KEY`) — nunca
  en el repo.
- **No bloquea el deploy de Vercel.** Vercel sigue desplegando
  automáticamente en push a `main`, independiente de si CI pasa o falla.
  CI es una señal (se ve en GitHub, en el PR/commit), no un gate — convertirlo
  en gate es una decisión posterior, fuera de este spec.

### 3. Hardening de seguridad puntual

**JWT_SECRET sin fallback inseguro** (`server.js:23`):
```js
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_in_production';
```
Hoy, si `JWT_SECRET` no está seteada en el entorno (ej. Vercel mal
configurado), el servidor arranca igual y firma tokens con un secreto
público conocido (visible en `.env.example`) — cualquiera puede forjar un
JWT de admin. Se cambia a: si `JWT_SECRET` no está seteada, el proceso
lanza un error al arrancar y no levanta el servidor. Nunca debe operar con
un secreto adivinable.

**CORS restringido** (`server.js:71`):
```js
app.use(cors({ origin: '*', methods: [...] }));
```
Se restringe a una lista explícita de orígenes permitidos:
`https://latribu-oficial.vercel.app` (producción) y
`http://localhost:3001` (desarrollo local). Cualquier otro origen recibe el
rechazo estándar de CORS.

**Rate limiting en login:**
Se agrega `express-rate-limit` (dependencia nueva, pequeña, estándar de la
industria) aplicado solo a `/api/auth/login`: 10 intentos por IP cada 15
minutos; al superarlo, responde `429` con un mensaje claro. Funciona en
memoria del propio proceso (sin Redis ni infraestructura nueva) —
suficiente para el volumen actual de LATRIBU.

### 4. Logging estructurado

Se reemplaza el patrón actual de `console.error(...)`/`console.warn(...)`
sueltos (mensajes libres, sin formato consistente) por una función
`logError(context, error)` centralizada:
- Formato consistente: timestamp ISO, endpoint/contexto, mensaje de error,
  stack si aplica.
- Sigue imprimiendo a `stdout`/`stderr` — Vercel ya captura esos logs, no
  se agrega ningún servicio externo de pago en esta fase.
- **Explícitamente fuera de esta fase:** integrar Sentry o similar
  (alertas automáticas, dashboard de errores) — eso es observabilidad real,
  parte de la Fase 2.

## Fuera de alcance de esta fase (recordatorio)

- Modularizar `index.html`/`server.js`.
- Automatizar migraciones de DB (siguen siendo SQL manual en Supabase).
- Ambiente de staging separado de producción.
- Separación de rutas/controladores/servicios en el backend.
- Framework de componentes en el frontend.
- Observabilidad real (Sentry, métricas, dashboards).
- Tests de cualquier módulo que no sea auth/permisos.

## Riesgos

- Bajo, en general — ningún cambio toca la arquitectura ni el
  comportamiento funcional visible para clientes.
- El único cambio con efecto visible real: si `JWT_SECRET` no está
  correctamente seteada en Vercel producción hoy (usando el fallback sin
  saberlo), el servidor **dejará de arrancar** tras este cambio hasta que
  se configure la env var correctamente. Se debe verificar ANTES de
  deployar que `JWT_SECRET` esté seteada en Vercel (Settings → Environment
  Variables) con un valor fuerte y distinto del de `.env.example`.
- CORS restringido podría romper algo si existe algún consumo del API
  desde un origen no contemplado (ej. una app móvil futura, otro dominio) —
  no se conoce ninguno hoy, pero vale confirmarlo antes de mergear.

## Tiempo estimado

1-2 semanas.
