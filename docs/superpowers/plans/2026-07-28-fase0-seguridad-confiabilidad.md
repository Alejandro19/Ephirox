# Fase 0 — Red de seguridad (tests, CI, hardening) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give LATRIBU a minimal but real safety net (auth/permissions tests + CI) and close two known vulnerabilities (insecure JWT_SECRET fallback, open CORS), without changing any customer-visible behavior except login rate limiting and CORS origin enforcement.

**Architecture:** `server.js` already exports its Express `app` and guards `app.listen` with `require.main === module`, so it's testable in-process — tests start the app on an ephemeral port and hit it with Node's built-in `fetch`. Tests run against a dedicated Supabase project reserved for testing (never production), seeded and torn down per test via direct Supabase inserts (bypassing the API) using the service-role key.

**Tech Stack:** `node:test` (Node's built-in test runner, no new dependency), Node's global `fetch`, `express-rate-limit` (new dependency), GitHub Actions.

## Global Constraints

- Tests run against a **separate Supabase project dedicated to tests** — never the production project. `test/helpers/setupTestEnv.js` must refuse to run (throw) if the test project's URL matches the production project's URL.
- Test framework is `node:test` — no Jest, no other test dependency added.
- CORS allowed origins: `https://latribu-oficial.vercel.app` (production) and `http://localhost:3001` (local dev).
- Login rate limit: 10 requests per IP per 15 minutes on `POST /api/auth/login`, using `express-rate-limit`.
- `JWT_SECRET` must have **no fallback** — the server must throw and refuse to start if it isn't set.
- CI (`.github/workflows/ci.yml`) runs `node --check server.js` and `npm test` on push/PR to `main`. It does **not** gate the Vercel deploy — Vercel keeps deploying automatically on push to `main` regardless of CI result.
- No Sentry/external logging service in this phase — only a structured `logError` helper printing to stdout/stderr (Vercel already captures those).
- Explicitly out of scope for this phase (do not touch): modularizing `index.html`/`server.js`, DB migration automation, a staging environment, tests for any module other than auth/permissions, backend route/controller/service separation, any frontend change.

---

### Task 1: Test harness bootstrap + smoke test

**Files:**
- Create: `.env.test.example`
- Modify: `.gitignore`
- Create: `test/helpers/setupTestEnv.js`
- Create: `test/helpers/testApp.js`
- Create: `test/smoke.test.js`
- Modify: `package.json`

**Interfaces:**
- Produces: `test/helpers/setupTestEnv.js` — side-effecting module (no exports); when required, loads `.env.test` into `process.env` and throws if misconfigured or if it matches production.
- Produces: `test/helpers/testApp.js` — exports `async function startTestApp(): Promise<{ baseUrl: string, close: () => Promise<void> }>`.

- [ ] **Step 1: Create the committed test-env template**

Create `.env.test.example`:

```
# Copia este archivo a .env.test (NO se commitea, ya está en .gitignore) y
# completa con un proyecto de Supabase DEDICADO A PRUEBAS — nunca el de
# producción. Corre schema.sql en ese proyecto de pruebas antes de usarlo.
SUPABASE_URL=your_test_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_test_supabase_service_role_key
JWT_SECRET=test_only_secret_do_not_use_in_prod
JWT_EXPIRES_IN=8h
```

- [ ] **Step 2: Ignore the real test-env file**

In `.gitignore`, add a new line after `.env`:

```
node_modules/
.env
.env.test
.DS_Store
*.log
.worktrees/
```

- [ ] **Step 3: Write the env-loading guard**

Create `test/helpers/setupTestEnv.js`:

```js
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const testEnvPath = path.join(__dirname, '../../.env.test');
const prodEnvPath = path.join(__dirname, '../../.env');

if (!fs.existsSync(testEnvPath)) {
  throw new Error(
    'Falta .env.test — copia .env.test.example a .env.test y complétalo con ' +
    'un proyecto de Supabase DEDICADO A PRUEBAS antes de correr los tests.'
  );
}

const testEnv = dotenv.parse(fs.readFileSync(testEnvPath));

if (!testEnv.SUPABASE_URL || !testEnv.SUPABASE_SERVICE_ROLE_KEY || !testEnv.JWT_SECRET) {
  throw new Error(
    '.env.test debe definir SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y JWT_SECRET.'
  );
}

let prodEnv = {};
if (fs.existsSync(prodEnvPath)) {
  prodEnv = dotenv.parse(fs.readFileSync(prodEnvPath));
}

if (prodEnv.SUPABASE_URL && testEnv.SUPABASE_URL === prodEnv.SUPABASE_URL) {
  throw new Error(
    'SUPABASE_URL en .env.test es igual a la de .env (producción). Los tests ' +
    'NUNCA deben correr contra la base de datos real — crea un proyecto ' +
    'Supabase separado dedicado solo a pruebas.'
  );
}

for (const [key, value] of Object.entries(testEnv)) {
  process.env[key] = value;
}
```

- [ ] **Step 4: Write the test-app starter**

Create `test/helpers/testApp.js`:

```js
require('./setupTestEnv');
const app = require('../../server');

function startTestApp() {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        baseUrl: `http://127.0.0.1:${port}`,
        close: () => new Promise((res) => server.close(res)),
      });
    });
  });
}

