# Frases Card RR.SS — banco de frases para confirmación NFC y tarjeta Instagram

## Contexto

Hoy existen dos piezas de frases sueltas en el proyecto:

- `mindset_quotes` (tabla + CRUD admin en `/api/admin/quotes`, vista `admin-quotes` con label "Frases" en el nav de Administración): frases de mentalidad en 1ª persona, mostradas en el menú del módulo Entrenamiento. Se queda intacta, sin tocar.
- `pickMantra(viewKey)`: pool de mantras fijos en el frontend (sin admin, sin tabla), usado en varias pantallas (`personal-info`, `training`, `nutrition`, `rest`, `community`, `evolution`). La pantalla de confirmación NFC (`renderNfcConfirmationScreen`, index.html:2904) usa `pickMantra('training')` para la frase que muestra tras un escaneo.
- La tarjeta compartible de Instagram **no existe** en la app todavía (ninguna pantalla, ninguna función de generación de imagen).

Este spec agrega un banco de frases nuevo, independiente de `mindset_quotes`, que alimenta específicamente la pantalla de confirmación de sesión y (a futuro) la tarjeta de Instagram.

## Alcance

**Incluye:**
- Modelo de datos y tabla `phrases`.
- CRUD admin completo + endpoint de sorteo aleatorio.
- Sección nueva "Frases Card RR.SS" dentro de la vista admin `admin-quotes` existente (acordeón colapsado, separado de la sección de mindset_quotes).
- Vista previa con sorteo en vivo para ambos contextos.
- Reemplazo de `pickMantra('training')` por el nuevo banco en `renderNfcConfirmationScreen`.
- Semilla de las 8 frases de ejemplo provistas.

**No incluye (fuera de alcance, prompt futuro aparte):**
- La tarjeta de Instagram en sí (diseño visual, generación de imagen, descarga). Ese trabajo futuro solo necesitará llamar a `pickRandomPhrase('instagram')` / el endpoint equivalente — este spec deja esa pieza lista para consumir.
- Cualquier cambio a `mindset_quotes` o a `pickMantra` en las otras pantallas que la usan (personal-info, nutrition, rest, community, evolution) — siguen igual.

## Modelo de datos

Tabla nueva `phrases` (independiente de `mindset_quotes`; esquemas y consumidores distintos):

```sql
CREATE TABLE phrases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  context TEXT NOT NULL CHECK (context IN ('confirmacion', 'instagram', 'ambas')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

- `text`: sin comillas (se agregan al renderizar en frontend, igual que `mindset_quotes.quote`).
- `context`:
  - `confirmacion` → 2ª persona, solo pantalla de confirmación in-app.
  - `instagram` → 1ª persona, solo tarjeta compartible.
  - `ambas` → redactada en persona neutra, sale sorteada en cualquiera de las dos pantallas.
- `active`: el toggle del admin desactiva sin borrar (se saca de la rotación, no se pierde el texto).

## Backend

Nuevos endpoints, mismo patrón de auth que `/api/admin/quotes` (`authMiddleware, adminOnly`):

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/admin/phrases` | Lista completa (todas, activas e inactivas) para el admin. |
| POST | `/api/admin/phrases` | Crea `{ text, context }`, `active: true` por defecto. |
| PATCH | `/api/admin/phrases/:id` | Edita `text`, `context` y/o `active`. |
| DELETE | `/api/admin/phrases/:id` | Elimina definitivamente. |
| GET | `/api/admin/phrases/random?context=confirmacion\|instagram&exclude=<id>` | Sortea una frase válida para ese contexto (incluye `ambas`); si se pasa `exclude` y hay más de una opción disponible, no repite esa frase. Usado por el botón "🔀 Probar otra" de la vista previa admin. |

Función de rotación (server.js), igual a la especificada:

```js
function pickRandomPhrase(pool, context) {
  const eligible = pool.filter(p => p.active && (p.context === context || p.context === 'ambas'));
  if (eligible.length === 0) return null;
  return eligible[Math.floor(Math.random() * eligible.length)];
}
```

