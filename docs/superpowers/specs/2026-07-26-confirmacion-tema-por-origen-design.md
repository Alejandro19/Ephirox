# Fork de tema en "¡Sesión confirmada!" por origen (manual vs NFC) + ajustes menores

## Contexto

Ronda correctiva sobre `docs/superpowers/specs/2026-07-25-confirmacion-tarjeta-instagram-design.md` y `2026-07-26-bloqueo-secuencial-categorias-design.md` (ya implementadas y fusionadas a `main`). El usuario reportó que la última entrega no coincidía con lo pedido, y adjuntó `prompt_claude_code_confirmacion_y_tarjeta_final.md` (versión final y definitiva) junto con capturas de referencia.

Comparando el prompt final contra el código actual, la brecha real es: **hoy solo existe una pantalla de confirmación** (`.session-confirmed-screen`, siempre oscura `#1B1712`), usada tanto para el botón manual como para el escaneo NFC. El único fork existente es modal-vs-pantalla-completa por ancho de viewport (`@media(min-width:901px)`), nunca por origen. El prompt describe dos variantes:

- **NFC** (`pantalla_confirmacion_oscura.png`): oscura, la actual — sin cambios.
- **Manual/web** (`confirmacion_web_modal.png`): **clara**, paleta crema de la app, mostrada dentro del shell real (sidebar visible detrás, oscurecido).

Confirmado con el usuario: se bifurca por origen, no se reemplaza el oscuro.

## Alcance de esta ronda

1. Fork de tema claro/oscuro por `source` ('manual' | 'nfc') en la pantalla de confirmación.
2. Renombrar el botón final del día a "Completar Entrenamiento Día [X]".
3. Redirigir a la vista `training` (lista de días) al cerrar la pantalla de confirmación, sin importar el origen.
4. Confirmar (sin cambios de código) que el bypass de admin en el bloqueo secuencial de categorías ya cubre "funciones de permisos".
5. Fix del botón compartir (bug de red) — **ya implementado en este mismo turno**, fuera del ciclo de subagentes: el fetch de la frase para la tarjeta de Instagram ahora es no-fatal (try/catch propio), igual que el patrón ya usado en `confirm-session`. No requiere tarea de plan adicional, solo se documenta aquí para trazabilidad.

Explícitamente fuera de alcance: no se tocan `drawInstagramCard`, `computeAchievements`, `getCategoryLockState`, el esquema de datos, ni el breakpoint de 901px que decide modal-vs-pantalla-completa (ese ya funciona y no depende del tema).

## Diseño

### 1. `source` viaja con el resultado

`confirmarSesionEntrenamiento(source)` (index.html:2898) hoy descarta `source` una vez lo usa para la llamada al backend. Se agrega al objeto devuelto:

```js
async function confirmarSesionEntrenamiento(source) {
  const clientId = currentClientId();
  const { streak, alreadyConfirmedToday, phrase } = await api(`/api/clients/${clientId}/training/confirm-session`, { method: 'POST', body: JSON.stringify({ source, tz: clientTz() }) });
  const prevStreak = window._trainingStreak;
  const weekJustCompleted = !alreadyConfirmedToday && prevStreak
    && streak.sessionsDoneThisWeek >= streak.sessionsRequiredThisWeek
    && prevStreak.sessionsDoneThisWeek < prevStreak.sessionsRequiredThisWeek;
  window._trainingStreak = streak;
  return { streak, alreadyConfirmedToday, weekJustCompleted, phrase, source };
}
```

Los dos únicos llamadores (`markTrainingDayComplete` con `'manual'`, `consumePendingActionIfAny` vía `DEEP_LINK_ACTIONS['entrenamiento:confirmar']` con `'nfc'`) no cambian — ya pasan el `source` correcto, solo faltaba propagarlo de vuelta.

### 2. Tema claro vía clase modificadora

`renderNfcConfirmationScreen(el, result)` (index.html:3104) agrega `scs-light` al contenedor cuando `result.source === 'manual'`:

```js
const themeClass = result.source === 'manual' ? ' scs-light' : '';
...
<div class="session-confirmed-screen${themeClass}">
```

Nuevas reglas CSS (junto a `.session-confirmed-screen` existente, index.html:217), reutilizando tokens ya definidos en `:root` — sin hex nuevos:

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

`--streak-num` y `--flame` (dorado `#D9A441`/🔥) y el anillo de progreso (`#D9A441` sobre `#2B2F37`) no cambian entre temas — el dorado de marca y el anillo funcionan igual sobre crema que sobre oscuro, y así lo muestra `confirmacion_web_modal.png`. El botón circular de compartir (`.scs-share-btn`, fondo `#D9A441`, ícono `#1B1712`) tampoco cambia.

La regla `::before` del backdrop (index.html:220, ya existe para el modal ≥901px) se sobreescribe solo en su color cuando es tema claro — el modal oscuro sigue usando `rgba(0,0,0,.5)`.

Nada de esto toca el breakpoint `@media(min-width:901px)` que decide modal-centrado vs. pantalla-completa (index.html:219) — esa regla es ortogonal al tema y sigue aplicando igual a ambos.

### 3. Botón renombrado

`renderTrainingDay` (index.html:2818):

```js
onclick="markTrainingDayComplete(${day})">Completar Entrenamiento Día ${day}</button>
```

(reemplaza el texto fijo `Marcar entrenamiento del día como completado`, que no incluía el número de día).

### 4. Redirect a `training`

`closeNfcConfirmationScreen()` (index.html:3142):

```js
function closeNfcConfirmationScreen() {
  window._nfcConfirmResult = null;
  setView('training');
}
```

Reemplaza el cálculo `(CLIENT_NAV.find(item => item.visible(state)) || CLIENT_NAV[0]).key` — que hoy podía mandar a cualquier módulo según el primer ítem visible del menú del cliente, no necesariamente a Entrenamiento.

### 5. Permisos — sin cambios

`getCategoryLockState` ya usado en `renderTrainingDay` recibe `isAdmin` y lo respeta (los admins ya saltan el bloqueo secuencial completo). No se agrega código nuevo para este punto; el plan de implementación no incluye una tarea para esto.

## Testing

- Simulación en memoria: `confirmarSesionEntrenamiento` devuelve `source` intacto para ambos valores (`'manual'`, `'nfc'`).
- Manual, sin navegador (no hay entorno de browser en esta sesión): confirmar visualmente el tema claro en el disparo manual, el oscuro en NFC, el texto del botón con el número de día correcto, y que cerrar la pantalla de confirmación en cualquier origen deje al cliente en la lista de días de Entrenamiento — pendiente de que un humano lo pruebe.
