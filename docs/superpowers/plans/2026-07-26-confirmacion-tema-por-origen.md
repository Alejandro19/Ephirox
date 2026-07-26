# Fork de tema en "¡Sesión confirmada!" por origen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** La pantalla "¡Sesión confirmada!" muestra un tema claro (paleta crema de la app) cuando se dispara manualmente desde dentro de la app, y mantiene el tema oscuro `#1B1712` actual cuando se dispara por escaneo NFC — hoy usa siempre el oscuro para ambos orígenes. Además, el botón final de un día incluye el número de día, y cerrar la pantalla de confirmación siempre regresa a la lista de días de Entrenamiento.

**Architecture:** Cambios puntuales en `index.html` únicamente (vanilla JS + template strings, sin build step). `confirmarSesionEntrenamiento(source)` empieza a devolver `source` en su resultado; `renderNfcConfirmationScreen` lee `result.source` para decidir una clase CSS modificadora (`scs-light`); nuevas reglas CSS reutilizan tokens `:root` ya existentes (`--cream`, `--ink`, `--ink-soft`, `--line`) — no se agregan colores nuevos. El breakpoint de 901px que decide modal-vs-pantalla-completa no se toca.

**Tech Stack:** vanilla JS (`index.html`), CSS con custom properties ya definidas en `:root` (index.html:11-19). No existe framework de test en este proyecto — verificación vía `node -e` (parseo de los `<script>` inline) y verificación manual sin navegador (no hay entorno de browser en esta sesión).

## Global Constraints

- Reutilizar los tokens de color ya definidos en `:root` (`--cream:#FBF7F1`, `--ink:#2B2420`, `--ink-soft:#6B6058`, `--line:#E9E1D6`) para el tema claro — nunca introducir valores hex nuevos.
- El dorado de marca `#D9A441` (anillo de progreso, número de racha, botón de compartir) y el fondo del anillo `#2B2F37` no cambian entre temas — se ven igual sobre crema que sobre oscuro.
- No tocar `@media(min-width:901px)` (index.html:219) — decide modal-vs-pantalla-completa, es ortogonal al tema y ya funciona.
- No tocar `drawInstagramCard`, `computeAchievements`, `getCategoryLockState`, ni el esquema de datos — fuera de alcance de esta ronda.
- Texto del botón final exacto: `Completar Entrenamiento Día ${day}` (con el número de día real, sin corchetes literales).

---

### Task 1: Propagar `source` y bifurcar el tema de la pantalla de confirmación

**Files:**
- Modify: `index.html:217-236` (bloque CSS de `.session-confirmed-screen` y sus hijos `.scs-*`)
- Modify: `index.html:2898-2907` (`confirmarSesionEntrenamiento`)
- Modify: `index.html:3104-3141` (`renderNfcConfirmationScreen`)

**Interfaces:**
- Consumes: nada de tareas previas (primera tarea del plan).
- Produces: `confirmarSesionEntrenamiento(source)` ahora devuelve `{ streak, alreadyConfirmedToday, weekJustCompleted, phrase, source }` (antes omitía `source`). Task 2 no depende de este cambio, pero debe seguir leyendo el mismo shape.

- [ ] **Step 1: Agregar `source` al valor devuelto por `confirmarSesionEntrenamiento`**

En `index.html`, dentro de `confirmarSesionEntrenamiento` (alrededor de la línea 2898), el `return` actual es:

```js
  return { streak, alreadyConfirmedToday, weekJustCompleted, phrase };
```

Reemplazar por:

```js
  return { streak, alreadyConfirmedToday, weekJustCompleted, phrase, source };
```

(La firma de la función y todo lo demás dentro de ella no cambia — `source` ya es un parámetro de la función, solo faltaba incluirlo en el objeto devuelto.)

- [ ] **Step 2: Agregar las reglas CSS del tema claro**

En `index.html`, inmediatamente después de la regla existente `.scs-share-btn:disabled{...}` (línea 236, la última regla `.scs-*` del bloque), agregar:

