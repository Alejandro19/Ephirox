# Bloqueo Secuencial de Categorías + Modal/Fullscreen Responsive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add sequential unlock ordering between training-day categories (Warm Up → Strength → Cardio, filtered to only the categories a client actually has exercises for that day), and make the "Sesión Confirmada" screen render as a centered modal on wide screens while staying full-screen on mobile.

**Architecture:** Pure frontend change, vanilla JS + template strings in `index.html`, no build step, no new dependencies. "Assigned" is derived from existing `exercises` data (≥1 exercise for that category/day/client) — no schema change, no new endpoint.

**Tech Stack:** vanilla JS (`index.html`). No test framework exists in this project — verification uses standalone `node -e` scripts for the pure lock-state logic, and manual browser testing for the visual/responsive pieces (no browser access in this environment).

## Global Constraints

- Do not change `allDone`/`doneCount`/`totalCount` computation, `markTrainingDayComplete`, `confirmarSesionEntrenamiento`, `isDayUnlocked` (the week-based day-to-day lock), or how `trainingUI.completed` is populated/reset — all already correct and out of scope.
- "Assigned" category = has ≥1 `exercises` row for that `client_id`/`day_number`/`category`. No new table, column, or admin UI for explicit assignment.
- A "no asignada" (0 exercises) category tile is always shown (never hidden), always disabled, and is excluded entirely from the sequential-order calculation — it must never block or appear in the "Completa X y Y" helper text.
- A "locked" category tile and a "no asignada" category tile are BOTH visually greyed out (reuse the existing `.category-tile:disabled` style, no new CSS class) but must show different icon/text: locked → 🔒 "Bloqueado"; no asignada → no lock icon, "No asignado".
- The modal/fullscreen breakpoint must reuse the existing mobile-shell breakpoint already in `index.html` (`max-width:900px`, where the hamburger/mobile-topbar shell activates) — not a new arbitrary breakpoint.

---

## File Map

| File | Change |
|---|---|
| `index.html` | Add `getCategoryLockState`, `incompleteAssignedCategoryLabels`, `joinWithY` helpers; modify `renderTrainingDay`'s category-tile rendering and button helper text; add a `@media(min-width:901px)` block for `.session-confirmed-screen` (modal treatment). |

---

### Task 1: Sequential category lock-state helpers (pure functions)

**Files:**
- Modify: `index.html` (add near `renderTrainingDay`, e.g. directly above it — search for `function renderTrainingDay` to find the insertion point)

**Interfaces:**
- Produces: `getCategoryLockState(cat, dayExercises)` → `'no_asignada' | 'done' | 'active' | 'locked'`; `incompleteAssignedCategoryLabels(dayExercises)` → `string[]` (e.g. `['Warm Up', 'Strength']`); `joinWithY(labels)` → `string` (e.g. `'Warm Up y Strength'`). All three are pure — no DOM, no network — except that `getCategoryLockState`/`incompleteAssignedCategoryLabels` read the existing global `trainingUI.completed` map (same pattern already used throughout this file, e.g. `renderTrainingDay`'s own `doneCount` calculation). Consumed by Task 2.

- [ ] **Step 1: Write the failing test script**

```js
const assert = require('assert');
const fs = require('fs');
const html = fs.readFileSync('/Users/alejandrogarcia/Desktop/latribu/index.html', 'utf8');

// Extract just the 3 new functions + their one dependency (a minimal trainingUI stub)
// by evaluating them in isolation — this file has no module system, so we pull the
// function bodies out by name the same way an earlier plan's Task 4 test did for
// computeAchievements.
function extractFn(name) {
  const re = new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`);
  const m = html.match(re);
  if (!m) throw new Error(`${name} not found yet — expected before Step 2`);
  return m[0];
}

let trainingUI = { completed: {} };
eval(extractFn('getCategoryLockState'));
eval(extractFn('incompleteAssignedCategoryLabels'));
eval(extractFn('joinWithY'));

const ex = (id, category) => ({ id, category });

