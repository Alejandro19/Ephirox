# Frases Card RR.SS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an admin-managed bank of rotating phrases (`phrases` table), scoped by context (confirmación / instagram / ambas), and wire it into the existing NFC session-confirmation screen, replacing the static `pickMantra('training')` call there.

**Architecture:** Plain CRUD following the exact pattern already used for `mindset_quotes` in this codebase (Supabase table + Express endpoints under `/api/admin/*` + vanilla-JS admin UI rendered as HTML strings). No new libraries, no new UI framework, no new admin nav entry — the new section lives inside the existing `admin-quotes` view as a second accordion block.

**Tech Stack:** Node/Express (`server.js`), Supabase (`@supabase/supabase-js`, table-level REST access via `dbGet`/`dbInsert`/`dbUpdate`/`dbDelete`), vanilla JS + template strings (`index.html`). No test framework exists in this project (no jest/mocha in `package.json`) — verification steps use standalone `node -e` scripts, the same style already used earlier in this project's NFC-timezone fix.

## Global Constraints

- Do not modify `mindset_quotes`, `pickMantra`, or any of the 5 screens that call `pickMantra` other than the NFC confirmation screen (personal-info, nutrition, rest, community, evolution keep using it as-is).
- The Instagram share card UI/generation is explicitly out of scope — only the `context: 'instagram'` data path and `pickRandomPhrase('instagram')` support need to exist.
- `phrases.text` is stored without quotation marks; quotes are added at render time (same convention as `mindset_quotes.quote`).
- Deactivating a phrase (`active: false`) must never delete it.
- All new admin endpoints require `authMiddleware` + `adminOnly`, matching every existing `/api/admin/*` route.
- DDL (`CREATE TABLE`) cannot be executed from this session — there is no Postgres connection string in `.env`, only the Supabase REST/service-role key. DDL must be run manually in the Supabase SQL Editor, exactly like every prior migration in `tasks/migration-2026-07-17.sql` (see its own header comment).

---

## File Map

| File | Change |
|---|---|
| `schema.sql` | Add `phrases` table definition (source-of-truth schema doc) + add `'phrases'` to the RLS `deny_all` array. |
| `tasks/migration-2026-07-17.sql` | Append `CREATE TABLE phrases`, RLS policy, and seed INSERTs (this file is the running "apply this in Supabase SQL Editor" log — every past feature appended to it, not a new per-date file). |
| `server.js` | Add `pickRandomPhrase(pool, context)` pure function + 5 endpoints (`GET/POST /api/admin/phrases`, `PATCH/DELETE /api/admin/phrases/:id`, `GET /api/admin/phrases/random`) + wire a `phrase` field into the existing `POST /api/clients/:id/training/confirm-session` response. |
| `index.html` | Add phrase-pill CSS; add `phrasesUI` state + render functions for the new accordion section inside `renderAdminQuotes`; replace `pickMantra('training')` in `renderNfcConfirmationScreen` with `result.phrase`; propagate `phrase` through `confirmarSesionEntrenamiento`. |

---

### Task 1: Database — `phrases` table

**Files:**
- Modify: `schema.sql` (add table near `mindset_quotes` at line 24-30, add to RLS array at line 490)
- Modify: `tasks/migration-2026-07-17.sql` (append at end, after line 356)

**Interfaces:**
- Produces: table `phrases(id UUID, text TEXT, context TEXT, active BOOLEAN, created_at, updated_at)` — consumed by Task 2's `dbGet`/`dbInsert`/`dbUpdate`/`dbDelete` calls.

- [ ] **Step 1: Add the table to `schema.sql`**

Insert immediately after the `mindset_quotes` table definition (after line 30, before `CREATE TABLE clients`):

```sql
-- Banco de frases para la pantalla de confirmación de sesión y la tarjeta
-- compartible de Instagram. Independiente de mindset_quotes (esquema y
-- consumidores distintos: aquí el contexto decide dónde puede salir sorteada).
CREATE TABLE phrases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  context TEXT NOT NULL CHECK (context IN ('confirmacion', 'instagram', 'ambas')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

- [ ] **Step 2: Add `phrases` to the RLS `deny_all` array in `schema.sql`**

Change line 490 from:
```sql
    'evolution_checkins','bio_inbody_records','admin_notifications','mindset_quotes','training_completions','client_notifications','sleep_logs','training_protector_uses'