```css
.session-confirmed-screen.scs-light{background:var(--cream);}
.session-confirmed-screen.scs-light::before{background:rgba(43,36,32,.35);}
.scs-light .scs-title{color:var(--ink);}
.scs-light .scs-ring-fraction{color:var(--ink);}
.scs-light .scs-ring-label{color:var(--ink-soft);}
.scs-light .scs-streak-label{color:var(--ink-soft);}
.scs-light .scs-phrase{color:var(--ink-soft);}
.scs-light .scs-actions .btn-ghost{border-color:var(--line);color:var(--ink);}
```

No se agrega ninguna regla para `.scs-ring-wrap` (el SVG del anillo, dorado sobre `#2B2F37`), `.scs-streak-num` (dorado), `.scs-flame`, ni `.scs-share-btn` — estos se ven iguales en ambos temas por diseño (Global Constraints).

- [ ] **Step 3: Aplicar la clase de tema en `renderNfcConfirmationScreen`**

En `index.html`, dentro de `renderNfcConfirmationScreen(el, result)` (línea 3104), inmediatamente después de la línea `const { streak, phrase } = result;` (línea 3106), agregar:

```js
  const themeClass = result.source === 'manual' ? ' scs-light' : '';
```

Luego, en el template string de esa misma función, cambiar la apertura del contenedor (línea 3113):

```html
    <div class="session-confirmed-screen">
```

por:

```html
    <div class="session-confirmed-screen${themeClass}">
```

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
Expected: `inline scripts parse OK: 1` (no filtrar por `src=` — un task anterior de este proyecto encontró que ese filtro da un falso negativo).

- [ ] **Step 5: Manual verification (no browser access in this environment)**

Un humano necesita: hacer clic en el botón manual de completar un día de entrenamiento y confirmar que la pantalla "¡Sesión confirmada!" se ve con fondo crema/tema claro (no oscura); luego, con un cliente distinto (o el mismo, en otro día disponible), simular/hacer un escaneo NFC real y confirmar que esa pantalla sigue viéndose oscura `#1B1712` como antes. Confirmar en ambos casos que el anillo, el número de racha y el botón de compartir se ven dorados sobre su fondo respectivo.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "Fork session-confirmed screen theme by source (light for manual, dark for NFC)"
```

---

### Task 2: Renombrar el botón final del día y corregir el redirect al cerrar

**Files:**
- Modify: `index.html:2818` (botón final dentro de `renderTrainingDay`)
- Modify: `index.html:3142-3145` (`closeNfcConfirmationScreen`)

**Interfaces:**
- Consumes: nada de Task 1 — cambio independiente en el mismo archivo.
- Produces: nada consumido por tareas posteriores (última tarea del plan).

- [ ] **Step 1: Renombrar el botón**

En `index.html`, línea 2818, el botón actual:

```html
<button class="btn btn-primary" style="width:auto" ${allDone ? '' : 'disabled style="opacity:.4"'} onclick="markTrainingDayComplete(${day})">Marcar entrenamiento del día como completado</button>
```

Cambiar únicamente el texto visible del botón:

```html
<button class="btn btn-primary" style="width:auto" ${allDone ? '' : 'disabled style="opacity:.4"'} onclick="markTrainingDayComplete(${day})">Completar Entrenamiento Día ${day}</button>
```

(`day` ya está en scope en esa función — es el mismo valor usado en `onclick="markTrainingDayComplete(${day})"` en la misma línea.)

- [ ] **Step 2: Corregir el destino de `closeNfcConfirmationScreen`**

En `index.html`, la función actual (línea 3142):

```js
function closeNfcConfirmationScreen() {
  window._nfcConfirmResult = null;
  setView((CLIENT_NAV.find(item => item.visible(state)) || CLIENT_NAV[0]).key);
}
```

Reemplazar por:

```js
function closeNfcConfirmationScreen() {
  window._nfcConfirmResult = null;
  setView('training');
}
```

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
Expected: `inline scripts parse OK: 1`.

- [ ] **Step 4: Manual verification (no browser access in this environment)**

Un humano necesita: abrir un día de entrenamiento con las 3 categorías asignadas, completarlas todas, y confirmar que el botón final dice "Completar Entrenamiento Día [número real]" (ej. "Completar Entrenamiento Día 2"). Luego, desde la pantalla "¡Sesión confirmada!" (cualquier origen), presionar "Cerrar" y confirmar que el cliente vuelve a la lista de días de Entrenamiento, no a otro módulo.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "Rename day-complete button with day number, redirect to training list on close"
```