**Integración con `confirm-session`:** el endpoint `POST /api/clients/:id/training/confirm-session` (server.js:1158) hoy no manda ninguna frase — el frontend obtiene la suya localmente vía `pickMantra('training')`. Se agrega al payload de respuesta un campo `phrase` (texto o `null` si el banco de `confirmacion` está vacío), calculado con `pickRandomPhrase(await dbGet('phrases', { active: true }), 'confirmacion')`.

Si el banco de un contexto queda vacío (todas inactivas o eliminadas): la función retorna `null`, la pantalla omite esa línea sin romperse, y el submódulo admin muestra un aviso "No hay frases activas para este contexto" en la vista previa correspondiente.

## Frontend — Admin (`admin-quotes` / `renderAdminQuotes`)

Se agrega, debajo del acordeón existente de mindset_quotes, un `accordion-item` colapsado por defecto:

- **Header:** "Frases Card RR.SS" + subtítulo "Estas frases rotan aleatoriamente en la pantalla de confirmación de sesión y en la tarjeta compartible de Instagram."
- **Filtros:** pills clicables (Todas / Confirmación / Instagram / Ambas), filtran la lista renderizada sin nueva llamada a red (los datos ya están cargados).
- **+ Agregar frase:** mini-form inline (textarea + `<select>` de contexto), mismo patrón que "Nueva frase" de mindset_quotes.
- **Lista de frases**, por fila:
  - Texto en itálica, clase `.serif` (Fraunces).
  - Pill de contexto con clases CSS nuevas:
    - `.phrase-pill-confirmacion` → fondo `#EFF5E8`, texto `#5B7A4E`.
    - `.phrase-pill-instagram` → fondo `#F1EAF7`, texto `#8A5FA0`.
    - `.phrase-pill-ambas` → fondo `#FBF1E7`, texto `#B8794A`.
  - Toggle activo/inactivo: el proyecto no tiene un componente de switch nativo en ningún módulo existente, así que se implementa como un botón-pill clicable (`● Activa` / `○ Inactiva`), consistente con el resto de patrones de botón del proyecto — no se introduce un componente de switch nuevo.
  - Botones "Editar" / "Eliminar", reutilizando `.small-btn` (igual que en la lista de ejercicios).
- **Vista previa** (al final de la sección): dos mini-cards, "Pantalla de confirmación" y "Tarjeta de Instagram", cada una:
  - Muestra la frase actualmente sorteada para ese contexto (o el aviso de banco vacío).
  - Botón "🔀 Probar otra" → llama a `GET /api/admin/phrases/random` con el `context` correspondiente y el `id` de la frase mostrada como `exclude`.

## Frontend — Pantalla de confirmación NFC

En `renderNfcConfirmationScreen` (index.html:2904-2934):
- La línea `<p class="mantra">"${pickMantra('training')}"</p>` se reemplaza por la frase recibida en `result.phrase` (viene del payload de `confirm-session`).
- Si `result.phrase` es `null` (banco vacío), se omite el bloque `<p class="mantra">` completo — la pantalla no se rompe, solo no muestra esa línea.
- `pickMantra` no se toca ni se elimina — sigue en uso en las otras 5 pantallas que la llaman.

## Semilla inicial

Las 8 frases de ejemplo de la tabla original, insertadas en la migración de creación de la tabla `phrases`.

## Testing

- Backend: probar `pickRandomPhrase` con banco vacío, con solo un contexto, y con mezcla de `ambas` + específico — confirmar que nunca devuelve una frase `active: false` ni de un contexto no elegible.
- Backend: `GET /random` con `exclude` y una sola frase disponible → debe devolver esa frase igual (no puede evitar repetir si no hay alternativa).
- Frontend: confirmar que desactivar una frase la saca de la rotación sin borrarla (reaparece en la lista admin, no en el sorteo).
- Integración: escanear NFC con banco de `confirmacion` vacío → pantalla de confirmación no debe romperse, solo omite la frase.