// Case 1: all 3 assigned, nothing done yet
let day = [ex('w1', 'warmup'), ex('s1', 'strength'), ex('c1', 'cardio')];
trainingUI.completed = {};
assert.strictEqual(getCategoryLockState('warmup', day), 'active');
assert.strictEqual(getCategoryLockState('strength', day), 'locked');
assert.strictEqual(getCategoryLockState('cardio', day), 'locked');

// Case 2: warmup done -> strength becomes active, cardio still locked
trainingUI.completed = { w1: true };
assert.strictEqual(getCategoryLockState('warmup', day), 'done');
assert.strictEqual(getCategoryLockState('strength', day), 'active');
assert.strictEqual(getCategoryLockState('cardio', day), 'locked');

// Case 3: only warmup + cardio assigned (no strength exercises this day) —
// order collapses to warmup -> cardio, strength tile is 'no_asignada' regardless of completed map
let day2 = [ex('w1', 'warmup'), ex('c1', 'cardio')];
trainingUI.completed = {};
assert.strictEqual(getCategoryLockState('warmup', day2), 'active');
assert.strictEqual(getCategoryLockState('strength', day2), 'no_asignada');
assert.strictEqual(getCategoryLockState('cardio', day2), 'locked');
trainingUI.completed = { w1: true };
assert.strictEqual(getCategoryLockState('cardio', day2), 'active');

// Case 4: middle category unassigned — warmup + cardio only (no strength), mirrors case 3
// but explicitly named per the spec's example ("sin Strength pero con Warm Up y Cardio")
trainingUI.completed = { w1: true };
assert.strictEqual(getCategoryLockState('cardio', day2), 'active');

// Case 5: everything done
trainingUI.completed = { w1: true, c1: true };
assert.strictEqual(getCategoryLockState('warmup', day2), 'done');
assert.strictEqual(getCategoryLockState('cardio', day2), 'done');

// incompleteAssignedCategoryLabels + joinWithY
trainingUI.completed = {};
assert.deepStrictEqual(incompleteAssignedCategoryLabels(day), ['Warm Up', 'Strength', 'Cardio']);
assert.strictEqual(joinWithY(incompleteAssignedCategoryLabels(day)), 'Warm Up, Strength y Cardio');
assert.deepStrictEqual(incompleteAssignedCategoryLabels(day2), ['Warm Up', 'Cardio']);
assert.strictEqual(joinWithY(incompleteAssignedCategoryLabels(day2)), 'Warm Up y Cardio');
trainingUI.completed = { w1: true };
assert.deepStrictEqual(incompleteAssignedCategoryLabels(day2), ['Cardio']);
assert.strictEqual(joinWithY(incompleteAssignedCategoryLabels(day2)), 'Cardio');
assert.strictEqual(joinWithY([]), '');

