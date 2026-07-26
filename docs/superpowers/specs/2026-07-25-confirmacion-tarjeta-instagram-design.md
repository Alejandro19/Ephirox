# Sesión Confirmada (rediseño oscuro) + Tarjeta compartible de Instagram

## Contexto

Hoy `renderNfcConfirmationScreen` (index.html:2904-2934) es una pantalla clara (fondo crema, texto oscuro) que muestra: badge 📲, título, pill de racha, card con puntos de la semana, una frase de `pickMantra('training')`/`phrase` (banco Frases Card RR.SS, ya wireado), botón "Ver rutina de hoy" y botón "Cerrar". Solo se dispara desde el flujo NFC (`window._nfcConfirmResult` → vista `nfc-confirm`); el botón manual (`markTrainingDayComplete`, index.html:2856) hoy solo muestra un `showToast(...)` y se queda en la página.

Este spec reemplaza esa pantalla por un diseño oscuro tipo "take-over" (fondo `#1B1712`), elimina la fila de puntos/copas/medallas y el botón "Ver rutina de hoy" de ahí, y agrega un botón de compartir que genera una tarjeta de Instagram Stories (1080×1920 PNG) con el sistema de logros acumulado (medallas + copas) — que **solo existe visualmente en la tarjeta**, nunca en la pantalla in-app.

## Alcance

**Incluye:**
- Rediseño completo de la pantalla de confirmación (Parte 1), oscura, reutilizada por botón manual y NFC.
- El botón manual pasa a navegar a esta pantalla completa (deja de ser solo un toast).
- Generador de tarjeta de Instagram vía Canvas 2D (Parte 2): fondo, fila de logros, sello de racha, frase, marca.
- Fuente Fraunces variable embebida localmente (`fonts/Fraunces-Variable.woff2`, `fonts/Fraunces-Italic-Variable.woff2` — ya descargadas de Google Fonts, licencia SIL Open Font, en el repo).
- Lógica de medallas/copas (`streakWeeks % 4`, `Math.floor(streakWeeks / 4)`), pura y testeable.
- Compartir con Web Share API (`navigator.share` con archivo) si el dispositivo lo soporta; si no, descarga el PNG.
- Endpoint nuevo `GET /api/clients/:id/training/phrase?context=` para que la tarjeta pida su propia frase de contexto `instagram` al momento de compartir (la pantalla de confirmación ya trae la de `confirmacion` desde `confirm-session`, pero no la de `instagram`).

**No incluye:**
- Cambios a `confirmarSesionEntrenamiento`, `computeTrainingStreakState`, o cualquier lógica de racha/día_number ya existente — el pseudocódigo del prompt original (`confirmarSesionEntrenamiento(clientId, source)` con `{sessionsDoneThisWeek, sessionsRequiredThisWeek, streakWeeks}`) es ilustrativo; se usa la función y el shape de respuesta que ya existen en este proyecto (`streak: {sessionsDoneThisWeek, sessionsRequiredThisWeek, streakWeeks, ...}`, `phrase`, `alreadyConfirmedToday`, `weekJustCompleted`).
- El manejo de sesión no autenticada al escanear NFC (guardar acción pendiente → login → auto-confirmar) — **ya existe** (`captureIncomingDeepLink`/`consumePendingActionIfAny`, index.html:2874-2903) y no se toca.
- Cualquier cambio al banco de frases (Frases Card RR.SS) — se consume tal cual.

## Parte 1 — Pantalla "¡Sesión confirmada!"

Reemplaza por completo el HTML/CSS de `renderNfcConfirmationScreen` (index.html:2904-2934) y su llamada en `closeNfcConfirmationScreen` (sin más botón "Ver rutina de hoy" que navegaba a training).

**Fondo:** `#1B1712`, pantalla completa (mismo contenedor `.nfc-confirm-screen` renombrado/ajustado, o una clase nueva `.session-confirmed-screen` si el nombre ya no aplica — se decide en el plan).

**Estructura:** contenedor flex columna, `justify-content: space-between`, padding ~18% arriba / ~14% abajo, 4 bloques:

1. **Título**: "¡Sesión confirmada!", `Fraunces` 700, color claro (blanco/crema sobre el fondo oscuro).
2. **Anillo + racha**:
   - Anillo SVG reutilizando el patrón ya existente de `renderMiniRing` (index.html:2425-2436, `stroke-dasharray` sobre `<circle>`), pero con colores nuevos (arco `#D9A441` sobre base `#2B2F37`) y texto centrado: `${sessionsDoneThisWeek}/${sessionsRequiredThisWeek}` + label "ESTA SEMANA" debajo.
   - Debajo: 🔥 + `streakWeeks` en `Fraunces` 800 grande, color `#D9A441`, + label "semanas seguidas".
3. **Frase**: `phrase` (ya viene en la respuesta de `confirm-session`, contexto `confirmacion`) — `Fraunces` itálica, color `#D9BE8C`. Si `phrase` es `null`, se omite el bloque completo (el `space-between` se reajusta solo, sin dejar hueco).
4. **Botones**: "Cerrar" (fantasma, `flex:1`, cierra la pantalla — sin ninguna otra opción tipo "Ver rutina") + botón circular solo-ícono (glifo SVG nativo de compartir de iOS: cuadro con flecha hacia arriba), fondo `#D9A441`, dispara la Parte 2.