```
to:
```sql
    'evolution_checkins','bio_inbody_records','admin_notifications','mindset_quotes','training_completions','client_notifications','sleep_logs','training_protector_uses','phrases'
```

- [ ] **Step 3: Append the runnable migration to `tasks/migration-2026-07-17.sql`**

Add at the end of the file (after the `training_protector_uses` block, line 356):

```sql
-- Banco de frases "Frases Card RR.SS": rotan en la pantalla de confirmación
-- de sesión y (a futuro) en la tarjeta compartible de Instagram. Independiente
-- de mindset_quotes.
CREATE TABLE IF NOT EXISTS phrases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  context TEXT NOT NULL CHECK (context IN ('confirmacion', 'instagram', 'ambas')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE phrases ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY deny_all ON phrases USING (false);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO phrases (text, context) VALUES
  ('Cada sesión completada te acerca a tu mejor versión.', 'confirmacion'),
  ('Vas mejorando cada día, aunque no siempre se note.', 'confirmacion'),
  ('Hoy sumaste otro paso — eso ya es suficiente.', 'confirmacion'),
  ('Sigo entrenando, aunque no siempre tenga ganas.', 'instagram'),
  ('Cada sesión me acerca a mi mejor versión.', 'instagram'),
  ('No es motivación. Es compromiso conmigo.', 'instagram'),
  ('Elijo mi bienestar, un día a la vez.', 'instagram'),
  ('Esto es constancia, no perfección.', 'ambas');
```

- [ ] **Step 4: Run the migration manually in the Supabase SQL Editor**

Open the Supabase project's SQL Editor and run exactly the block added in Step 3 (the `CREATE TABLE phrases` through the final `INSERT`). This project has no Postgres connection string available to automate this — every prior migration in this file was applied the same manual way.

- [ ] **Step 5: Verify the table and seed data from this machine**

```bash
node -e "
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  const { data, error } = await supabase.from('phrases').select('*').order('created_at', { ascending: true });
  if (error) return console.error('ERROR:', error);
  console.log('rows:', data.length);
  console.log(data.map(p => p.context + ' | ' + p.text));
})();
"
```
Expected: no error, `rows: 8`, with 3 `confirmacion`, 4 `instagram`, 1 `ambas`.

- [ ] **Step 6: Commit**

```bash
git add schema.sql tasks/migration-2026-07-17.sql
git commit -m "$(cat <<'EOF'
Add phrases table for Frases Card RR.SS phrase bank

Independent of mindset_quotes: different schema (context enum) and
different consumers (session-confirmation screen, future IG share card).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Backend — `pickRandomPhrase` + admin CRUD endpoints

**Files:**
- Modify: `server.js` (add near the `mindset_quotes` endpoints — search for `app.get('/api/admin/quotes'` to find that block, around line 920-960; add the new code directly after it)

**Interfaces:**
- Consumes: `dbGet`, `dbGetOne`, `dbInsert`, `dbUpdate`, `dbDelete` (existing helpers, `server.js:92-171`); `ok`, `err` (existing response helpers, `server.js:85-89`).
- Produces: `function pickRandomPhrase(pool, context)` — pure function, `pool` is an array of `{ id, text, context, active }` rows, `context` is `'confirmacion' | 'instagram'`. Returns a row object or `null`. Consumed by Task 3.
- Produces: `GET /api/admin/phrases`, `POST /api/admin/phrases`, `PATCH /api/admin/phrases/:id`, `DELETE /api/admin/phrases/:id`, `GET /api/admin/phrases/random?context=&exclude=` — consumed by Task 5/6 (frontend admin UI).

- [ ] **Step 1: Write the failing test script for `pickRandomPhrase`**

Save to `/private/tmp/claude-501/-Users-alejandrogarcia-Desktop-latribu/18078efb-495c-4e04-b1d2-c62e2ce78d89/scratchpad/test-pick-random-phrase.js`:

```js
const assert = require('assert');
const { pickRandomPhrase } = require('/Users/alejandrogarcia/Desktop/latribu/server.js');

const pool = [
  { id: '1', text: 'A', context: 'confirmacion', active: true },
  { id: '2', text: 'B', context: 'instagram', active: true },
  { id: '3', text: 'C', context: 'ambas', active: true },
  { id: '4', text: 'D', context: 'confirmacion', active: false },
];

// 1. Only eligible contexts are returned, ever, across many draws.
for (let i = 0; i < 200; i++) {
  const p = pickRandomPhrase(pool, 'confirmacion');
  assert(p, 'expected a phrase');
  assert(['confirmacion', 'ambas'].includes(p.context), `got wrong context: ${p.context}`);
  assert(p.id !== '4', 'must never return an inactive phrase');
}

// 2. Empty pool for a context returns null, not a crash.
assert.strictEqual(pickRandomPhrase([], 'confirmacion'), null);
assert.strictEqual(pickRandomPhrase([{ id: '9', text: 'X', context: 'instagram', active: true }], 'confirmacion'), null);

console.log('pickRandomPhrase: all assertions passed');
```

- [ ] **Step 2: Run it to verify it fails**

```bash
node /private/tmp/claude-501/-Users-alejandrogarcia-Desktop-latribu/18078efb-495c-4e04-b1d2-c62e2ce78d89/scratchpad/test-pick-random-phrase.js
```
Expected: throws because `server.js` does not export `pickRandomPhrase` (in fact `server.js` doesn't `module.exports` anything yet — expect a `TypeError: pickRandomPhrase is not a function` or similar).

- [ ] **Step 3: Add `pickRandomPhrase` and the 5 endpoints to `server.js`**

Add directly after the existing `app.delete('/api/admin/quotes/:qid', ...)` block (search for that route to find the exact insertion point):

```js
function pickRandomPhrase(pool, context) {
  const eligible = pool.filter(p => p.active && (p.context === context || p.context === 'ambas'));
  if (eligible.length === 0) return null;
  return eligible[Math.floor(Math.random() * eligible.length)];
}

app.get('/api/admin/phrases', authMiddleware, adminOnly, async (req, res) => {
  try {
    const phrases = await dbGet('phrases', {}, { order: { column: 'created_at', ascending: false } });
    return ok(res, { phrases });
  } catch (e) {
    console.error(e);
    return err(res, 'Error al obtener las frases.', 500);
  }
});

app.post('/api/admin/phrases', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { text, context } = req.body;
    if (!text || !text.trim()) return err(res, 'Escribe el texto de la frase.', 400);
    if (!['confirmacion', 'instagram', 'ambas'].includes(context)) return err(res, 'Contexto inválido.', 400);
    const created = await dbInsert('phrases', { text: text.trim(), context });
    return ok(res, { phrase: created }, 201);
  } catch (e) {
    console.error(e);
    return err(res, 'Error al crear la frase.', 500);
  }
});

app.patch('/api/admin/phrases/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const patch = {};
    if (req.body.text !== undefined) patch.text = req.body.text.trim();
    if (req.body.context !== undefined) patch.context = req.body.context;
    if (req.body.active !== undefined) patch.active = !!req.body.active;
    patch.updated_at = new Date().toISOString();
    const updated = await dbUpdate('phrases', req.params.id, patch);
    return ok(res, { phrase: updated });
  } catch (e) {
    console.error(e);
    return err(res, 'Error al actualizar la frase.', 500);
  }
});

app.delete('/api/admin/phrases/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await dbDelete('phrases', req.params.id);
    return ok(res, {});
  } catch (e) {
    console.error(e);
    return err(res, 'Error al eliminar la frase.', 500);
  }
});

app.get('/api/admin/phrases/random', authMiddleware, adminOnly, async (req, res) => {
  try {
    const context = req.query.context;
    if (!['confirmacion', 'instagram'].includes(context)) return err(res, 'Contexto inválido.', 400);
    const pool = await dbGet('phrases', { active: true });
    const eligible = pool.filter(p => p.context === context || p.context === 'ambas');
    const excludeId = req.query.exclude;
    const candidates = (excludeId && eligible.length > 1) ? eligible.filter(p => p.id !== excludeId) : eligible;
    const picked = candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : null;
    return ok(res, { phrase: picked });
  } catch (e) {
    console.error(e);
    return err(res, 'Error al sortear la frase.', 500);
  }
});
```

- [ ] **Step 4: Export `pickRandomPhrase` for the test script**

`server.js` already ends with `module.exports = app;` (line ~last — this is what Vercel's serverless entrypoint requires; do NOT replace or remove it). Add `pickRandomPhrase` as a property on that same export instead, immediately after that line:

```js
module.exports = app;
module.exports.pickRandomPhrase = pickRandomPhrase;
```

- [ ] **Step 5: Run the test script again to verify it passes**

```bash
node /private/tmp/claude-501/-Users-alejandrogarcia-Desktop-latribu/18078efb-495c-4e04-b1d2-c62e2ce78d89/scratchpad/test-pick-random-phrase.js
```
Expected: `pickRandomPhrase: all assertions passed`, exit code 0.

- [ ] **Step 6: Syntax-check the whole server**

```bash
node --check server.js
```
Expected: no output (success).

- [ ] **Step 7: Commit**

```bash
git add server.js
git commit -m "$(cat <<'EOF'
Add pickRandomPhrase and admin CRUD endpoints for phrases

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Backend — surface the drawn phrase in `confirm-session`

**Files:**
- Modify: `server.js:1158-1183` (the `POST /api/clients/:id/training/confirm-session` handler)

**Interfaces:**
- Consumes: `pickRandomPhrase(pool, context)` from Task 2.
- Produces: response shape becomes `{ streak, alreadyConfirmedToday, phrase }` where `phrase` is a string or `null`. Consumed by Task 7 (frontend).

- [ ] **Step 1: Add the phrase draw to the response**

In the `confirm-session` handler, right before the final `return ok(res, { streak, alreadyConfirmedToday });` (server.js:1178), add:

```js
    const phrasePool = await dbGet('phrases', { active: true });
    const drawnPhrase = pickRandomPhrase(phrasePool, 'confirmacion');
    const streak = await computeTrainingStreakState(req.params.id, trainingDays, tz);
    return ok(res, { streak, alreadyConfirmedToday, phrase: drawnPhrase ? drawnPhrase.text : null });
```

(This replaces the existing two lines `const streak = ...` and `return ok(res, { streak, alreadyConfirmedToday });` — keep everything else in the handler unchanged.)

- [ ] **Step 2: Syntax-check**

```bash
node --check server.js
```
Expected: no output.

- [ ] **Step 3: Verify against the live phrase bank**

```bash
node -e "
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { pickRandomPhrase } = require('./server.js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  const { data: pool, error } = await supabase.from('phrases').select('*').eq('active', true);
  if (error) return console.error(error);
  const drawn = pickRandomPhrase(pool, 'confirmacion');
  console.log('drawn phrase for confirmacion:', drawn && drawn.text);
})();
"
```
Expected: prints one of the 3 `confirmacion` phrases or the `ambas` one — never one of the `instagram`-only phrases.

- [ ] **Step 4: Commit**

```bash
git add server.js
git commit -m "$(cat <<'EOF'
Surface a drawn phrase in the confirm-session response

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Frontend — CSS for phrase pills

**Files:**
- Modify: `index.html` (add new CSS rules right after the existing `.pill` rule, line 285)

**Interfaces:**
- Produces: CSS classes `.phrase-pill`, `.phrase-pill-confirmacion`, `.phrase-pill-instagram`, `.phrase-pill-ambas` — consumed by Task 5/6.

- [ ] **Step 1: Add the CSS**

Insert after line 285 (`.pill{...}`):

```css
.phrase-pill{display:inline-flex;align-items:center;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:600;}
.phrase-pill-confirmacion{background:#EFF5E8;color:#5B7A4E;}
.phrase-pill-instagram{background:#F1EAF7;color:#8A5FA0;}
.phrase-pill-ambas{background:#FBF1E7;color:#B8794A;}
```

- [ ] **Step 2: Verify no duplicate class names exist**

```bash
grep -n "phrase-pill" index.html
```
Expected: exactly the 4 lines just added (no pre-existing matches).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
Add phrase-pill CSS classes for Frases Card RR.SS

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Frontend — admin CRUD section (list, filters, add/edit)

**Files:**
- Modify: `index.html` (add state + render functions near `quotesUI`/`renderQuotesLibraryCard`, line ~5291-5403; modify `renderAdminQuotes` itself to include the new accordion item)

**Interfaces:**
- Consumes: `api()` helper (`index.html:481`), CSS classes from Task 4, endpoints from Task 2.
- Produces: `phrasesUI` state object; `renderPhrasesAccordion(phrases)`; `createPhrase()`, `updatePhrase(id)`, `deletePhrase(id)`, `togglePhraseActive(id, phrase)`, `toggleEditPhrase(id)`, `setPhrasesFilter(ctx)`, `refetchAdminPhrases()` — consumed by Task 6 (preview cards live in the same accordion section and reuse `window._adminPhrases`).

- [ ] **Step 1: Add `phrasesUI` state and helper below `quotesUI`**

After line 5291 (`let quotesUI = { editingId: null, libraryOpen: false };`), add:

```js
let phrasesUI = { open: false, filter: 'all', editingId: null };
function filteredPhrases(phrases) {
  if (phrasesUI.filter === 'all') return phrases;
  return phrases.filter(p => p.context === phrasesUI.filter);
}
function phraseContextLabel(ctx) {
  return { confirmacion: 'Confirmación', instagram: 'Instagram', ambas: 'Ambas' }[ctx] || ctx;
}
```

- [ ] **Step 2: Add the phrase edit-row renderer**

```js
function renderPhraseEditForm(p) {
  return `
    <div class="list-row" style="display:block;">
      <div class="field"><label>Frase</label><textarea id="ph-edit-text-${p.id}" rows="2">${p.text}</textarea></div>
      <div class="field" style="max-width:220px;">
        <label>Contexto</label>
        <select id="ph-edit-context-${p.id}">
          <option value="confirmacion" ${p.context === 'confirmacion' ? 'selected' : ''}>Confirmación</option>
          <option value="instagram" ${p.context === 'instagram' ? 'selected' : ''}>Instagram</option>
          <option value="ambas" ${p.context === 'ambas' ? 'selected' : ''}>Ambas</option>
        </select>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-primary" style="width:auto" onclick="updatePhrase('${p.id}')">Guardar</button>
        <button class="btn btn-ghost" style="width:auto" onclick="toggleEditPhrase(null)">Cancelar</button>
      </div>
    </div>
  `;
}
```

- [ ] **Step 3: Add the main accordion-section renderer**

```js
function renderPhrasesAccordion(phrases) {
  const list = filteredPhrases(phrases);
  const filters = [
    ['all', 'Todas'], ['confirmacion', 'Confirmación'], ['instagram', 'Instagram'], ['ambas', 'Ambas'],
  ];
  return `
    <div class="accordion-item" id="phrases-accordion-card">
      <button class="accordion-header" type="button" onclick="togglePhrasesAccordion()">
        Frases Card RR.SS <span style="color:var(--ink-soft);font-weight:400;">— ${phrases.length}</span>
        <span class="accordion-toggle">Ver</span>
      </button>
      <div class="accordion-content ${phrasesUI.open ? 'active' : ''}">
        <p style="color:var(--ink-soft);margin-top:0;">Estas frases rotan aleatoriamente en la pantalla de confirmación de sesión y en la tarjeta compartible de Instagram.</p>
        <div class="pillrow" style="margin-bottom:12px;">
          ${filters.map(([key, label]) => `
            <button class="pill" style="cursor:pointer;${phrasesUI.filter === key ? 'background:var(--ink);color:var(--paper);border-color:var(--ink);' : ''}" onclick="setPhrasesFilter('${key}')">${label}</button>
          `).join('')}
        </div>
        <div class="field"><label>Nueva frase</label><textarea id="ph-new-text" rows="2" placeholder="Ej: Cada sesión completada te acerca a tu mejor versión."></textarea></div>
        <div class="field" style="max-width:220px;">
          <label>Contexto</label>
          <select id="ph-new-context">
            <option value="confirmacion">Confirmación</option>
            <option value="instagram">Instagram</option>
            <option value="ambas">Ambas</option>
          </select>
        </div>
        <button class="btn btn-primary" style="width:auto;margin-bottom:16px;" onclick="createPhrase()">+ Agregar frase</button>
        ${list.length ? list.map(p => phrasesUI.editingId === p.id ? renderPhraseEditForm(p) : `
          <div class="list-row" style="${p.active ? '' : 'opacity:.5;'}">
            <div>
              <p class="serif" style="margin:0;font-style:italic;">"${p.text}"</p>
              <span class="phrase-pill phrase-pill-${p.context}" style="margin-top:6px;">${phraseContextLabel(p.context)}</span>
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
              <button class="small-btn" onclick="togglePhraseActive('${p.id}', ${p.active})">${p.active ? '● Activa' : '○ Inactiva'}</button>
              <button class="small-btn" onclick="toggleEditPhrase('${p.id}')">Editar</button>
              <button class="small-btn" onclick="deletePhrase('${p.id}')">Eliminar</button>
            </div>
          </div>
        `).join('') : '<div class="empty-state">No hay frases para este filtro.</div>'}
      </div>
    </div>
  `;
}
```

- [ ] **Step 4: Add the action functions**

```js
function togglePhrasesAccordion() {
  phrasesUI.open = !phrasesUI.open;
  const container = document.getElementById('phrases-accordion-card');
  if (container) container.outerHTML = renderPhrasesAccordion(window._adminPhrases || []);
}
function setPhrasesFilter(ctx) {
  phrasesUI.filter = ctx;
  const container = document.getElementById('phrases-accordion-card');
  if (container) container.outerHTML = renderPhrasesAccordion(window._adminPhrases || []);
}
function toggleEditPhrase(id) {
  phrasesUI.editingId = id;
  const container = document.getElementById('phrases-accordion-card');
  if (container) container.outerHTML = renderPhrasesAccordion(window._adminPhrases || []);
}
async function refetchAdminPhrases() {
  const { phrases } = await api('/api/admin/phrases');
  window._adminPhrases = phrases;
  const container = document.getElementById('phrases-accordion-card');
  if (container) container.outerHTML = renderPhrasesAccordion(phrases);
}
async function createPhrase() {
  const text = document.getElementById('ph-new-text').value.trim();
  const context = document.getElementById('ph-new-context').value;
  if (!text) return alert('Escribe el texto de la frase.');
  try {
    await api('/api/admin/phrases', { method: 'POST', body: JSON.stringify({ text, context }) });
    phrasesUI.open = true;
    await refetchAdminPhrases();
  } catch (e) { alert('Error: ' + e.message); }
}
async function updatePhrase(id) {
  const text = document.getElementById(`ph-edit-text-${id}`).value.trim();
  const context = document.getElementById(`ph-edit-context-${id}`).value;
  if (!text) return alert('Escribe el texto de la frase.');
  try {
    await api(`/api/admin/phrases/${id}`, { method: 'PATCH', body: JSON.stringify({ text, context }) });
    phrasesUI.editingId = null;
    await refetchAdminPhrases();
  } catch (e) { alert('Error: ' + e.message); }
}
async function togglePhraseActive(id, currentlyActive) {
  try {
    await api(`/api/admin/phrases/${id}`, { method: 'PATCH', body: JSON.stringify({ active: !currentlyActive }) });
    await refetchAdminPhrases();
  } catch (e) { alert('Error: ' + e.message); }
}
async function deletePhrase(id) {
  if (!confirm('¿Eliminar esta frase?')) return;
  try {
    await api(`/api/admin/phrases/${id}`, { method: 'DELETE' });
    await refetchAdminPhrases();
  } catch (e) { alert('Error: ' + e.message); }
}
```

- [ ] **Step 5: Wire the new section into `renderAdminQuotes`**

Modify `renderAdminQuotes` (index.html:5328-5353) to fetch phrases alongside quotes and render the new accordion item after `renderQuotesLibraryCard(quotes)`:

```js
async function renderAdminQuotes(el) {
  try {
    const [{ quotes }, { phrases }] = await Promise.all([
      api('/api/admin/quotes'),
      api('/api/admin/phrases'),
    ]);
    state.quotes = quotes;
    window._adminQuotes = quotes;
    window._adminPhrases = phrases;
    el.innerHTML = `
      <div class="page-header"><h2>Frases de mentalidad</h2><p>Aparecen en el menú principal del módulo Entrenamiento, precedidas de "Hola [nombre], repite después de mí:". Escríbelas como afirmaciones en primera persona.</p></div>
      <div class="card">
        <div class="accordion">
          <div class="accordion-item">
            <button class="accordion-header" type="button" onclick="toggleAccordion(this)">
              Nueva frase
              <span class="accordion-toggle">Ver</span>
            </button>
            <div class="accordion-content">
              <div class="field"><label>Frase</label><textarea id="qt-new-quote" rows="2" placeholder="Ej: Estoy trabajando en mi cuerpo con amor y disciplina"></textarea></div>
              <div class="field" style="max-width:280px;"><label>Autor (opcional)</label><input id="qt-new-author"></div>
              <button class="btn btn-primary" style="width:auto" onclick="createQuote()">Agregar</button>
            </div>
          </div>
          ${renderQuotesLibraryCard(quotes)}
        </div>
      </div>
      <div class="card">
        <div class="accordion">
          ${renderPhrasesAccordion(phrases)}
        </div>
      </div>
    `;
  } catch (e) { el.innerHTML = `<div class="error-msg">${e.message}</div>`; }
}
```

- [ ] **Step 6: Manual verification (no browser test harness in this project)**

Start the dev server and confirm in a real browser: `npm run dev`, log in as admin, open "Frases" in the Administración nav, and check:
- The "Frases Card RR.SS" accordion appears below the existing mindset-quotes accordion.
- The 8 seeded phrases show up, correctly tagged and colored by context.
- Filters narrow the list; adding, editing, deactivating (toggle stays in the list, dimmed), and deleting all work and persist after a page refresh.

- [ ] **Step 7: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
Add Frases Card RR.SS admin CRUD section

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Frontend — live preview mini-cards ("Probar otra")

**Files:**
- Modify: `index.html` (extend `renderPhrasesAccordion` from Task 5; add preview state + action function)

**Interfaces:**
- Consumes: `GET /api/admin/phrases/random` (Task 2), `window._adminPhrases` (Task 5).
- Produces: `previewUI` state; `drawPreview(context)`; nothing else consumes this (leaf feature).

- [ ] **Step 1: Add preview state below `phrasesUI`**

```js
let previewUI = { confirmacion: null, instagram: null };
```

- [ ] **Step 2: Append the preview markup inside `renderPhrasesAccordion`**

In the template from Task 5 Step 3, right before the closing `</div>` of `.accordion-content` (i.e. right after the phrase-list `${list.length ? ... }` block), add:

```js
        <div class="card" style="margin-top:20px;">
          <div class="grid-2">
            <div>
              <div class="page-header" style="padding:0;"><h3 style="margin:0;">Pantalla de confirmación</h3></div>
              <p class="serif" style="font-style:italic;">${previewUI.confirmacion ? `"${previewUI.confirmacion.text}"` : 'No hay frases activas para este contexto.'}</p>
              <button class="small-btn" onclick="drawPreview('confirmacion')">🔀 Probar otra</button>
            </div>
            <div>
              <div class="page-header" style="padding:0;"><h3 style="margin:0;">Tarjeta de Instagram</h3></div>
              <p class="serif" style="font-style:italic;">${previewUI.instagram ? `"${previewUI.instagram.text}"` : 'No hay frases activas para este contexto.'}</p>
              <button class="small-btn" onclick="drawPreview('instagram')">🔀 Probar otra</button>
            </div>
          </div>
        </div>
```

(`.grid-2` already exists at `index.html:128` — `display:grid;grid-template-columns:1fr 1fr;gap:16px;` — no new CSS needed for this layout.)

- [ ] **Step 3: Add `drawPreview` and seed the initial draw on load**

```js
async function drawPreview(context) {
  const current = previewUI[context];
  const qs = new URLSearchParams({ context });
  if (current) qs.set('exclude', current.id);
  try {
    const { phrase } = await api(`/api/admin/phrases/random?${qs.toString()}`);
    previewUI[context] = phrase;
    const container = document.getElementById('phrases-accordion-card');
    if (container) container.outerHTML = renderPhrasesAccordion(window._adminPhrases || []);
  } catch (e) { alert('Error: ' + e.message); }
}
```

Then, in `togglePhrasesAccordion` (Task 5 Step 4), draw an initial preview the first time the section opens:

```js
function togglePhrasesAccordion() {
  phrasesUI.open = !phrasesUI.open;
  if (phrasesUI.open && !previewUI.confirmacion && !previewUI.instagram) {
    drawPreview('confirmacion');
    drawPreview('instagram');
    return; // drawPreview re-renders the container itself once each call resolves
  }
  const container = document.getElementById('phrases-accordion-card');
  if (container) container.outerHTML = renderPhrasesAccordion(window._adminPhrases || []);
}
```

- [ ] **Step 4: Manual verification**

In the browser: open the "Frases Card RR.SS" accordion, confirm both preview cards show a phrase (or the empty-bank message if you deactivate every phrase for a context), click "🔀 Probar otra" a few times per card, and confirm it doesn't repeat the same phrase twice in a row when more than one option exists for that context. Then narrow one context down to exactly one active/eligible phrase (deactivate the rest) and click "🔀 Probar otra" again — per the endpoint logic in Task 2 Step 3 (`candidates = (excludeId && eligible.length > 1) ? ... : eligible`), it must still return that same phrase rather than showing the empty-bank message, since excluding it would leave zero options.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
Add live preview cards to Frases Card RR.SS admin section

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Frontend — wire the drawn phrase into the NFC confirmation screen

**Files:**
- Modify: `index.html:2841-2850` (`confirmarSesionEntrenamiento`)
- Modify: `index.html:2904-2934` (`renderNfcConfirmationScreen`)

**Interfaces:**
- Consumes: `phrase` field from the `confirm-session` response (Task 3).
- Produces: `confirmarSesionEntrenamiento` return value gains a `phrase` key — `window._nfcConfirmResult` (set at `index.html:2895`) now carries it through unchanged, since it's just the object `confirmarSesionEntrenamiento` returns.

- [ ] **Step 1: Propagate `phrase` through `confirmarSesionEntrenamiento`**

Change (index.html:2841-2850):

```js
async function confirmarSesionEntrenamiento(source) {
  const clientId = currentClientId();
  const { streak, alreadyConfirmedToday } = await api(`/api/clients/${clientId}/training/confirm-session`, { method: 'POST', body: JSON.stringify({ source, tz: clientTz() }) });
  const prevStreak = window._trainingStreak;
  const weekJustCompleted = !alreadyConfirmedToday && prevStreak
    && streak.sessionsDoneThisWeek >= streak.sessionsRequiredThisWeek
    && prevStreak.sessionsDoneThisWeek < prevStreak.sessionsRequiredThisWeek;
  window._trainingStreak = streak;
  return { streak, alreadyConfirmedToday, weekJustCompleted };
}
```

to:

```js
async function confirmarSesionEntrenamiento(source) {
  const clientId = currentClientId();
  const { streak, alreadyConfirmedToday, phrase } = await api(`/api/clients/${clientId}/training/confirm-session`, { method: 'POST', body: JSON.stringify({ source, tz: clientTz() }) });
  const prevStreak = window._trainingStreak;
  const weekJustCompleted = !alreadyConfirmedToday && prevStreak
    && streak.sessionsDoneThisWeek >= streak.sessionsRequiredThisWeek
    && prevStreak.sessionsDoneThisWeek < prevStreak.sessionsRequiredThisWeek;
  window._trainingStreak = streak;
  return { streak, alreadyConfirmedToday, weekJustCompleted, phrase };
}
```

(The only real change is destructuring `phrase` out of the `api()` response instead of referencing an undefined variable.)

- [ ] **Step 2: Replace `pickMantra('training')` in `renderNfcConfirmationScreen`**

Change (index.html:2904-2934), the line:

```js
      <p class="mantra">"${pickMantra('training')}"</p>
```

to:

```js
      ${result.phrase ? `<p class="mantra">"${result.phrase}"</p>` : ''}
```

Update the function signature line to destructure `phrase` too:

```js
function renderNfcConfirmationScreen(el, result) {
  if (!result) { el.innerHTML = ''; return; }
  const { streak, alreadyConfirmedToday, phrase } = result;
```

and use `phrase` instead of `result.phrase` in the template for consistency:

```js
      ${phrase ? `<p class="mantra">"${phrase}"</p>` : ''}
```

- [ ] **Step 3: Syntax sanity-check the script block**

```bash
node -e "
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const inline = scripts.filter(s => !s.includes('src='));
for (const s of inline) { new Function(s); }
console.log('inline scripts parse OK:', inline.length);
"
```
Expected: `inline scripts parse OK: <N>` with no thrown `SyntaxError`. (This only checks parse-ability, not runtime correctness — it will not catch a call to an undefined function.)

- [ ] **Step 4: Manual verification**

With the dev server running, tap/simulate the NFC deep link (`?m=entrenamiento&a=confirmar`) for a test client that has at least one active `confirmacion` (or `ambas`) phrase, and confirm the confirmation screen shows that phrase instead of a `pickMantra('training')` mantra. Then deactivate every `confirmacion`/`ambas` phrase and confirm the screen still renders correctly with that line simply absent.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
Show a drawn Frases Card RR.SS phrase on the NFC confirmation screen

Replaces the static pickMantra('training') call there; pickMantra is
untouched everywhere else it's used.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
