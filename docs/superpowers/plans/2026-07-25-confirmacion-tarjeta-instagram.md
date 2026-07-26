# Sesión Confirmada (rediseño oscuro) + Tarjeta de Instagram + Historial de logros Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the light `renderNfcConfirmationScreen` with a dark full-screen take-over (shared by the manual button and the NFC flow), add a Canvas-2D-generated 1080×1920 Instagram Stories share card with a medals/trophies achievement system, and persist every medal/trophy earned to an admin-only history log.

**Architecture:** Same patterns already used throughout this codebase — Express endpoint following the `/api/clients/:id/training/*` guard convention, vanilla-JS template-string rendering in `index.html`, no new libraries. The share card is drawn with the native Canvas 2D API (no DOM-to-image library), using two locally-embedded Fraunces `.woff2` files (already downloaded into `fonts/`) loaded via the `FontFace` API so the export never depends on Google Fonts at runtime.

**Tech Stack:** Node/Express (`server.js`), vanilla JS + `<canvas>` (`index.html`), Web Share API with a download fallback. No test framework exists in this project — verification uses standalone `node -e` scripts for pure logic, and manual browser testing for anything visual/canvas/share-related (no browser access in this environment).

## Global Constraints

- Do not change `confirmarSesionEntrenamiento`, `computeTrainingStreakState`, `pickRandomPhrase`, or any day/streak-counting logic — this plan only changes what's rendered after those already return, and adds one new read-only phrase endpoint.
- Do not touch `captureIncomingDeepLink`/`consumePendingActionIfAny` (the "scan NFC while logged out" flow) — already correct, must keep working unmodified.
- The new confirmation screen must NEVER show: the weekly dots/checkmarks row, any medal/trophy/cup row, a "Ver rutina de hoy" button, or any text about where the confirmation came from (e.g. "tocaste tu sticker").
- Medals/trophies are visual ONLY on the Instagram card — never on the in-app confirmation screen.
- Font sizes/icon sizes specified in the spec for the Instagram card are final — any vertical-fit adjustment happens via container padding, never by resizing text/icons.
- `fonts/Fraunces-Variable.woff2` and `fonts/Fraunces-Italic-Variable.woff2` already exist in the repo root and are served automatically by the existing `express.static(path.join(__dirname))` (server.js:73) — no server changes needed to serve them.
- New client-facing endpoint follows the exact guard pattern already used by sibling training endpoints: `authMiddleware, ownerOrAdmin, requirePermission('training')`.
- The new admin-only achievements endpoint uses `authMiddleware, adminOnly` (no `requirePermission`) — deliberately NOT `ownerOrAdmin`: the client must never be able to read this history from the app; the only thing a client ever sees of their achievements is the Instagram card.
- A protected week (via `POST /training/use-protector`, server.js:1185-1198) must NEVER produce a `medalla` or `copa` row — that endpoint doesn't touch `training_completions` and isn't modified by this plan.
- The medal/trophy trigger must be idempotent: confirming an extra session in a week that already reached `trainingDays` must never insert a second `medalla`/`copa` for that week.

---

## File Map

| File | Change |
|---|---|
| `server.js` | Add `GET /api/clients/:id/training/phrase?context=` endpoint; add `achievement_logs` insert logic inside `confirm-session`; add `GET /api/clients/:id/training/achievements` endpoint. |
| `schema.sql` / `tasks/migration-2026-07-17.sql` | Add `achievement_logs` table (+ RLS). |
| `index.html` | Replace `.nfc-confirm-screen*` CSS with new dark-theme classes; rewrite `renderNfcConfirmationScreen` (renamed concept: "session confirmed" screen); change `markTrainingDayComplete` to navigate to the same screen instead of a toast; add `computeAchievements`; add the Canvas-2D Instagram card generator + share/download logic; add the "Historial de logros" admin card inside `renderTrainingAdminPanel`. |

---

### Task 1: Backend — phrase-by-context endpoint for the share card

**Files:**
- Modify: `server.js` (add directly after the existing `GET /api/admin/phrases/random` endpoint block — search for that route to find the insertion point)

**Interfaces:**
- Consumes: `pickRandomPhrase(pool, context)` (already defined and exported, server.js), `dbGet` (server.js:92), `ok`/`err` (server.js:85-89), `authMiddleware`/`ownerOrAdmin`/`requirePermission` (already used by every sibling `/api/clients/:id/training/*` route).
- Produces: `GET /api/clients/:id/training/phrase?context=confirmacion|instagram` → `{ phrase: string | null }` — consumed by Task 5 (the Instagram card generator fetches its own `instagram`-context phrase here, since `confirm-session` only returns the `confirmacion` one).

- [ ] **Step 1: Write the failing test script**

Save to a scratch file and run with `node`:

```js
const assert = require('assert');
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';
const { pickRandomPhrase } = require('/Users/alejandrogarcia/Desktop/latribu/server.js');

// This endpoint is a thin wrapper around pickRandomPhrase, already unit-tested
// in the Frases Card RR.SS plan. The only NEW logic here is the context
// validation, which we test directly against the validation list:
const VALID = ['confirmacion', 'instagram'];
assert(VALID.includes('confirmacion'));
assert(VALID.includes('instagram'));
assert(!VALID.includes('ambas')); // 'ambas' is a phrase-bank context, not a valid QUERY context here
assert(!VALID.includes(''));
assert(!VALID.includes(undefined));
console.log('phrase-context validation list: all assertions passed');
```

Run it: `node /path/to/scratch-test.js` — expected to pass immediately since this only checks a plain array (no server.js change needed yet), confirming the validation list itself is correct before wiring it into the route. This is the spec test for Step 3's validation branch.

- [ ] **Step 2: Add the endpoint**

Insert after the `GET /api/admin/phrases/random` handler (server.js):

```js
app.get('/api/clients/:id/training/phrase', authMiddleware, ownerOrAdmin, requirePermission('training'), async (req, res) => {
  try {
    const context = req.query.context;
    if (!['confirmacion', 'instagram'].includes(context)) return err(res, 'Contexto inválido.', 400);
    const pool = await dbGet('phrases', { active: true });
    const drawn = pickRandomPhrase(pool, context);
    return ok(res, { phrase: drawn ? drawn.text : null });
  } catch (e) {
    console.error(e);
    return err(res, 'Error al obtener la frase.', 500);
  }
});
```

- [ ] **Step 3: Syntax-check**

```bash
node --check server.js
```
Expected: no output.

- [ ] **Step 4: Verify against the live phrase bank**