**Nunca incluir**: fila de puntos/copas/medallas de la semana, botón "Ver rutina de hoy", texto explicando el origen de la confirmación (ej. "Tocaste tu sticker en el gym").

**Disparadores**: tanto `markTrainingDayComplete` (botón manual) como `DEEP_LINK_ACTIONS['entrenamiento:confirmar']` (NFC) navegan a esta misma pantalla tras resolver `confirmarSesionEntrenamiento(source)` — nunca se duplica la lógica de racha.

## Parte 2 — Tarjeta de Instagram (diseño "sello/certificado")

**Disparador**: botón de compartir de la Parte 1.

**Formato de salida**: PNG 1080×1920px (proporción exacta de Instagram Stories), generado con `<canvas>` (sin DOM-to-image), fuente Fraunces embebida vía `FontFace` API cargando los `.woff2` locales — nunca depende de la red/Google Fonts en tiempo de ejecución.

**Lógica de acumulación** (pura, sin efectos secundarios, testeable con `node -e`):
```js
function computeAchievements(streakWeeks) {
  return {
    medalsInCurrentCycle: streakWeeks % 4,       // 0-3, del ciclo actual
    trophiesEarned: Math.floor(streakWeeks / 4), // de por vida, nunca se resetean
  };
}
```
- Medalla: 🎖️ (nunca 🏅). Copa: 🏆.
- Ejemplo: `streakWeeks=11` → `trophiesEarned=2` (🏆🏆), `medalsInCurrentCycle=3` (🎖️🎖️🎖️ + 1 slot vacío "○").

**Estructura visual** (base de diseño 260×462, escalado proporcional a 1080×1920 — el escalado es 1080/260 ≈ 4.1538×, todas las medidas de esta sección se multiplican por ese factor al dibujar en el canvas real):

- Fondo: `radial-gradient(circle at 50% 30%, #2A2118, #14100A 75%)` → `ctx.createRadialGradient`.
- Padding proporcional ~18.5% arriba / ~14.5% abajo (zona segura de IG Stories).
- 4 bloques, `space-between` verticalmente:
  1. **Fila de logros** (ancho completo, extremos opuestos, 11px→~46px escalado): izquierda "🏆🏆 copas" (`trophiesEarned` real) color `#E8C97D`; derecha medallas del ciclo + círculos vacíos pendientes (ej. "🎖️🎖️🎖️○"), 12px→~50px, letter-spacing 2px→~8px, opacity .85.
  2. **Sello circular**: círculo 150px→~623px, borde doble (`2px solid #E8C97D` exterior + `1px solid rgba(232,201,125,.4)` interior, inset 8px→~33px). Dentro: eyebrow "MI RACHA" (7.5px→~31px, uppercase, letter-spacing .12em, `#B8A88A`) + número `streakWeeks` `Fraunces` 800 42px→~175px color `#F8EFDD` + label "semanas seguidas" (9px→~37px, uppercase, `#E8C97D`).
  3. **Frase**: frase de contexto `instagram` (siempre 1ª persona), `Fraunces` itálica 14px→~58px, color `#F3E9D2`, max-width 200px→~830px, centrada.
  4. **Marca**: "La Tribu" (`Fraunces` 700, 13px→~54px, `#E8C97D`) + slogan "COMUNIDAD DE BIENESTAR Y ALTO RENDIMIENTO" (7.5px→~31px, letter-spacing .05em, `#9C8A67`) — dibujados como un solo bloque agrupado (no como dos elementos independientes en el `space-between` vertical de los 4 bloques).

**Regla de tamaño**: los tamaños de fuente/ícono de esta sección son los finales validados — cualquier ajuste de distribución vertical se hace en el padding del contenedor, nunca agrandando el contenido.

**Frase de la tarjeta**: la Parte 2 pide su propia frase (contexto `instagram`) al momento de generar la tarjeta, vía el endpoint nuevo `GET /api/clients/:id/training/phrase?context=instagram` — porque `confirm-session` (que dispara la Parte 1) solo trae la frase de contexto `confirmacion`; la tarjeta se genera después, al presionar compartir, no al confirmar.

**Compartir/descargar**: `canvas.toBlob('image/png')` → `File` → si `navigator.canShare({files:[...]})` es `true`, `navigator.share({files:[...]})` (abre el share sheet nativo); si no, se descarga el PNG (`<a download="la-tribu-racha.png">`).

## Backend

Nuevo endpoint, mismo patrón de guards que el resto del módulo Entrenamiento:

```
GET /api/clients/:id/training/phrase?context=confirmacion|instagram
  authMiddleware, ownerOrAdmin, requirePermission('training')
  → { phrase: string | null }
```
Implementación: `pickRandomPhrase(await dbGet('phrases', {active:true}), context)`, devuelve `.text` o `null`. Valida `context` contra `['confirmacion','instagram']` (400 si inválido) — la Parte 2 solo necesita `instagram`, pero se deja simétrico por si se reutiliza a futuro.

## Testing

- `computeAchievements`: casos `streakWeeks` = 0, 1, 3, 4, 5, 11, para confirmar el módulo y el piso correctos.
- Endpoint `training/phrase`: contexto inválido → 400; banco vacío para el contexto → `{phrase: null}`.
- Manual, sin navegador (no hay entorno de browser en esta sesión): confirmar que el botón manual navega a la pantalla completa (no solo toast) y que el botón de compartir genera/descarga un PNG — pendiente de que un humano lo pruebe en un dispositivo real, idealmente iOS para validar el share sheet nativo.
