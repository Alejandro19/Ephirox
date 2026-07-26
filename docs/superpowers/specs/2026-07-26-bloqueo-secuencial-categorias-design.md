# Bloqueo secuencial de categorías por día + modal/fullscreen responsive en Sesión Confirmada

## Contexto

Este spec cubre las dos piezas nuevas de un prompt más amplio cuyas otras partes (Parte 1: pantalla "¡Sesión confirmada!", Parte 2: tarjeta de Instagram, Parte 5: historial de logros admin) ya están implementadas y fusionadas a `main` (ver `docs/superpowers/specs/2026-07-25-confirmacion-tarjeta-instagram-design.md`). Aquí solo se diseña lo que falta:

- **Parte 4 del prompt**: bloqueo secuencial de categorías (Warm Up/Strength/Cardio) dentro de la vista de un día de entrenamiento.
- Un ajuste a la pantalla de confirmación ya existente: modal centrado en web, pantalla completa en móvil (hoy siempre es pantalla completa).

## Estado actual (investigado, sin cambios de esquema necesarios)

- `renderTrainingDay` (index.html:2737-2784) siempre renderiza las 3 categorías fijas (`Object.keys(CATEGORY_LABELS)`), sin ningún orden ni bloqueo entre ellas — solo se deshabilitan si no tienen ejercicios (`list.length ? '' : 'disabled'`), mostrando "Sin ejercicios".
- No existe ningún campo de "categoría asignada/no asignada" en `clients` ni `exercises` (`schema.sql`) — solo `training_days` (cuántos días activos por semana).
- El botón final "Marcar entrenamiento del día como completado" ya solo se habilita cuando todos los ejercicios existentes del día están completos (`allDone`, index.html:2753) — como las categorías sin ejercicios no aportan al conteo, esto **ya excluye correctamente** las categorías no asignadas del cálculo, sin cambios.
- El breakpoint móvil del shell responsive ya establecido es `max-width:900px` (index.html:106) — mismo punto donde hoy cambia a topbar/drawer móvil.

## Decisión de diseño: "asignada" se deriva, no se declara

Una categoría está **asignada** a un cliente en un día si tiene ≥1 ejercicio (`exercises` con ese `client_id`, `day_number`, `category`) — exactamente el dato que ya existe hoy. No se crea tabla ni columna nueva. Agregar el primer ejercicio de una categoría es, en efecto, "asignarla". Esto evita un concepto de datos paralelo que pudiera desincronizarse de los ejercicios reales.

## Parte 4 — Bloqueo secuencial por categoría

**Orden fijo, filtrado a las asignadas:** `['warmup', 'strength', 'cardio'].filter(cat => dayExercises.some(x => x.category === cat))`.

**Estado de cada categoría** (dentro de `renderTrainingDay`):
- **No asignada** (`list.length === 0`): tile gris, deshabilitada, **sin** ícono de candado, texto **"No asignado"** (reemplaza el actual "Sin ejercicios"). Se muestra siempre — nunca se oculta — para que el cliente vea la estructura completa del día. Queda fuera del cálculo de orden por completo.
- **Done**: todos los ejercicios de esa categoría están en `trainingUI.completed`.
- **Active**: es la primera categoría asignada sin completar, o la asignada anterior en el orden ya está `done`. Se comporta como hoy (tile clickeable, sin disabled).
- **Locked**: asignada, pero la categoría asignada anterior en el orden todavía no está `done`. Tile gris, deshabilitada, **con** ícono 🔒 y texto **"Bloqueado"**. Reutiliza el mismo estilo `.category-tile:disabled` ya existente — no hace falta CSS nuevo, solo cambia qué ícono/texto se muestra.

**Texto de ayuda bajo el botón final**, visible solo mientras está deshabilitado, listando únicamente las categorías **asignadas** que faltan por completar (nunca menciona una categoría no asignada) — ej. "Completa Warm Up y Strength para desbloquear este botón." si Cardio no está asignado ese día.

**No cambia:** `allDone`/`doneCount`/`totalCount` (ya correctos), `markTrainingDayComplete`, `confirmarSesionEntrenamiento`, el bloqueo día-a-día (`isDayUnlocked`, semanal), ni la persistencia de `trainingUI.completed` (sigue en memoria de sesión, sin cambios).

## Modal (web) / pantalla completa (móvil) en Sesión Confirmada

`.session-confirmed-screen` (index.html:217) hoy es siempre `position:fixed;inset:0` de borde a borde. Se agrega una media query `@media(min-width:901px)` (justo por encima del breakpoint móvil existente) que:
- Centra el contenedor como un modal de ancho/alto máximos fijos (ej. `max-width:400px;max-height:85vh;border-radius:20px;` — proporción similar al `max-width:400px` que ya usaban las versiones anteriores de esta pantalla), en vez de `inset:0`.
- Agrega un fondo oscurecido detrás (backdrop) cubriendo el resto del viewport — un `::before` o un elemento hermano fijo con `background:rgba(0,0,0,.5)`.
- Por debajo de 900px, el comportamiento actual (pantalla completa, sin backdrop) no cambia.

No se toca ningún JS de esta pantalla — es un cambio puramente CSS condicional sobre el mismo markup que ya genera `renderNfcConfirmationScreen`.

## Testing

- Simulación en memoria (sin DOM) de `getCategoryState`-equivalente: casos con las 3 categorías asignadas, con solo 2 asignadas (ej. sin Cardio), con una categoría de en medio no asignada (ej. sin Strength pero con Warm Up y Cardio — el orden efectivo pasa a ser Warm Up → Cardio) — confirmar que el orden y los estados (`done`/`active`/`locked`/`no_asignada`) sean correctos en cada caso.
- Manual, sin navegador (no hay entorno de browser en esta sesión): confirmar visualmente el bloqueo secuencial en la vista de un día real, y el modal vs. pantalla completa cruzando el breakpoint de 900px — pendiente de que un humano lo pruebe.