module.exports = { startTestApp };
```

- [ ] **Step 5: Write the smoke test**

Create `test/smoke.test.js`:

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { startTestApp } = require('./helpers/testApp');

test('GET /health responds 200 with status ok', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);

  const res = await fetch(`${baseUrl}/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, 'ok');
});
```

- [ ] **Step 6: Add the test script and Node version floor to package.json**

In `package.json`, add a `"test"` script and an `"engines"` field:

```json
{
  "name": "latribu-portal",
  "version": "1.0.0",
  "private": true,
  "main": "server.js",
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "node --test test/*.test.js"
  },
  "dependencies": {
    "@google-cloud/vision": "^5.3.7",
    "@supabase/supabase-js": "2.103.0",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "country-state-city": "^3.2.1",
    "dotenv": "^16.6.1",
    "express": "^4.18.3",
    "google-auth-library": "^10.9.0",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.2",
    "multer": "^2.2.0",
    "nodemailer": "^6.9.4",
    "pdf-parse": "^1.1.1"
  },
  "devDependencies": {
    "nodemon": "^3.1.0"
  }
}
```

(`"test": "node --test test/*.test.js"` is deliberately restricted to the
top-level `test/*.test.js` files, not a recursive `test/**` glob — Node's
test runner auto-discovers any file under a directory named `test`, which
would otherwise try to execute the helper files in `test/helpers/` as test
suites too.)

- [ ] **Step 7: Manual — create the test Supabase project**

This step cannot be automated by an agent — it requires a human with
Supabase account access:
1. Create a new, separate Supabase project dedicated only to tests (free tier is enough).
2. Run the existing `schema.sql` against it (Supabase SQL Editor).
3. Copy `.env.test.example` to `.env.test` and fill in that test project's `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, plus any string for `JWT_SECRET` (does not need to match production).

- [ ] **Step 8: Run the smoke test to verify the harness works**

Run: `npm test`
Expected: `# pass 1`, `# fail 0` (the smoke test passes). If it throws
"Falta .env.test...", Step 7 wasn't completed yet.

- [ ] **Step 9: Commit**

```bash
git add .env.test.example .gitignore test/helpers/setupTestEnv.js test/helpers/testApp.js test/smoke.test.js package.json
git commit -m "test: add node:test harness against a dedicated Supabase test project"
```

---

### Task 2: Auth login tests (admin + client, success + failure)

**Files:**
- Create: `test/helpers/fixtures.js`
- Create: `test/auth-login.test.js`

**Interfaces:**
- Consumes: `startTestApp()` from `test/helpers/testApp.js` (Task 1).
- Produces: `test/helpers/fixtures.js` exporting:
  - `async function createTestAdmin(overrides?): Promise<{id, name, email, password}>`
  - `async function createTestClient(overrides?): Promise<{id, name, email, password, client_type, status}>`
  - `async function deleteTestAdmin(id): Promise<void>`
  - `async function deleteTestClient(id): Promise<void>`
  These are consumed by Tasks 3 and 4 as well.

- [ ] **Step 1: Write the fixtures helper**

Create `test/helpers/fixtures.js`:

```js
require('./setupTestEnv');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

function testSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

async function createTestAdmin(overrides = {}) {
  const password = overrides.password || 'TestPass123!';
  const password_hash = await bcrypt.hash(password, 10);
  const email = overrides.email || `admin-${randomUUID()}@test.latribu.local`;
  const { data, error } = await testSupabase()
    .from('admins')
    .insert({ name: overrides.name || 'Admin de prueba', email, password_hash })
    .select()
    .single();
  if (error) throw error;
  return { ...data, password };
}

async function createTestClient(overrides = {}) {
  const password = overrides.password || 'TestPass123!';
  const password_hash = await bcrypt.hash(password, 10);
  const email = overrides.email || `client-${randomUUID()}@test.latribu.local`;
  const { data, error } = await testSupabase()
    .from('clients')
    .insert({
      name: overrides.name || 'Cliente de prueba',
      email,
      password_hash,
      client_type: overrides.client_type || 'coaching_1_1',
      status: overrides.status || 'active',
    })
    .select()
    .single();
  if (error) throw error;
  return { ...data, password };
}

async function deleteTestAdmin(id) {
  await testSupabase().from('admins').delete().eq('id', id);
}

async function deleteTestClient(id) {
  await testSupabase().from('clients').delete().eq('id', id);
}

module.exports = { createTestAdmin, createTestClient, deleteTestAdmin, deleteTestClient };
```

- [ ] **Step 2: Write the failing login tests**

Create `test/auth-login.test.js`:

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { startTestApp } = require('./helpers/testApp');
const { createTestAdmin, createTestClient, deleteTestAdmin, deleteTestClient } = require('./helpers/fixtures');

test('admin login: correct credentials returns a token', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);
  const admin = await createTestAdmin();
  t.after(() => deleteTestAdmin(admin.id));

  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: admin.email, password: admin.password }),
  });
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.role, 'admin');
  assert.equal(body.user.email, admin.email);
  assert.equal(typeof body.token, 'string');
});

test('admin login: wrong password is rejected', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);
  const admin = await createTestAdmin();
  t.after(() => deleteTestAdmin(admin.id));

  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: admin.email, password: 'wrong-password' }),
  });
  const body = await res.json();

  assert.equal(res.status, 401);
  assert.equal(body.success, false);
  assert.equal(body.error, 'Credenciales incorrectas.');
});

test('client login: correct credentials returns a token', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);
  const client = await createTestClient();
  t.after(() => deleteTestClient(client.id));

  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: client.email, password: client.password }),
  });
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.role, 'cliente');
  assert.equal(body.user.id, client.id);
});

test('client login: wrong password is rejected', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);
  const client = await createTestClient();
  t.after(() => deleteTestClient(client.id));

  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: client.email, password: 'wrong-password' }),
  });
  const body = await res.json();

  assert.equal(res.status, 401);
  assert.equal(body.success, false);
  assert.equal(body.error, 'Credenciales incorrectas.');
});

test('login: unknown email is rejected the same as wrong password', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);

  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `nobody-${Date.now()}@test.latribu.local`, password: 'whatever' }),
  });
  const body = await res.json();

  assert.equal(res.status, 401);
  assert.equal(body.success, false);
  assert.equal(body.error, 'Credenciales incorrectas.');
});

test('client login: inactive account is rejected even with correct password', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);
  const client = await createTestClient({ status: 'inactive' });
  t.after(() => deleteTestClient(client.id));

  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: client.email, password: client.password }),
  });
  const body = await res.json();

  assert.equal(res.status, 403);
  assert.equal(body.success, false);
  assert.equal(body.error, 'Tu cuenta está inactiva. Contacta al administrador.');
});
```

- [ ] **Step 3: Run the tests**

Run: `npm test`
Expected: all 6 new tests in `auth-login.test.js` pass, plus the smoke test from Task 1 (`# pass 7`, `# fail 0`).

- [ ] **Step 4: Commit**

```bash
git add test/helpers/fixtures.js test/auth-login.test.js
git commit -m "test: cover admin/client login success, failure, and inactive-account cases"
```

---

### Task 3: JWT hardening (no insecure fallback) + JWT verification tests

**Files:**
- Modify: `server.js:23`
- Create: `test/jwt-secret-required.test.js`
- Create: `test/auth-jwt.test.js`

**Interfaces:**
- Consumes: `startTestApp()` (Task 1), `createTestAdmin`/`deleteTestAdmin` (Task 2).

- [ ] **Step 1: Write the failing test for the missing-secret case**

Create `test/jwt-secret-required.test.js`:

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
require('./helpers/setupTestEnv');

test('server refuses to start when JWT_SECRET is not set', () => {
  const serverPath = require.resolve('../server');
  delete require.cache[serverPath];
  const originalSecret = process.env.JWT_SECRET;
  delete process.env.JWT_SECRET;

  try {
    assert.throws(() => require('../server'), /JWT_SECRET/);
  } finally {
    process.env.JWT_SECRET = originalSecret;
    delete require.cache[serverPath];
  }
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test test/jwt-secret-required.test.js`
Expected: FAIL — `server.js` still has the insecure fallback, so `require('../server')` does not throw and `assert.throws` fails.

- [ ] **Step 3: Remove the insecure JWT_SECRET fallback**

In `server.js`, replace:

```js
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_in_production';
```

with:

```js
if (!process.env.JWT_SECRET) {
  throw new Error(
    'JWT_SECRET no está configurada. Define esta variable de entorno antes ' +
    'de arrancar el servidor — nunca debe operar con un secreto por defecto.'
  );
}
const JWT_SECRET = process.env.JWT_SECRET;
```

- [ ] **Step 4: Run the test again to verify it passes**

Run: `node --test test/jwt-secret-required.test.js`
Expected: PASS.

- [ ] **Step 5: Write the token-validation tests**

Create `test/auth-jwt.test.js`:

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { startTestApp } = require('./helpers/testApp');
const { createTestAdmin, deleteTestAdmin } = require('./helpers/fixtures');

test('protected route: no Authorization header is rejected', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);

  const res = await fetch(`${baseUrl}/api/auth/me`);
  const body = await res.json();

  assert.equal(res.status, 401);
  assert.equal(body.error, 'Token requerido.');
});

test('protected route: malformed token is rejected', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);

  const res = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: 'Bearer not-a-real-token' },
  });
  const body = await res.json();

  assert.equal(res.status, 401);
  assert.equal(body.error, 'Token inválido o expirado.');
});

test('protected route: expired token is rejected', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);
  const admin = await createTestAdmin();
  t.after(() => deleteTestAdmin(admin.id));

  const expiredToken = jwt.sign(
    { id: admin.id, role: 'admin', name: admin.name, email: admin.email },
    process.env.JWT_SECRET,
    { expiresIn: '-1s' }
  );

  const res = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${expiredToken}` },
  });
  const body = await res.json();

  assert.equal(res.status, 401);
  assert.equal(body.error, 'Token inválido o expirado.');
});

test('protected route: tampered token is rejected', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);
  const admin = await createTestAdmin();
  t.after(() => deleteTestAdmin(admin.id));

  const validToken = jwt.sign(
    { id: admin.id, role: 'admin', name: admin.name, email: admin.email },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
  const tamperedToken = validToken.slice(0, -1) + (validToken.endsWith('a') ? 'b' : 'a');

  const res = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${tamperedToken}` },
  });
  const body = await res.json();

  assert.equal(res.status, 401);
  assert.equal(body.error, 'Token inválido o expirado.');
});

test('protected route: valid token is accepted', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);
  const admin = await createTestAdmin();
  t.after(() => deleteTestAdmin(admin.id));

  const validToken = jwt.sign(
    { id: admin.id, role: 'admin', name: admin.name, email: admin.email },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  const res = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${validToken}` },
  });
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.user.email, admin.email);
});
```

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: all tests pass (`# fail 0`), including the 5 new ones in `auth-jwt.test.js` and the 1 in `jwt-secret-required.test.js`.

- [ ] **Step 7: Commit**

```bash
git add server.js test/jwt-secret-required.test.js test/auth-jwt.test.js
git commit -m "fix: remove insecure JWT_SECRET fallback, add JWT validation tests"
```

---

### Task 4: Permission middleware tests (ownerOrAdmin, adminOnly, blockForLeadWellness)

**Files:**
- Create: `test/auth-permissions.test.js`

**Interfaces:**
- Consumes: `startTestApp()` (Task 1), `createTestAdmin`/`createTestClient`/`deleteTestAdmin`/`deleteTestClient` (Task 2).

- [ ] **Step 1: Write the permission tests**

Create `test/auth-permissions.test.js`:

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { startTestApp } = require('./helpers/testApp');
const { createTestAdmin, createTestClient, deleteTestAdmin, deleteTestClient } = require('./helpers/fixtures');

function tokenFor(user, role) {
  return jwt.sign(
    { id: user.id, role, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
}

test('ownerOrAdmin: a client cannot read another client\'s data', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);
  const clientA = await createTestClient();
  const clientB = await createTestClient();
  t.after(() => Promise.all([deleteTestClient(clientA.id), deleteTestClient(clientB.id)]));

  const res = await fetch(`${baseUrl}/api/clients/${clientB.id}`, {
    headers: { Authorization: `Bearer ${tokenFor(clientA, 'cliente')}` },
  });
  const body = await res.json();

  assert.equal(res.status, 403);
  assert.equal(body.error, 'No tienes permiso para acceder a estos datos.');
});

test('ownerOrAdmin: a client can read its own data', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);
  const client = await createTestClient();
  t.after(() => deleteTestClient(client.id));

  const res = await fetch(`${baseUrl}/api/clients/${client.id}`, {
    headers: { Authorization: `Bearer ${tokenFor(client, 'cliente')}` },
  });
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.client.id, client.id);
});

test('ownerOrAdmin: an admin can read any client\'s data', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);
  const admin = await createTestAdmin();
  const client = await createTestClient();
  t.after(() => Promise.all([deleteTestAdmin(admin.id), deleteTestClient(client.id)]));

  const res = await fetch(`${baseUrl}/api/clients/${client.id}`, {
    headers: { Authorization: `Bearer ${tokenFor(admin, 'admin')}` },
  });
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.client.id, client.id);
});

test('adminOnly: a client cannot list all clients', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);
  const client = await createTestClient();
  t.after(() => deleteTestClient(client.id));

  const res = await fetch(`${baseUrl}/api/clients`, {
    headers: { Authorization: `Bearer ${tokenFor(client, 'cliente')}` },
  });
  const body = await res.json();

  assert.equal(res.status, 403);
  assert.equal(body.error, 'Acceso restringido a administradores.');
});

test('adminOnly: an admin can list all clients', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);
  const admin = await createTestAdmin();
  t.after(() => deleteTestAdmin(admin.id));

  const res = await fetch(`${baseUrl}/api/clients`, {
    headers: { Authorization: `Bearer ${tokenFor(admin, 'admin')}` },
  });

  assert.equal(res.status, 200);
});

test('blockForLeadWellness: a lead_wellness client is blocked from personal-info', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);
  const client = await createTestClient({ client_type: 'lead_wellness' });
  t.after(() => deleteTestClient(client.id));

  const res = await fetch(`${baseUrl}/api/clients/${client.id}/personal-info`, {
    headers: { Authorization: `Bearer ${tokenFor(client, 'cliente')}` },
  });
  const body = await res.json();

  assert.equal(res.status, 403);
  assert.equal(body.error, 'Este módulo no está disponible para tu tipo de cuenta.');
});

test('blockForLeadWellness: a coaching_1_1 client is not blocked from personal-info', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);
  const client = await createTestClient({ client_type: 'coaching_1_1' });
  t.after(() => deleteTestClient(client.id));

  const res = await fetch(`${baseUrl}/api/clients/${client.id}/personal-info`, {
    headers: { Authorization: `Bearer ${tokenFor(client, 'cliente')}` },
  });

  assert.equal(res.status, 200);
});
```

- [ ] **Step 2: Run the full suite**

Run: `npm test`
Expected: all tests pass, including the 7 new ones here.

- [ ] **Step 3: Commit**

```bash
git add test/auth-permissions.test.js
git commit -m "test: cover ownerOrAdmin, adminOnly, and blockForLeadWellness middleware"
```

---

### Task 5: Restrict CORS to known origins

**Files:**
- Modify: `server.js:71`
- Create: `test/cors.test.js`

**Interfaces:**
- Consumes: `startTestApp()` (Task 1).

- [ ] **Step 1: Write the failing test**

Create `test/cors.test.js`:

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { startTestApp } = require('./helpers/testApp');

test('CORS: allows the production origin', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);

  const res = await fetch(`${baseUrl}/health`, {
    headers: { Origin: 'https://latribu-oficial.vercel.app' },
  });

  assert.equal(res.headers.get('access-control-allow-origin'), 'https://latribu-oficial.vercel.app');
});

test('CORS: allows localhost for local development', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);

  const res = await fetch(`${baseUrl}/health`, {
    headers: { Origin: 'http://localhost:3001' },
  });

  assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:3001');
});

test('CORS: does not reflect an unknown origin', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);

  const res = await fetch(`${baseUrl}/health`, {
    headers: { Origin: 'https://evil-example.com' },
  });

  assert.equal(res.headers.get('access-control-allow-origin'), null);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test test/cors.test.js`
Expected: FAIL — today's `origin: '*'` reflects every origin, so the third test fails (`access-control-allow-origin` would be `*`, not `null`).

- [ ] **Step 3: Restrict CORS to known origins**

In `server.js`, replace:

```js
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] }));
```

with:

```js
const ALLOWED_ORIGINS = ['https://latribu-oficial.vercel.app', 'http://localhost:3001'];
app.use(cors({ origin: ALLOWED_ORIGINS, methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] }));
```

- [ ] **Step 4: Run the test again to verify it passes**

Run: `node --test test/cors.test.js`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all tests still pass — this change must not break the earlier auth/permission tests (they don't send an `Origin` header, so `cors` simply won't add the ACAO header, which none of those tests assert on).

- [ ] **Step 6: Commit**

```bash
git add server.js test/cors.test.js
git commit -m "fix: restrict CORS to the production domain and localhost"
```

---

### Task 6: Rate limit the login endpoint

**Files:**
- Modify: `package.json` (new dependency)
- Modify: `server.js` (login route)
- Create: `test/login-rate-limit.test.js`

**Interfaces:**
- Consumes: `startTestApp()` (Task 1).

- [ ] **Step 1: Install the dependency**

Run: `npm install express-rate-limit@^7`
Expected: `package.json`'s `dependencies` gains `"express-rate-limit": "^7.x.x"` and `package-lock.json` updates (if this project uses one — if not, skip the lockfile).

- [ ] **Step 2: Write the failing test**

Create `test/login-rate-limit.test.js`:

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { startTestApp } = require('./helpers/testApp');

test('login: is rate limited after 10 attempts from the same IP', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);

  const attempt = () => fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nobody@test.latribu.local', password: 'wrong' }),
  });

  const statuses = [];
  for (let i = 0; i < 11; i++) {
    const res = await attempt();
    statuses.push(res.status);
  }

  assert.ok(statuses.slice(0, 10).every((s) => s === 401), `expected first 10 attempts to be 401, got ${statuses}`);
  assert.equal(statuses[10], 429);
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `node --test test/login-rate-limit.test.js`
Expected: FAIL — all 11 attempts currently return 401, none return 429.

- [ ] **Step 4: Add the rate limiter to the login route**

In `server.js`, near the top where other middleware is set up (after the `upload` multer setup, before the auth routes), add:

```js
const rateLimit = require('express-rate-limit');
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en unos minutos.' },
});
```

Then change the login route declaration from:

```js
app.post('/api/auth/login', async (req, res) => {
```

to:

```js
app.post('/api/auth/login', loginLimiter, async (req, res) => {
```

- [ ] **Step 5: Run the test again to verify it passes**

Run: `node --test test/login-rate-limit.test.js`
Expected: PASS.

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: all tests pass. Note: the login tests from Task 2 make far fewer than 10 requests each, so they aren't affected — but if `npm test` re-runs `auth-login.test.js` and `login-rate-limit.test.js` against the same test app process in a way that shares rate-limit state across files, confirm each test file's requests stay under 10 login attempts combined, or that a fresh app instance (fresh rate limiter state) is used per test file (already true here, since every test calls `startTestApp()` itself, which calls `app.listen` on a fresh `require`).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json server.js test/login-rate-limit.test.js
git commit -m "feat: add rate limiting to the login endpoint"
```

---

### Task 7: CI workflow (GitHub Actions)

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `npm test` (all prior tasks), `node --check server.js`.

- [ ] **Step 1: Write the workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Check server.js syntax
        run: node --check server.js

      - name: Write .env.test from secrets
        run: |
          cat <<EOF > .env.test
          SUPABASE_URL=${{ secrets.TEST_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY=${{ secrets.TEST_SUPABASE_SERVICE_ROLE_KEY }}
          JWT_SECRET=${{ secrets.TEST_JWT_SECRET }}
          JWT_EXPIRES_IN=8h
          EOF

      - name: Run tests
        run: npm test
```

(No `.env` file exists in CI, so `setupTestEnv.js`'s production-URL comparison
in Task 1 simply has nothing to compare against and can't false-positive —
its only job here is confirming `.env.test`'s required keys are present.)

- [ ] **Step 2: Manual — add the GitHub Actions secrets**

This step cannot be automated by an agent — it requires a human with admin
access to the GitHub repo:
1. Go to `github.com/Alejandro19/latribu` → Settings → Secrets and variables → Actions.
2. Add three repository secrets: `TEST_SUPABASE_URL`, `TEST_SUPABASE_SERVICE_ROLE_KEY`, `TEST_JWT_SECRET` — using the same test Supabase project created in Task 1, Step 7 (never the production project's values).

- [ ] **Step 3: Verify**

Push this branch (or open a PR) and confirm the "CI" workflow run appears
in the GitHub Actions tab and passes. This does not require merging to
`main` first — the `pull_request` trigger runs it on the PR itself.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: run node --check and npm test on push/PR to main"
```

---

### Task 8: Structured error logging

**Files:**
- Modify: `server.js` (add `logError`, apply it to auth-area call sites plus a scripted sweep of the uniform `console.error(e);` call sites)

**Interfaces:**
- Produces: `function logError(context, error, extra?)` — `context` is either an Express `req` object (logs `req.method req.originalUrl`) or a plain string label; `extra` is an optional short string appended to the label.

- [ ] **Step 1: Add the `logError` helper**

In `server.js`, right after the existing `ok`/`err` response helpers:

```js
function ok(res, data, status = 200) {
  return res.status(status).json({ success: true, ...data });
}
function err(res, message, status = 400) {
  return res.status(status).json({ success: false, error: message });
}
function logError(context, error, extra) {
  const label = context && typeof context === 'object' && context.method
    ? `${context.method} ${context.originalUrl}`
    : String(context || 'unknown');
  const suffix = extra ? ` — ${extra}` : '';
  console.error(`[${new Date().toISOString()}] ${label}${suffix}`, error);
}
```

- [ ] **Step 2: Replace the uniform one-line call sites**

Run this command once, from the project root, to replace every line whose
entire trimmed content is exactly `console.error(e);` (these are all inside
Express route handlers with `req` in scope — verified: 111 occurrences):

```bash
perl -pi -e 's/^(\s*)console\.error\(e\);\s*$/$1logError(req, e);\n/' server.js
```

- [ ] **Step 3: Verify the count and re-check syntax**

Run: `grep -c "logError(req, e);" server.js`
Expected: `111`

Run: `node --check server.js`
Expected: no output (valid syntax).

- [ ] **Step 4: Replace the remaining descriptive call sites individually**

These 8 sites carry a custom message and are not touched by the Step 2
script (they're not a bare `console.error(e);` on their own line). Replace
each with an exact string match:

In `unlockModule` (no `req` in scope — plain string context):
```js
catch (e) { console.error(e); }
```
→
```js
catch (e) { logError('unlockModule', e); }
```

In `sendClientNotification` (no `req` in scope):
```js
  } catch (e) {
    console.error('Error enviando notificación de cliente:', e);
  }
}
```
→
```js
  } catch (e) {
    logError('sendClientNotification', e);
  }
}
```

In the anthropometrics POST handler (`req` in scope):
```js
    console.error('Anthropometric insert error:', e);
```
→
```js
    logError(req, e, 'Anthropometric insert error');
```

In the photos POST handler (`req` in scope):
```js
    console.error('Photo upload error:', e);
```
→
```js
    logError(req, e, 'Photo upload error');
```

In the InBody POST handler's inner recompute block (`req` in scope):
```js
      } catch (e) { console.error('No se pudo recalcular inbody_next_expected_date (no fatal):', e); }
```
→
```js
      } catch (e) { logError(req, e, 'No se pudo recalcular inbody_next_expected_date (no fatal)'); }
```

In the training-completions handler's phrase draw (`req` in scope):
```js
    } catch (e) {
      console.error('phrase draw failed (non-fatal):', e);
    }
```
→
```js
    } catch (e) {
      logError(req, e, 'phrase draw failed (non-fatal)');
    }
```

In the training-completions handler's achievement log (`req` in scope):
```js
      } catch (e) {
        console.error('achievement log insert failed (non-fatal):', e);
      }
```
→
```js
      } catch (e) {
        logError(req, e, 'achievement log insert failed (non-fatal)');
      }
```

In `checkInbodyReminder(client)` (no `req` in scope — standalone function):
```js
  } catch (e) { console.error('checkInbodyReminder falló (no fatal):', e); }
```
→
```js
  } catch (e) { logError('checkInbodyReminder', e, 'no fatal'); }
```

**Deliberately left untouched** (documented, not a placeholder — these two
already carry a richer structured payload than `logError`'s signature
supports, and collapsing them would lose debugging detail for no benefit):
```js
console.error('InBody insert failed', { requestBody: req.body, row, error: errorMessage });
console.error('InBody handler error:', e, { requestBody: req.body });
```
Also left untouched — these are informational retry/fallback notices, not
error logs:
```js
console.warn(`dbInsert: retrying insert into ${table} without unknown columns: ${missingColumns.join(', ')}`);
console.warn('[OCR] pdf-parse falló (' + e.message + '), intentando Vision API...');
```

- [ ] **Step 5: Verify no unintended occurrences remain**

Run: `grep -n "console\.error(e)" server.js`
Expected: no output (every bare `console.error(e)` — both the 111 one-liners and the `unlockModule` inline one — is now `logError(...)`).

Run: `node --check server.js`
Expected: no output (valid syntax).

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: all tests still pass — this task only changes what gets printed to
stderr on errors, not response bodies or status codes, so no existing
assertion should break.

- [ ] **Step 7: Commit**

```bash
git add server.js
git commit -m "refactor: centralize error logging through a structured logError helper"
```

---

## Self-Review Notes

- **Spec coverage:** Task 1-4 → spec §1 (test suite). Task 5 → spec §3 CORS.
  Task 6 → spec §3 rate limiting. Task 3 → spec §3 JWT_SECRET. Task 7 →
  spec §2 CI. Task 8 → spec §4 logging. All spec sections have a task.
- **Scope decision flagged for review:** spec §4 says to replace the
  `console.error`/`console.warn` pattern generally; Task 8 deliberately
  leaves 2 rich-context `console.error` calls and 2 `console.warn` calls
  untouched, with the reasoning inline. This is a real deviation from a
  literal reading of the spec — call it out before executing Task 8.
- **Type/name consistency:** `logError(context, error, extra?)` signature
  is identical across every call site in Task 8, and matches how it's
  introduced in Step 1.