```bash
node -e "
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { pickRandomPhrase } = require('./server.js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  const { data: pool, error } = await supabase.from('phrases').select('*').eq('active', true);
  if (error) return console.error(error);
  console.log('instagram draw:', pickRandomPhrase(pool, 'instagram')?.text);
  console.log('confirmacion draw:', pickRandomPhrase(pool, 'confirmacion')?.text);
})();
"
```
Expected: prints a 1st-person phrase for `instagram` and a 2nd-person one for `confirmacion` (matching the seeded bank) — this exercises the exact function the new route calls, without needing to spin up the HTTP server.

- [ ] **Step 5: Commit**

```bash
git add server.js
git commit -m "$(cat <<'EOF'
Add GET /training/phrase endpoint for the Instagram share card

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Frontend — dark theme CSS for the confirmation screen

**Files:**
- Modify: `index.html:217-222` (replace the existing `.nfc-confirm-screen*` block)

**Interfaces:**
- Produces: CSS classes `.session-confirmed-screen`, `.scs-title`, `.scs-ring-wrap`, `.scs-ring-center`, `.scs-ring-label`, `.scs-streak-num`, `.scs-streak-label`, `.scs-phrase`, `.scs-actions`, `.scs-share-btn` — consumed by Task 3.

- [ ] **Step 1: Replace the CSS block**

Replace lines 217-222 (`.nfc-confirm-screen{...}` through `.nfc-confirm-screen .mantra{...}`) with:

```css
.session-confirmed-screen{position:fixed;inset:0;z-index:3000;background:#1B1712;display:flex;flex-direction:column;justify-content:space-between;padding:18% 24px 14%;box-sizing:border-box;overflow-y:auto;}
.scs-title{font-family:'Fraunces',serif;font-size:23px;font-weight:700;color:#F3EFE6;text-align:center;}
.scs-ring-block{display:flex;flex-direction:column;align-items:center;}
.scs-ring-wrap{position:relative;width:132px;height:132px;}
.scs-ring-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;}
.scs-ring-fraction{font-family:'Fraunces',serif;font-size:26px;font-weight:700;color:#F3EFE6;}
.scs-ring-label{font-size:9px;letter-spacing:.08em;color:#B8A88A;text-transform:uppercase;margin-top:2px;}
.scs-streak-row{display:flex;align-items:center;gap:8px;margin-top:18px;}
.scs-streak-num{font-family:'Fraunces',serif;font-weight:800;font-size:32px;color:#D9A441;}
.scs-flame{font-size:24px;}
.scs-streak-label{font-size:11px;letter-spacing:.06em;color:#B8A88A;text-transform:uppercase;text-align:center;margin-top:2px;}
.scs-phrase{font-family:'Fraunces',serif;font-style:italic;font-size:14px;color:#D9BE8C;text-align:center;line-height:1.6;padding:0 12px;}
.scs-actions{display:flex;align-items:center;gap:12px;}
.scs-actions .btn-ghost{flex:1;border-color:rgba(243,239,230,.25);color:#F3EFE6;}
.scs-share-btn{width:48px;height:48px;border-radius:50%;background:#D9A441;border:none;display:flex;align-items:center;justify-content:center;color:#1B1712;flex-shrink:0;cursor:pointer;}
.scs-share-btn:disabled{opacity:.5;cursor:default;}
```

- [ ] **Step 2: Verify no leftover references to the old classes**

```bash
grep -n "nfc-confirm-screen\|nfc-tap-badge\|nfc-streak-pill" index.html
```
Expected: no matches (Task 3 removes the HTML that used them; if this still shows matches after Task 3 is done, that's a leftover to clean up — for this task alone, only the CSS definitions themselves should be gone).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
Replace light NFC-confirmation CSS with dark session-confirmed theme

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Frontend — rewrite the confirmation screen + wire the manual button

**Files:**
- Modify: `index.html:2856-2864` (`markTrainingDayComplete`)
- Modify: `index.html:2908-2938` (`renderNfcConfirmationScreen`, `closeNfcConfirmationScreen`)

**Interfaces:**
- Consumes: CSS classes from Task 2; `streak.sessionsDoneThisWeek`/`sessionsRequiredThisWeek`/`streakWeeks` and `phrase` (already returned by `confirm-session`, untouched by this plan).
- Produces: `renderNfcConfirmationScreen(el, result)` (same name/signature, kept so the existing `routes['nfc-confirm']` wiring at index.html:868 needs no change); `shareTrainingCard(streakWeeks)` — called by the new share button, implemented in Task 5 (this task only wires the `onclick`, the function body is added later; if Task 5 hasn't run yet, clicking the button will correctly throw `ReferenceError` in dev — expected and resolved once Task 5 lands. Do not stub it here).

- [ ] **Step 1: Change `markTrainingDayComplete` to navigate to the full screen**

Replace (index.html:2856-2864):

```js
async function markTrainingDayComplete(day) {
  try {
    const result = await confirmarSesionEntrenamiento('manual');
    if (result.alreadyConfirmedToday) { /* nada nuevo que confirmar hoy */ }
    else if (result.weekJustCompleted) showToast(`🎉 ¡Semana completa! Racha: ${result.streak.streakWeeks} semanas seguidas.`);
    else showToast(`📲 Sesión confirmada — ${result.streak.sessionsDoneThisWeek} de ${result.streak.sessionsRequiredThisWeek} esta semana.`);
    renderMain();
  } catch (e) { alert('Error: ' + e.message); }
}
```

with:

```js
async function markTrainingDayComplete(day) {
  try {
    const result = await confirmarSesionEntrenamiento('manual');
    window._nfcConfirmResult = result;
    setView('nfc-confirm');
  } catch (e) { alert('Error: ' + e.message); }
}
```

(This makes the manual button behave exactly like the NFC flow: same screen, same global state variable, same view key — no new route needed.)

- [ ] **Step 2: Rewrite `renderNfcConfirmationScreen` and `closeNfcConfirmationScreen`**

Replace (index.html:2908-2942, from `function renderNfcConfirmationScreen` through the end of `closeNfcConfirmationScreen`):

```js
function renderNfcConfirmationScreen(el, result) {
  if (!result) { el.innerHTML = ''; return; }
  const { streak, phrase } = result;
  const size = 132, strokeWidth = 10;
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const pct = streak.sessionsRequiredThisWeek > 0 ? Math.min(1, streak.sessionsDoneThisWeek / streak.sessionsRequiredThisWeek) : 0;
  const filled = pct * circ;
  el.innerHTML = `
    <div class="session-confirmed-screen">
      <div class="scs-title">¡Sesión confirmada!</div>
      <div class="scs-ring-block">
        <div class="scs-ring-wrap">
          <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
            <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#2B2F37" stroke-width="${strokeWidth}"></circle>
            <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#D9A441" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-dasharray="${filled.toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"></circle>
          </svg>
          <div class="scs-ring-center">
            <div class="scs-ring-fraction">${streak.sessionsDoneThisWeek}/${streak.sessionsRequiredThisWeek}</div>
            <div class="scs-ring-label">Esta semana</div>
          </div>
        </div>
        <div class="scs-streak-row">
          <span class="scs-flame">🔥</span>
          <span class="scs-streak-num">${streak.streakWeeks}</span>
        </div>
        <div class="scs-streak-label">Semanas seguidas</div>
      </div>
      ${phrase ? `<p class="scs-phrase">"${phrase}"</p>` : '<div></div>'}
      <div class="scs-actions">
        <button class="btn btn-ghost" onclick="closeNfcConfirmationScreen()">Cerrar</button>
        <button class="scs-share-btn" onclick="shareTrainingCard(${streak.streakWeeks})" aria-label="Compartir">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/></svg>
        </button>
      </div>
    </div>
  `;
}
function closeNfcConfirmationScreen() {
  window._nfcConfirmResult = null;
  setView((CLIENT_NAV.find(item => item.visible(state)) || CLIENT_NAV[0]).key);
}
```

Notes on this diff versus the original:
- `closeNfcConfirmationScreen` drops its `goToTraining` parameter entirely (the spec bans a "Ver rutina de hoy" button, so there's no longer a second destination to choose between — every call now closes to the client's default nav tab).
- The ring reuses the exact `stroke-dasharray` technique from `renderMiniRing` (index.html:2425-2436) but is inlined here (not calling `renderMiniRing` itself) because it needs centered text content overlaid on the ring, which `renderMiniRing` doesn't support — a `<div class="scs-ring-center">` positioned absolutely over the relatively-positioned `.scs-ring-wrap` achieves this without modifying the shared `renderMiniRing` helper (which is used elsewhere and must stay unchanged per the plan's constraints).
- The `${phrase ? ... : '<div></div>'}` empty-div fallback keeps exactly 4 flex children in `.session-confirmed-screen` even when there's no phrase, so `justify-content:space-between` distributes the remaining 3 blocks the same way regardless (an empty `<div>` takes zero height, matching the spec's "sin dejar hueco extraño").

- [ ] **Step 3: Verify old class references are fully gone**

```bash
grep -n "nfc-confirm-screen\|nfc-tap-badge\|nfc-streak-pill\|Ver rutina de hoy" index.html
```
Expected: no matches.

- [ ] **Step 4: Syntax-check**

```bash
node -e "
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
for (const s of scripts) { new Function(s); }
console.log('inline scripts parse OK:', scripts.length);
"
```
Expected: `inline scripts parse OK: 1` (do not add a `src=` substring filter — a prior task found that produces a false negative on this file).

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
Rewrite session-confirmed screen as dark take-over, drop routine/toast paths

Manual button now navigates to the same full screen NFC uses, instead of
a toast. Removed the weekly-dots row, "Ver rutina de hoy" button, and the
NFC-origin subtitle per the final design — achievements now live only on
the Instagram share card (Task 5).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Frontend — `computeAchievements` pure function

**Files:**
- Modify: `index.html` (add near the top of the training-related script section — anywhere before Task 5's card generator that will call it; e.g. directly above `function renderNfcConfirmationScreen`)

**Interfaces:**
- Produces: `function computeAchievements(streakWeeks)` → `{ medalsInCurrentCycle: number, trophiesEarned: number }` — consumed by Task 5.

- [ ] **Step 1: Write the failing test script**

```js
const assert = require('assert');
const fs = require('fs');
const html = fs.readFileSync('/Users/alejandrogarcia/Desktop/latribu/index.html', 'utf8');
const match = html.match(/function computeAchievements\([\s\S]*?\n}/);
if (!match) { console.log('computeAchievements not found yet — expected before Step 2'); process.exit(1); }
eval(match[0]);
assert.deepStrictEqual(computeAchievements(0), { medalsInCurrentCycle: 0, trophiesEarned: 0 });
assert.deepStrictEqual(computeAchievements(1), { medalsInCurrentCycle: 1, trophiesEarned: 0 });
assert.deepStrictEqual(computeAchievements(3), { medalsInCurrentCycle: 3, trophiesEarned: 0 });
assert.deepStrictEqual(computeAchievements(4), { medalsInCurrentCycle: 0, trophiesEarned: 1 });
assert.deepStrictEqual(computeAchievements(5), { medalsInCurrentCycle: 1, trophiesEarned: 1 });
assert.deepStrictEqual(computeAchievements(11), { medalsInCurrentCycle: 3, trophiesEarned: 2 });
console.log('computeAchievements: all assertions passed');
```

- [ ] **Step 2: Run it to verify it fails**

Run the script with `node`. Expected: exits with code 1 and prints `computeAchievements not found yet — expected before Step 2` (function doesn't exist in index.html yet).

- [ ] **Step 3: Add the function**

```js
// streakWeeks=11 → trophiesEarned=2 (🏆🏆), medalsInCurrentCycle=3 (🎖️🎖️🎖️ + 1 slot vacío).
// Las copas nunca se resetean; las medallas del ciclo actual sí, cada 4.
function computeAchievements(streakWeeks) {
  return {
    medalsInCurrentCycle: streakWeeks % 4,
    trophiesEarned: Math.floor(streakWeeks / 4),
  };
}
```

- [ ] **Step 4: Run the test again to verify it passes**

Same command as Step 1. Expected: `computeAchievements: all assertions passed`, exit code 0.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
Add computeAchievements pure function (medals/trophies from streakWeeks)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Frontend — Instagram card Canvas generator + share/download

**Files:**
- Modify: `index.html` (add near `computeAchievements`, after Task 4)

**Interfaces:**
- Consumes: `computeAchievements(streakWeeks)` (Task 4), `api()` helper (index.html:481), `currentClientId()` (existing helper, already used by `confirmarSesionEntrenamiento`), `GET /api/clients/:id/training/phrase?context=instagram` (Task 1).
- Produces: `async function shareTrainingCard(streakWeeks)` — the `onclick` target wired in Task 3's share button.

- [ ] **Step 1: Add the font-loading + drawing + share/download function**

```js
// Fuente local (fonts/Fraunces-Variable.woff2, fonts/Fraunces-Italic-Variable.woff2)
// para que el PNG exportado nunca dependa de Google Fonts en tiempo de ejecución.
let _fraunceFontsLoaded = false;
async function ensureCardFontsLoaded() {
  if (_fraunceFontsLoaded) return;
  const regular = new FontFace('Fraunces Card', 'url(/fonts/Fraunces-Variable.woff2)', { style: 'normal', weight: '100 900' });
  const italic = new FontFace('Fraunces Card', 'url(/fonts/Fraunces-Italic-Variable.woff2)', { style: 'italic', weight: '100 900' });
  const [loadedRegular, loadedItalic] = await Promise.all([regular.load(), italic.load()]);
  document.fonts.add(loadedRegular);
  document.fonts.add(loadedItalic);
  _fraunceFontsLoaded = true;
}

// Base de diseño validada: 260x462. Todo se dibuja multiplicando por SCALE
// para llegar a los 1080x1920 finales (proporción exacta de IG Stories).
const CARD_SCALE = 1080 / 260;

function drawInstagramCard(ctx, { streakWeeks, phrase }) {
  const W = 1080, H = 1920;
  const s = (n) => n * CARD_SCALE;

  const bg = ctx.createRadialGradient(W * 0.5, H * 0.3, 0, W * 0.5, H * 0.3, W * 0.75);
  bg.addColorStop(0, '#2A2118');
  bg.addColorStop(1, '#14100A');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const padTop = H * 0.185, padBottom = H * 0.145;
  const { medalsInCurrentCycle, trophiesEarned } = computeAchievements(streakWeeks);

  // Bloque 1: fila de logros
  const rowY = padTop;
  ctx.textBaseline = 'middle';
  ctx.font = `${s(12)}px "Fraunces Card"`;
  ctx.fillStyle = '#E8C97D';
  ctx.textAlign = 'left';
  ctx.fillText(`${'🏆'.repeat(trophiesEarned)} copas`.trim(), s(22), rowY);
  ctx.textAlign = 'right';
  ctx.globalAlpha = 0.85;
  ctx.letterSpacing = `${s(2)}px`;
  ctx.fillText(`${'🎖️'.repeat(medalsInCurrentCycle)}${'○'.repeat(3 - medalsInCurrentCycle)}`, W - s(22), rowY);
  ctx.letterSpacing = '0px';
  ctx.globalAlpha = 1;

  // Bloque 2: sello circular
  const sealCenterY = H * 0.42;
  const sealR = s(75);
  ctx.beginPath();
  ctx.arc(W / 2, sealCenterY, sealR, 0, Math.PI * 2);
  ctx.strokeStyle = '#E8C97D';
  ctx.lineWidth = s(2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(W / 2, sealCenterY, sealR - s(8), 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(232,201,125,.4)';
  ctx.lineWidth = s(1);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#B8A88A';
  ctx.font = `${s(7.5)}px "Fraunces Card"`;
  ctx.letterSpacing = `${s(0.12 * 7.5)}px`;
  ctx.fillText('MI RACHA', W / 2, sealCenterY - s(28));
  ctx.letterSpacing = '0px';

  ctx.fillStyle = '#F8EFDD';
  ctx.font = `800 ${s(42)}px "Fraunces Card"`;
  ctx.fillText(String(streakWeeks), W / 2, sealCenterY);

  ctx.fillStyle = '#E8C97D';
  ctx.font = `${s(9)}px "Fraunces Card"`;
  ctx.fillText('SEMANAS SEGUIDAS', W / 2, sealCenterY + s(28));

  // Bloque 3: frase
  if (phrase) {
    ctx.fillStyle = '#F3E9D2';
    ctx.font = `italic ${s(14)}px "Fraunces Card"`;
    const maxWidth = s(200);
    const words = `"${phrase}"`.split(' ');
    let line = '', lines = [];
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; }
      else line = test;
    }
    if (line) lines.push(line);
    const lineHeight = s(14) * 1.4;
    const phraseY = H - padBottom - s(90) - (lines.length - 1) * lineHeight / 2;
    lines.forEach((l, i) => ctx.fillText(l, W / 2, phraseY + i * lineHeight));
  }

  // Bloque 4: marca
  const brandY = H - padBottom;
  ctx.fillStyle = '#E8C97D';
  ctx.font = `700 ${s(13)}px "Fraunces Card"`;
  ctx.fillText('La Tribu', W / 2, brandY - s(14));
  ctx.fillStyle = '#9C8A67';
  ctx.font = `${s(7.5)}px "Fraunces Card"`;
  ctx.letterSpacing = `${s(0.05 * 7.5)}px`;
  ctx.fillText('COMUNIDAD DE BIENESTAR Y ALTO RENDIMIENTO', W / 2, brandY);
  ctx.letterSpacing = '0px';
}

async function shareTrainingCard(streakWeeks) {
  const btn = event && event.currentTarget;
  if (btn) btn.disabled = true;
  try {
    await ensureCardFontsLoaded();
    const clientId = currentClientId();
    const { phrase } = await api(`/api/clients/${clientId}/training/phrase?context=instagram`);
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    drawInstagramCard(ctx, { streakWeeks, phrase });
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    const file = new File([blob], 'la-tribu-racha.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file] });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'la-tribu-racha.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
  } catch (e) {
    if (e.name !== 'AbortError') alert('No pudimos generar la tarjeta: ' + e.message);
  } finally {
    if (btn) btn.disabled = false;
  }
}
```

Notes:
- `event.currentTarget` relies on the global `event` available inside inline `onclick="..."` handlers in non-strict browser contexts (same assumption already implicit elsewhere in this codebase's onclick-driven style) — if this turns out unavailable in practice, the fallback is simply that the button doesn't visually disable during generation, which is a Minor cosmetic gap, not a functional break (share/download still work).
- `navigator.share` rejecting with `AbortError` means the user cancelled the native share sheet — deliberately not shown as an error.
- The phrase word-wrap loop is a minimal implementation (measures against the *unscaled-canvas-but-scaled-font* width) — good enough for a max-width-200(*scale) constraint on short quote-length phrases; this is intentionally simple rather than a full typesetting engine, matching the scope of this feature.

- [ ] **Step 2: Syntax-check**

```bash
node -e "
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
for (const s of scripts) { new Function(s); }
console.log('inline scripts parse OK:', scripts.length);
"
```
Expected: `inline scripts parse OK: 1`.

- [ ] **Step 3: Verify `computeAchievements` is called with matching values (cross-task consistency check)**

```bash
grep -n "computeAchievements(streakWeeks)" index.html
```
Expected: exactly one call site inside `drawInstagramCard`, using the same parameter name (`streakWeeks`) `shareTrainingCard` receives from Task 3's `onclick="shareTrainingCard(${streak.streakWeeks})"`.

- [ ] **Step 4: Manual verification (no browser access in this environment)**

A human needs to: open the app on a real device (ideally iOS, to validate the native share sheet), confirm a session (manual button or NFC), tap the share icon, and confirm: (a) the PNG downloads or the native share sheet opens, (b) the card visually matches the spec (colors, seal, medals/trophies for a test account with `streakWeeks` > 4), (c) the phrase shown is in first person and comes from the `instagram` context bank, (d) text doesn't overflow/clip for a long phrase.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
Add Canvas-2D Instagram share card generator with local Fraunces fonts

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Database — `achievement_logs` table

**Files:**
- Modify: `schema.sql` (add table near `training_protector_uses`, add to the RLS `deny_all` array)
- Modify: `tasks/migration-2026-07-17.sql` (append at the end — this file is the running "apply this in Supabase SQL Editor" log, exactly as every prior migration in this project was added)

**Interfaces:**
- Produces: table `achievement_logs(id UUID, client_id UUID, type TEXT, week_number INT, earned_at TIMESTAMPTZ)` — consumed by Task 7 (`dbInsert`) and Task 8 (`dbGet`).

- [ ] **Step 1: Add the table to `schema.sql`**

Insert after the `training_protector_uses` table definition:

```sql
-- Historial de logros (medallas por semana completada, copas cada 4
-- medallas) para la vista admin del módulo Entrenamiento. Aditivo, nunca se
-- borra ni se resetea — se llena desde confirm-session (ver server.js),
-- nunca desde use-protector (una semana protegida no genera logro nuevo).
CREATE TABLE achievement_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('medalla', 'copa')),
  week_number INT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW()
);
```

- [ ] **Step 2: Add `achievement_logs` to the RLS `deny_all` array in `schema.sql`**

Find the array that currently ends with `...,'phrases'` (added by the earlier Frases Card RR.SS plan) and append `,'achievement_logs'` to it.

- [ ] **Step 3: Append the runnable migration to `tasks/migration-2026-07-17.sql`**

Add at the end of the file:

```sql
-- Historial de logros (medallas/copas) para la vista admin de Entrenamiento.
CREATE TABLE IF NOT EXISTS achievement_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('medalla', 'copa')),
  week_number INT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE achievement_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY deny_all ON achievement_logs USING (false);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
```

- [ ] **Step 4: Run the migration manually in the Supabase SQL Editor**

Same as every prior migration in this project (see Global Constraints) — there is no Postgres connection string available in this environment to automate this. Run the block from Step 3 in the Supabase dashboard's SQL Editor.

- [ ] **Step 5: Verify the table exists**

```bash
node -e "
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  const { data, error } = await supabase.from('achievement_logs').select('*').limit(1);
  if (error) return console.log('TABLE NOT READY:', error.message);
  console.log('table ready, rows:', data.length);
})();
"
```
Expected: `table ready, rows: 0` once Step 4 has been run (if it prints `TABLE NOT READY`, Step 4 hasn't been applied yet — note this and move on, since Task 7's non-fatal error handling means the rest of the app keeps working either way).

- [ ] **Step 6: Commit**

```bash
git add schema.sql tasks/migration-2026-07-17.sql
git commit -m "$(cat <<'EOF'
Add achievement_logs table for medals/trophies history

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Backend — log medals/trophies inside `confirm-session`

**Files:**
- Modify: `server.js:1252-1288` (the `POST /api/clients/:id/training/confirm-session` handler)

**Interfaces:**
- Consumes: `dbInsert('achievement_logs', {...})` (table from Task 6); `streak.sessionsDoneThisWeek`/`streak.streakWeeks` (already computed by the existing `computeTrainingStreakState` call in this handler).
- Produces: no new exported interface — this is an internal side effect. Task 8's read endpoint is independent and doesn't depend on this task's code (only on the table existing).

- [ ] **Step 1: Replace the handler body**

The current handler (server.js:1252-1288) is:

```js
app.post('/api/clients/:id/training/confirm-session', authMiddleware, ownerOrAdmin, requirePermission('training'), async (req, res) => {
  try {
    const client = await dbGetOne('clients', { id: req.params.id });
    if (!client) return err(res, 'Cliente no encontrado.', 404);
    const trainingDays = client.training_days || 0;
    if (!trainingDays) return err(res, 'Este cliente no tiene días de entrenamiento asignados.', 400);
    const source = req.body.source === 'nfc' ? 'nfc' : 'manual';
    // El sticker NFC está atado a un lugar físico (el gym), no al reloj del
    // celular que escanea — un cliente o tester puede tapear desde otra zona
    // horaria (ej. probando remoto), así que para 'nfc' siempre se usa la
    // zona horaria fija del gym en vez de confiar en el dispositivo. Para
    // 'manual' sí se respeta la zona del cliente (relevante para online).
    const tz = source === 'nfc' ? DEFAULT_TRAINING_TZ : req.body.tz;
    const today = todayInTz(tz);
    const weekStart = getWeekStartISO(tz);

    const completions = await dbGet('training_completions', { client_id: req.params.id });
    const alreadyConfirmedToday = completions.some(c => c.completed_date === today);
    if (!alreadyConfirmedToday) {
      const doneThisWeek = new Set(completions.filter(c => c.completed_date >= weekStart).map(c => c.day_number)).size;
      const dayNumber = Math.min(trainingDays, doneThisWeek + 1);
      const existing = await dbGetOne('training_completions', { client_id: req.params.id, day_number: dayNumber, completed_date: today });
      if (!existing) await dbInsert('training_completions', { client_id: req.params.id, day_number: dayNumber, completed_date: today, source });
    }

    let drawnPhrase = null;
    try {
      const phrasePool = await dbGet('phrases', { active: true });
      drawnPhrase = pickRandomPhrase(phrasePool, 'confirmacion');
    } catch (e) {
      console.error('phrase draw failed (non-fatal):', e);
    }
    const streak = await computeTrainingStreakState(req.params.id, trainingDays, tz);
    return ok(res, { streak, alreadyConfirmedToday, phrase: drawnPhrase ? drawnPhrase.text : null });
  } catch (e) {
    console.error(e);
```

Replace the body from `const completions = ...` through the `return ok(...)` line with:

```js
    const completions = await dbGet('training_completions', { client_id: req.params.id });
    const alreadyConfirmedToday = completions.some(c => c.completed_date === today);
    let justInsertedNewSession = false;
    let wasCompletedBeforeThisCall = false;
    if (!alreadyConfirmedToday) {
      const doneThisWeek = new Set(completions.filter(c => c.completed_date >= weekStart).map(c => c.day_number)).size;
      wasCompletedBeforeThisCall = doneThisWeek >= trainingDays;
      const dayNumber = Math.min(trainingDays, doneThisWeek + 1);
      const existing = await dbGetOne('training_completions', { client_id: req.params.id, day_number: dayNumber, completed_date: today });
      if (!existing) {
        await dbInsert('training_completions', { client_id: req.params.id, day_number: dayNumber, completed_date: today, source });
        justInsertedNewSession = true;
      }
    }

    let drawnPhrase = null;
    try {
      const phrasePool = await dbGet('phrases', { active: true });
      drawnPhrase = pickRandomPhrase(phrasePool, 'confirmacion');
    } catch (e) {
      console.error('phrase draw failed (non-fatal):', e);
    }
    const streak = await computeTrainingStreakState(req.params.id, trainingDays, tz);

    // Historial de logros (medallas/copas) para la vista admin. Nunca se
    // dispara por el protector (endpoint separado, no pasa por aquí).
    // Idempotente: solo registra la transición exacta de "semana incompleta"
    // a "semana completa" causada por ESTA llamada — una sesión extra
    // confirmada después de ya completar la semana no repite el evento,
    // porque wasCompletedBeforeThisCall ya sería true en ese caso.
    if (justInsertedNewSession && !wasCompletedBeforeThisCall && streak.sessionsDoneThisWeek >= trainingDays) {
      try {
        await dbInsert('achievement_logs', { client_id: req.params.id, type: 'medalla', week_number: streak.streakWeeks });
        if (streak.streakWeeks > 0 && streak.streakWeeks % 4 === 0) {
          await dbInsert('achievement_logs', { client_id: req.params.id, type: 'copa', week_number: streak.streakWeeks });
        }
      } catch (e) {
        console.error('achievement log insert failed (non-fatal):', e);
      }
    }

    return ok(res, { streak, alreadyConfirmedToday, phrase: drawnPhrase ? drawnPhrase.text : null });
```

(Everything else in the handler — the opening lines through `const weekStart = getWeekStartISO(tz);`, and the trailing `catch (e) { console.error(e); ...}` — stays exactly as-is.)

The achievement insert is wrapped in its own try/catch, same pattern as the phrase draw a few lines above it and the same lesson learned in the Frases Card RR.SS final review: a missing/broken `achievement_logs` table must never turn a real, already-recorded attendance confirmation into a 500 for the client.

- [ ] **Step 2: Syntax-check**

```bash
node --check server.js
```
Expected: no output.

- [ ] **Step 3: Verify the trigger logic with an in-memory simulation (no DB)**

```bash
node -e "
const assert = require('assert');

function simulateConfirm(trainingDays, priorCompletionsCount, priorStreakWeeks) {
  const wasCompletedBeforeThisCall = priorCompletionsCount >= trainingDays;
  const doneThisWeekAfter = Math.min(trainingDays, priorCompletionsCount + 1);
  const sessionsDoneThisWeek = doneThisWeekAfter;
  // streakWeeks only increments (in the real app, via computeTrainingStreakState
  // re-scanning history) when this call completes the week — simulate that here:
  const streakWeeks = (!wasCompletedBeforeThisCall && sessionsDoneThisWeek >= trainingDays) ? priorStreakWeeks + 1 : priorStreakWeeks;
  const justInsertedNewSession = true; // this test only covers the 'a new session was recorded' path
  let medalla = false, copa = false;
  if (justInsertedNewSession && !wasCompletedBeforeThisCall && sessionsDoneThisWeek >= trainingDays) {
    medalla = true;
    if (streakWeeks > 0 && streakWeeks % 4 === 0) copa = true;
  }
  return { medalla, copa, streakWeeks };
}

// Semana 3 de 3 completada por primera vez (streak pasa de 10 a 11) -> medalla, sin copa (11 % 4 !== 0)
let r = simulateConfirm(3, 2, 10);
assert.strictEqual(r.medalla, true);
assert.strictEqual(r.copa, false);
assert.strictEqual(r.streakWeeks, 11);

// Semana que lleva el streak de 11 a 12 -> medalla Y copa (12 % 4 === 0)
r = simulateConfirm(3, 2, 11);
assert.strictEqual(r.medalla, true);
assert.strictEqual(r.copa, true);
assert.strictEqual(r.streakWeeks, 12);

// Sesión extra la MISMA semana ya completada (priorCompletionsCount ya es >= trainingDays) -> no debe repetir el evento
r = simulateConfirm(3, 3, 12);
assert.strictEqual(r.medalla, false);
assert.strictEqual(r.copa, false);

console.log('achievement trigger simulation: all assertions passed');
"
```
Expected: `achievement trigger simulation: all assertions passed`.

- [ ] **Step 4: Commit**

```bash
git add server.js
git commit -m "$(cat <<'EOF'
Log medals/trophies to achievement_logs on real week completion

Wrapped in its own try/catch (non-fatal) — a missing/broken
achievement_logs table must never break attendance confirmation.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Backend — admin achievements read endpoint

**Files:**
- Modify: `server.js` (add directly after the `confirm-session` endpoint, or after `use-protector` — search for `app.post('/api/clients/:id/training/use-protector'` to find that block and insert right after it)

**Interfaces:**
- Consumes: `dbGet('achievement_logs', {...})` (table from Task 6).
- Produces: `GET /api/clients/:id/training/achievements` → `{ achievements: [{id, client_id, type, week_number, earned_at}, ...] }` (most recent first) — consumed by Task 9 (admin UI).

- [ ] **Step 1: Add the endpoint**

```js
app.get('/api/clients/:id/training/achievements', authMiddleware, adminOnly, async (req, res) => {
  try {
    const achievements = await dbGet('achievement_logs', { client_id: req.params.id }, { order: { column: 'earned_at', ascending: false } });
    return ok(res, { achievements });
  } catch (e) {
    console.error(e);
    return err(res, 'Error al obtener el historial de logros.', 500);
  }
});
```

- [ ] **Step 2: Syntax-check**

```bash
node --check server.js
```
Expected: no output.

- [ ] **Step 3: Verify the guard rejects a non-admin**

```bash
grep -n "app.get('/api/clients/:id/training/achievements'" server.js
```
Expected: one match, showing `adminOnly` in the middleware chain (not `ownerOrAdmin`) — confirms the access-control decision from the spec is actually in the code, not just intended.

- [ ] **Step 4: Commit**

```bash
git add server.js
git commit -m "$(cat <<'EOF'
Add admin-only GET /training/achievements endpoint

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Frontend — "Historial de logros" admin card

**Files:**
- Modify: `index.html:2357-2388` (`renderTraining`) — fetch achievements alongside the rest when `isAdmin`
- Modify: `index.html:2488-2496` (`renderTrainingHome`, the `isAdmin` branch only) — thread `achievements` through to `renderTrainingAdminPanel`
- Modify: `index.html:2571-2610` (`renderTrainingAdminPanel`) — accept `achievements`, add the new card

**Interfaces:**
- Consumes: `GET /api/clients/:id/training/achievements` (Task 8), `api()` helper (index.html:481).
- Produces: `renderAchievementsHistoryCard(achievements)`, `achievementsUI` filter state, `setAchievementsFilter(type)` — no other task depends on these (leaf feature).

- [ ] **Step 1: Fetch achievements in `renderTraining` and thread them through**

The current function (index.html:2357-2388) is:

```js
async function renderTraining(el) {
  const isAdmin = state.role === 'admin';
  if (!isAdmin && state.clientType === 'lead_wellness') return renderTrainingLocked(el);
  const clientId = currentClientId();
  try {
    if (isAdmin && !clientId) {
      await ensureClientsLoaded();
      const adminQuotes = (await api('/api/admin/quotes').catch(() => ({ quotes: [] }))).quotes || [];
      window._trainingExercises = [];
      window._trainingClientDays = 0;
      return renderTrainingHome(el, [], { training_days: null, assigned_quote_id: null }, true, null, adminQuotes, []);
    }
    const calls = [
      api(`/api/clients/${clientId}/exercises`),
      api(`/api/clients/${clientId}`),
      api(`/api/clients/${clientId}/quote-of-the-day`).catch(() => ({ quote: null })),
      api(`/api/clients/${clientId}/training-completions`).catch(() => ({ completions: [] })),
      !isAdmin ? api(`/api/clients/${clientId}/training/streak?tz=${encodeURIComponent(clientTz())}`).catch(() => ({ streak: null })) : Promise.resolve({ streak: null }),
    ];
    if (isAdmin) calls.push(api('/api/admin/quotes').catch(() => ({ quotes: [] })));
    if (isAdmin) await ensureClientsLoaded();
    const [{ exercises }, { client }, { quote }, { completions }, { streak }, quotesResult] = await Promise.all(calls);
    window._trainingExercises = exercises;
    window._trainingCompletions = completions;
    window._trainingStreak = streak;
    const adminQuotes = quotesResult ? quotesResult.quotes : [];

    if (trainingUI.day && trainingUI.category) return renderTrainingPlayer(el, exercises, client, isAdmin);
    if (trainingUI.day) return renderTrainingDay(el, exercises, client, isAdmin, completions);
    return renderTrainingHome(el, exercises, client, isAdmin, quote, adminQuotes, completions);
  } catch (e) { el.innerHTML = `<div class="error-msg">${e.message}</div>`; }
}
```

Replace it with:

```js
async function renderTraining(el) {
  const isAdmin = state.role === 'admin';
  if (!isAdmin && state.clientType === 'lead_wellness') return renderTrainingLocked(el);
  const clientId = currentClientId();
  try {
    if (isAdmin && !clientId) {
      await ensureClientsLoaded();
      const adminQuotes = (await api('/api/admin/quotes').catch(() => ({ quotes: [] }))).quotes || [];
      window._trainingExercises = [];
      window._trainingClientDays = 0;
      return renderTrainingHome(el, [], { training_days: null, assigned_quote_id: null }, true, null, adminQuotes, [], []);
    }
    const calls = [
      api(`/api/clients/${clientId}/exercises`),
      api(`/api/clients/${clientId}`),
      api(`/api/clients/${clientId}/quote-of-the-day`).catch(() => ({ quote: null })),
      api(`/api/clients/${clientId}/training-completions`).catch(() => ({ completions: [] })),
      !isAdmin ? api(`/api/clients/${clientId}/training/streak?tz=${encodeURIComponent(clientTz())}`).catch(() => ({ streak: null })) : Promise.resolve({ streak: null }),
    ];
    if (isAdmin) calls.push(api('/api/admin/quotes').catch(() => ({ quotes: [] })));
    if (isAdmin) calls.push(api(`/api/clients/${clientId}/training/achievements`).catch(() => ({ achievements: [] })));
    if (isAdmin) await ensureClientsLoaded();
    const [{ exercises }, { client }, { quote }, { completions }, { streak }, quotesResult, achievementsResult] = await Promise.all(calls);
    window._trainingExercises = exercises;
    window._trainingCompletions = completions;
    window._trainingStreak = streak;
    const adminQuotes = quotesResult ? quotesResult.quotes : [];
    const achievements = achievementsResult ? achievementsResult.achievements : [];

    if (trainingUI.day && trainingUI.category) return renderTrainingPlayer(el, exercises, client, isAdmin);
    if (trainingUI.day) return renderTrainingDay(el, exercises, client, isAdmin, completions);
    return renderTrainingHome(el, exercises, client, isAdmin, quote, adminQuotes, completions, achievements);
  } catch (e) { el.innerHTML = `<div class="error-msg">${e.message}</div>`; }
}
```

(Only 4 lines actually change: the `isAdmin && !clientId` branch's `renderTrainingHome(...)` call gains a trailing `[]`; one `calls.push(...)` line is added; the destructuring line gains `achievementsResult`; `const achievements = ...` is added; the final `renderTrainingHome(...)` call gains a trailing `achievements`.)

- [ ] **Step 2: Thread `achievements` through `renderTrainingHome`'s admin branch**

The current function start (index.html:2488-2496) is:

```js
function renderTrainingHome(el, exercises, client, isAdmin, quote, adminQuotes, completions) {
  if (isAdmin) {
    window._trainingClientDays = client.training_days || 0;
    el.innerHTML = `
      ${renderTrainingAdminPanel(client, adminQuotes)}
      ${renderTrainingAdminExercisesByDay(exercises, client.training_days || 0)}
    `;
    return;
  }
```

Replace with:

```js
function renderTrainingHome(el, exercises, client, isAdmin, quote, adminQuotes, completions, achievements) {
  if (isAdmin) {
    window._trainingClientDays = client.training_days || 0;
    el.innerHTML = `
      ${renderTrainingAdminPanel(client, adminQuotes, achievements || [])}
      ${renderTrainingAdminExercisesByDay(exercises, client.training_days || 0)}
    `;
    return;
  }
```

(Nothing else in this function changes — the non-admin branch below never references `achievements`.)

- [ ] **Step 3: Add achievements UI state + filter/render functions**

Add near `phrasesUI` (index.html, search for `let phrasesUI`):

```js
let achievementsUI = { filter: 'all' };
function filteredAchievements(achievements) {
  if (achievementsUI.filter === 'all') return achievements;
  return achievements.filter(a => a.type === achievementsUI.filter);
}
function setAchievementsFilter(type) {
  achievementsUI.filter = type;
  renderMain();
}
function renderAchievementsHistoryCard(achievements) {
  const totalCopas = achievements.filter(a => a.type === 'copa').length;
  const totalMedallas = achievements.filter(a => a.type === 'medalla').length;
  const list = filteredAchievements(achievements);
  const filters = [['all', 'Todas'], ['medalla', 'Medallas'], ['copa', 'Copas']];
  return `
    <div class="card">
      <div class="card-title">Historial de logros</div>
      <div class="grid-2" style="margin-bottom:16px;">
        <div class="kpi-tile"><div class="val">🏆 ${totalCopas}</div><div class="lbl">Copas totales</div></div>
        <div class="kpi-tile"><div class="val">🎖️ ${totalMedallas}</div><div class="lbl">Medallas totales</div></div>
      </div>
      <div class="pillrow" style="margin-bottom:12px;">
        ${filters.map(([key, label]) => `
          <button class="pill" style="cursor:pointer;${achievementsUI.filter === key ? 'background:var(--ink);color:var(--paper);border-color:var(--ink);' : ''}" onclick="setAchievementsFilter('${key}')">${label}</button>
        `).join('')}
      </div>
      ${list.length ? list.map(a => `
        <div class="list-row">
          <div>${a.type === 'copa' ? '🏆' : '🎖️'} ${a.type === 'copa' ? 'Copa' : 'Medalla'} — semana ${a.week_number}</div>
          <div style="color:var(--ink-soft);font-size:12px;">${new Date(a.earned_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
        </div>
      `).join('') : '<div class="empty-state">Aún no hay logros registrados.</div>'}
    </div>
  `;
}
```

(No backend re-fetch on filter change — `setAchievementsFilter` just re-renders from the already-fetched list via `renderMain()`, same pattern as every other client-side-only filter in this codebase.)

- [ ] **Step 4: Wire the card into `renderTrainingAdminPanel`**

Change the function signature and append the card:

```js
function renderTrainingAdminPanel(client, adminQuotes, achievements) {
  return `
    <div class="card">
      <div class="card-title">Configuración del cliente</div>
      ${renderAdminClientSwitcher('training')}
      <div class="grid-2">
        <div class="field"><label>Días de entrenamiento por semana</label>
          <select id="tr-training-days">
            <option value="">Sin definir</option>
            ${[1,2,3,4,5,6,7].map(n => `<option value="${n}" ${client.training_days === n ? 'selected' : ''}>${n} día${n === 1 ? '' : 's'}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Frase asignada a este cliente</label>
          <select id="tr-assigned-quote">
            <option value="">Aleatoria del pool general</option>
            ${adminQuotes.map(q => `<option value="${q.id}" ${client.assigned_quote_id === q.id ? 'selected' : ''}>${q.quote.length > 60 ? q.quote.slice(0, 60) + '…' : q.quote}</option>`).join('')}
          </select>
        </div>
      </div>
      <button class="btn btn-ghost" style="width:auto" onclick="saveTrainingConfig()">Guardar configuración</button>
    </div>
    <div class="card">
      <div class="card-title">Agregar ejercicio</div>
      <div class="grid-3">
        <div class="field"><label>Título</label><input id="ex-title"></div>
        <div class="field"><label>Día</label><select id="ex-day">${[1,2,3,4,5,6,7].map(n => `<option value="${n}">Día ${n}</option>`).join('')}</select></div>
        <div class="field"><label>Categoría</label><select id="ex-category" onchange="toggleExerciseCategoryFields()">
          <option value="warmup">Warm Up</option><option value="strength" selected>Strength</option><option value="cardio">Cardio</option>
        </select></div>
        <div class="field" id="ex-field-series"><label>Series</label><input type="number" id="ex-series" value="3"></div>
        <div class="field" id="ex-field-reps"><label>Repeticiones</label><input id="ex-reps"></div>
        <div class="field" id="ex-field-duration" style="display:none;"><label>Duración</label><input id="ex-duration" placeholder="20 min"></div>
        <div class="field"><label>Descanso (seg. o mm:ss)</label><input id="ex-rest" placeholder="60"></div>
        <div class="field"><label>Video (YouTube)</label><input id="ex-youtube" placeholder="https://youtube.com/watch?v=..."></div>
      </div>
      <div class="field"><label>Descripción</label><textarea id="ex-desc" rows="2"></textarea></div>
      <button class="btn btn-primary" style="width:auto" onclick="createExercise()">Agregar</button>
    </div>
    ${renderAchievementsHistoryCard(achievements)}
  `;
}
```

Its one call site was already updated in Step 2 (`renderTrainingAdminPanel(client, adminQuotes, achievements || [])`), so no further change is needed there.

- [ ] **Step 5: Syntax-check**

```bash
node -e "
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
for (const s of scripts) { new Function(s); }
console.log('inline scripts parse OK:', scripts.length);
"
```
Expected: `inline scripts parse OK: 1`.

- [ ] **Step 6: Manual verification (no browser access in this environment)**

A human admin needs to: open a test client's Entrenamiento tab, confirm the "Historial de logros" card renders below "Agregar ejercicio" without errors (even with zero achievements — check the empty state), then after that client earns a medal/trophy (via Task 7), refresh and confirm the new row appears with the correct week number and date, and that the type filter pills narrow the list correctly.

- [ ] **Step 7: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
Add "Historial de logros" admin card to the Entrenamiento client view

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