console.log('category lock-state simulation: all assertions passed');
```

- [ ] **Step 2: Run it to verify it fails**

Run the script with `node`. Expected: throws `Error: getCategoryLockState not found yet — expected before Step 2` (the function doesn't exist in index.html yet).

- [ ] **Step 3: Add the three functions**

Insert directly above `function renderTrainingDay(el, exercises, client, isAdmin, completions) {` (search for it to find the exact line):

```js
// Orden fijo Warm Up -> Strength -> Cardio, pero filtrado solo a las
// categorías que el cliente tiene asignadas ese día (= tiene ≥1 ejercicio).
// Una categoría sin ejercicios nunca es 'locked' — es 'no_asignada' y queda
// fuera del orden por completo.
function getCategoryLockState(cat, dayExercises) {
  const list = dayExercises.filter(x => x.category === cat);
  if (!list.length) return 'no_asignada';
  const isDone = list.every(x => trainingUI.completed[x.id]);
  const assignedOrder = ['warmup', 'strength', 'cardio'].filter(c => dayExercises.some(x => x.category === c));
  const idx = assignedOrder.indexOf(cat);
  if (idx === 0) return isDone ? 'done' : 'active';
  const prevList = dayExercises.filter(x => x.category === assignedOrder[idx - 1]);
  const prevDone = prevList.every(x => trainingUI.completed[x.id]);
  if (isDone) return 'done';
  return prevDone ? 'active' : 'locked';
}
function incompleteAssignedCategoryLabels(dayExercises) {
  return ['warmup', 'strength', 'cardio']
    .filter(cat => dayExercises.some(x => x.category === cat))
    .filter(cat => !dayExercises.filter(x => x.category === cat).every(x => trainingUI.completed[x.id]))
    .map(cat => CATEGORY_LABELS[cat]);
}
function joinWithY(labels) {
  if (labels.length === 0) return '';
  if (labels.length === 1) return labels[0];
  return labels.slice(0, -1).join(', ') + ' y ' + labels[labels.length - 1];
}
```

- [ ] **Step 4: Run the test again to verify it passes**

Same command as Step 1. Expected: `category lock-state simulation: all assertions passed`, exit code 0.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
Add sequential category lock-state pure functions

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Wire lock states into `renderTrainingDay`'s tiles and button helper text

**Files:**
- Modify: `index.html` (the category-tile map and the button block inside `renderTrainingDay` — search for `function renderTrainingDay` to find it; Task 1 already added the helper functions directly above it)

**Interfaces:**
- Consumes: `getCategoryLockState`, `incompleteAssignedCategoryLabels`, `joinWithY` (Task 1).
- Produces: no new interface — this is the leaf consumer of Task 1's helpers.

- [ ] **Step 1: Replace the category-tile map**

The current code (inside `renderTrainingDay`) is:

```js
    <div class="grid-3">
      ${Object.keys(CATEGORY_LABELS).map(cat => {
        const list = dayExercises.filter(x => x.category === cat);
        const catDone = list.filter(x => trainingUI.completed[x.id]).length;
        const isSelected = trainingUI.lastCategory === cat;
        return `<button class="category-tile ${isSelected ? 'selected' : ''}" ${list.length ? '' : 'disabled'} onclick="openTrainingCategory('${cat}')">
          ${categoryIcon(cat)}
          <div class="label">${CATEGORY_LABELS[cat]}</div>
          <div class="count">${list.length ? `${catDone}/${list.length} ejercicio${list.length === 1 ? '' : 's'}` : 'Sin ejercicios'}</div>
        </button>`;
      }).join('')}
    </div>
```

Replace it with:

```js
    <div class="grid-3">
      ${Object.keys(CATEGORY_LABELS).map(cat => {
        const list = dayExercises.filter(x => x.category === cat);
        const catDone = list.filter(x => trainingUI.completed[x.id]).length;
        const isSelected = trainingUI.lastCategory === cat;
        const state = getCategoryLockState(cat, dayExercises);
        const disabled = state === 'no_asignada' || state === 'locked';
        const countText = state === 'no_asignada' ? 'No asignado'
          : state === 'locked' ? 'Bloqueado'
          : `${catDone}/${list.length} ejercicio${list.length === 1 ? '' : 's'}`;
        return `<button class="category-tile ${isSelected ? 'selected' : ''}" ${disabled ? 'disabled' : ''} onclick="openTrainingCategory('${cat}')">
          ${state === 'locked' ? '<span style="font-size:15px;">🔒</span>' : categoryIcon(cat)}
          <div class="label">${CATEGORY_LABELS[cat]}</div>
          <div class="count">${countText}</div>
        </button>`;
      }).join('')}
    </div>
```

(Only the tile body changed: `list.length ? '' : 'disabled'` is replaced by `disabled` derived from `state`; the icon is conditionally 🔒 for `locked`; the count text has 3 branches instead of 2.)

- [ ] **Step 2: Add the helper text under the completion button**

The current code is:

```js
      ${alreadyMarked
        ? '<div style="text-align:center;"><span class="status-pill-live">Entrenamiento del día ya completado esta semana</span></div>'
        : `<div style="text-align:center;margin-top:16px;"><button class="btn btn-primary" style="width:auto" ${allDone ? '' : 'disabled style="opacity:.4"'} onclick="markTrainingDayComplete(${day})">Marcar entrenamiento del día como completado</button></div>`}
```

Replace it with:

```js
      ${alreadyMarked
        ? '<div style="text-align:center;"><span class="status-pill-live">Entrenamiento del día ya completado esta semana</span></div>'
        : `<div style="text-align:center;margin-top:16px;">
            <button class="btn btn-primary" style="width:auto" ${allDone ? '' : 'disabled style="opacity:.4"'} onclick="markTrainingDayComplete(${day})">Marcar entrenamiento del día como completado</button>
            ${!allDone ? `<p style="font-size:11px;color:var(--ink-soft);margin-top:8px;">Completa ${joinWithY(incompleteAssignedCategoryLabels(dayExercises))} para desbloquear este botón.</p>` : ''}
          </div>`}
```

(The button itself is unchanged; only the added `<p>` helper text, shown only when `!allDone`.)

- [ ] **Step 3: Syntax-check**

```bash
node -e "
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
for (const s of scripts) { new Function(s); }
console.log('inline scripts parse OK:', scripts.length);
"
```
Expected: `inline scripts parse OK: 1` (do not add a `src=` substring filter — a prior task in this codebase found that filter produces a false negative).

- [ ] **Step 4: Manual verification (no browser access in this environment)**

A human needs to: open a test client's training day view where the day has exercises in only 2 of the 3 categories (e.g. no Cardio assigned), confirm the Cardio tile shows "No asignado" with no lock icon and is never counted in the helper text, confirm Strength stays "Bloqueado" (🔒) until Warm Up is fully completed, and confirm the helper text under the button updates correctly as categories complete.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
Wire sequential category lock states into the training-day tiles

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Modal (web) / full-screen (mobile) responsive treatment for the confirmation screen

**Files:**
- Modify: `index.html:217` (the `.session-confirmed-screen` CSS rule)

**Interfaces:**
- Produces: a `@media(min-width:901px)` block layered on top of the existing `.session-confirmed-screen` rule — no JS/markup change, no new class names, nothing for other tasks to consume.

- [ ] **Step 1: Add the modal media query**

The current rule (index.html:217) is:

```css
.session-confirmed-screen{position:fixed;inset:0;z-index:3000;background:#1B1712;display:flex;flex-direction:column;justify-content:space-between;padding:18% 24px 14%;box-sizing:border-box;overflow-y:auto;}
```

Add directly after it (same line context, new line):

```css
@media(min-width:901px){
  .session-confirmed-screen{inset:auto;top:50%;left:50%;transform:translate(-50%,-50%);width:400px;max-width:92vw;max-height:85vh;border-radius:20px;box-shadow:0 30px 80px rgba(0,0,0,.5);}
  .session-confirmed-screen::before{content:'';position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:-1;}
}
```

This reuses the project's existing mobile-shell breakpoint (`max-width:900px` at index.html:106, where the hamburger/mobile-topbar activates) as its mirror image (`min-width:901px`) — below 900px nothing changes (still full-screen `inset:0`); at 901px and above, the screen becomes a centered, rounded modal card with a dark backdrop behind it. No JavaScript changes: `renderNfcConfirmationScreen` keeps generating the exact same markup at every viewport width.

- [ ] **Step 2: Verify the rule was added correctly**

```bash
grep -n -A 4 "min-width:901px" index.html
```
Expected: shows the new block with both the `.session-confirmed-screen` modal rule and the `::before` backdrop rule.

- [ ] **Step 3: Manual verification (no browser access in this environment)**

A human needs to: open the confirmation screen at a browser width below 900px (confirm full-screen, unchanged from before) and above 900px (confirm it now appears as a centered rounded card with a dimmed backdrop behind it, and that closing/sharing still works identically at both sizes).

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
Render Sesión Confirmada as a centered modal on wide screens

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
