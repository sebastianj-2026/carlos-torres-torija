# Backlog — Carlos Torres Torija

> **Release en curso:** inversionistas / referenciadores.
> Rama `rediseno-referidor-inversionista`.
> El *por qué* de cada modificación vive en
> `docs/modulos/inversionistas/MODIFICACIONES.md`. Aquí solo están las tareas.

## Reglas de tamaño

Una tarea es atómica si cumple las 5:

1. Toca **un** módulo
2. Toca **≤5** archivos
3. **Pasa el gate por sí sola** — no "queda verde cuando termine la siguiente"
4. Cabe en un commit con mensaje de una línea
5. Si el título necesita "y", son dos tareas

Si no cumple → se parte. No se negocia.

## Estados
`⬜ pendiente` · `🟡 en curso` · `✅ hecha` · `🚫 bloqueada (regla sin definir)`

> Solo se escribe el criterio **extra**. Los del gate se dan por hecho.
> El backlog anterior (personas / comisiones como módulos paralelos) fue
> **descartado** el 2026-08-19 y vive en `_to_delete/`.

---

# Bloque A — desbloqueado, arranca ya

> Orden: `M1 → M2 → M9 → M10 → M11 → M3 → M4 → M5 → M6 → M7 → M8`
> **M2 y M11 tocan datos vivos.** Respaldo antes, verificación de conteos después.

### M1 · Migración: tabla `referenciadores`
- **Módulo:** inversionistas · **Tipo:** `data` · **Depende de:** —
- **Lee:** `docs/modulos/inversionistas/DATOS.md`
- **Extra al DoD:** tabla con sus dos índices. `inversionista_id` **nullable**
  (forma 3). Trae `.down.sql`. Aplicación a Neon es MANUAL vía
  `scripts/apply-migration.js` — documentar el paso en el commit.
- **Estado:** ✅ — `.up`/`.down` escritas. ⚠️ **Sin aplicar a Neon**: la aplica
  Sebastian a mano (comando en el commit).

### M2 · Migración: tabla `referencias` + copia de datos
- **Módulo:** inversionistas · **Tipo:** `data` · **Depende de:** M1
- **Lee:** `docs/modulos/inversionistas/DATOS.md`
- **Extra al DoD:** los tres constraints (`ref_origen_coherente`,
  `ref_unica_inversion`, `ref_unica_prestamo`). Copia las filas vivas de
  `inversiones.referenciador_id` a `referencias`. La columna vieja **se marca
  deprecada, NO se borra**. Trae `.down.sql`.
- **⚠️ Datos vivos:** respaldo antes. Después: `COUNT(*)` de inversiones con
  referenciador debe ser idéntico antes y después. Si no cuadra, `.down.sql`.
- **Estado:** ✅ — tabla + 3 constraints + índice + deprecación escritos.
  **Copia diferida:** hoy hay **0 filas** con `referenciador_id` (verificado en
  Neon); el copiado real exige puente `inversionista→referenciador` + escala de
  tasa (M11), sin definir. La migración trae una **guarda** que falla si aparecen
  filas. ⚠️ **Sin aplicar a Neon.**

### M9 · Migración: `numero_cuenta` y `banco` en inversionistas
- **Módulo:** inversionistas · **Tipo:** `data` · **Depende de:** —
- **Lee:** `docs/modulos/inversionistas/DATOS.md`
- **Extra al DoD:** ambas columnas **opcionales**. Nada las vuelve obligatorias.
  Trae `.down.sql`.
- **Estado:** ⬜

### M10 · Migración: quitar `asignado_a` de inversionistas
- **Módulo:** inversionistas · **Tipo:** `data` · **Depende de:** —
- **Lee:** `docs/modulos/inversionistas/DATOS.md`
- **Extra al DoD:** antes del `DROP COLUMN`, verificar con `grep` que **nada** en
  backend ni frontend lea `asignado_a`. Si hay datos, respaldarlos en el commit.
  Migración propia, con `.down.sql`.
- **Estado:** ⬜

### M11 · Migración: unificar escala de `tasa_referenciador`
- **Módulo:** inversionistas · **Tipo:** `data` · **Depende de:** M2
- **Lee:** `docs/modulos/inversionistas/DATOS.md` (M6)
- **Extra al DoD:** `NUMERIC(6,4)` → `NUMERIC(5,2)`, valores × 100.
  `0.0050 → 0.50`. Después de esto **todo el sistema** usa porcentaje con 2
  decimales: `monto = base * tasa / 100`. Trae `.down.sql`.
- **⚠️ Convierte datos:** respaldo antes. Después, verificar cada fila
  convertida a mano contra su valor original.
- **Estado:** ⬜

### M3 · Alta y edición de referenciador
- **Módulo:** inversionistas · **Tipo:** `logic` · **Depende de:** M1
- **Lee:** `docs/modulos/inversionistas/MODULO.md` + `REGLAS.md`
- **Extra al DoD:** `POST`/`PATCH`/`GET /api/referenciadores`. **Reusa** el
  formulario de inversionista, no lo duplica. Baja por cambio de estado, nunca
  `DELETE` (P6). Montos y tasas como string en el JSON.
- **Estado:** ⬜

### M4 · Ligar referenciador a inversión o préstamo
- **Módulo:** inversionistas · **Tipo:** `logic` · **Depende de:** M2, M3
- **Lee:** `docs/modulos/inversionistas/MODULO.md` + `REGLAS.md` (P3, P4)
- **Extra al DoD:** `POST`/`PATCH /api/referencias`. Opcional en los dos
  orígenes. **No hereda** el referenciador de una inversión anterior (P4).
  Rechaza el segundo referenciador del mismo origen (P3) con error en español.
- **Estado:** ⬜

### M5 · Lista con filtro de las tres formas de ganar
- **Módulo:** inversionistas · **Tipo:** `ui` · **Depende de:** M3
- **Lee:** `docs/DISENO.md` + `docs/modulos/inversionistas/FLUJOS.md`
- **Extra al DoD:** el filtro es lo primero que se ve, no un menú escondido.
  Forma derivada de `inversionista_id` (NULL → 3, lleno → 2). En 375px la tabla
  se vuelve tarjetas.
- **Estado:** ⬜

### M6 · Columnas de deuda en la lista
- **Módulo:** inversionistas · **Tipo:** `ui` · **Depende de:** M5
- **Lee:** `docs/DISENO.md` + `docs/modulos/inversionistas/FLUJOS.md`
- **Extra al DoD:** *se le debe* y *al corriente*. Orden por defecto: se le debe
  descendente. **Mientras M12 esté bloqueada muestran `—`, nunca `0.00`.**
- **Estado:** ⬜

### M7 · Detalle con desglose por origen
- **Módulo:** inversionistas · **Tipo:** `ui` · **Depende de:** M4, M6
- **Lee:** `docs/DISENO.md` + `docs/modulos/inversionistas/FLUJOS.md`
- **Extra al DoD:** una fila **por origen**, nunca agregado por persona (R16).
  Tres totales arriba. Sin botón de pagar — eso es cuentas por pagar.
- **Estado:** ⬜

### M8 · Alerta de inversión activa sin préstamo ligado
- **Módulo:** inversionistas · **Tipo:** `ui` · **Depende de:** M5
- **Lee:** `docs/DISENO.md` + `docs/modulos/inversionistas/FLUJOS.md`
- **Extra al DoD:** avisa, **no bloquea**. No cambia estados ni impide guardar.
- **Estado:** ⬜

---

# Bloque B — motor de comisiones · 🚫 BLOQUEADO

> **Ninguna arranca hasta cerrar los 3 ⛔ con Carlos.**
> **Lee (todas las de este bloque):** `docs/modulos/comisiones-motor/REGLAS.md`.
> Ese archivo tiene las 3 marcas sin definir y por eso el gate lo rechaza. A
> propósito. Hoja de junta: `docs/PARA-CARLOS-referenciadores.md`.
>
> Las reglas de **estructura** (P1–P7) viven en
> `docs/modulos/inversionistas/REGLAS.md` y están completas — el Bloque A no
> depende de nada de aquí.

### M12 · Migración: tabla `devengos` + índice de idempotencia
- **Tipo:** `data` · **Depende de:** M2 + ⛔1 ⛔2 ⛔3
- **Extra al DoD:** `devengos_idempotente` UNIQUE a nivel BD (R20),
  `dev_un_beneficiario`, `dev_no_sobrepago`, índice FIFO. Con `.down.sql`.
- **Estado:** 🚫

### M13 · Generación mensual de devengos, idempotente
- **Tipo:** `motor` · **Depende de:** M12
- **Extra al DoD:** correr el corte dos veces deja **el mismo estado** (R20).
  Congela `base_capital` y `tasa` al generarse (R18).
- **Estado:** 🚫

### M14 · Cálculo sobre capital vigente (base viva)
- **Tipo:** `motor` · **Depende de:** M13
- **Extra al DoD:** base = `inversiones.monto_actual` o monto vigente del
  préstamo (R3). Moratorios fuera del reparto (R8). Casos resueltos primero, en
  rojo, antes del motor.
- **Estado:** 🚫

### M15 · Aplicación FIFO por origen
- **Tipo:** `motor` · **Depende de:** M13
- **Extra al DoD:** R16 es lo más fácil de implementar mal. El dinero del
  préstamo A **no** cubre lo del préstamo B. Caso de dos préstamos del mismo
  referenciador, uno pagando, en verde.
- **Estado:** 🚫

### M16 · Lectura de montos con Decimal, sin `parseFloat`
- **Tipo:** `logic` · **Depende de:** M13
- **Extra al DoD:** aplica **solo a lo nuevo** (devengos y aplicación de pagos).
  El legacy no se refactoriza en esta tarea. Montos leídos como string.
- **Estado:** 🚫

---

# Bloque C — cuentas por pagar inversionistas · 🚫 BLOQUEADO

### M17 · Aceptar concepto `comision` además de `rendimiento`
- **Tipo:** `logic` · **Depende de:** M12 · **Estado:** 🚫
- **Extra al DoD:** un pago por concepto, no se juntan (R17).

### M19 · Registrar pago con forma, cuenta, comprobante y autorización
- **Tipo:** `logic` · **Depende de:** M15, M17 · **Estado:** 🚫
- **Extra al DoD:** `autorizado_por` y comprobante **obligatorios** (R19).
  `pago_cuenta_coherente`: si no fue efectivo, exige cuenta.

### M18 · Pantalla de pendientes
- **Tipo:** `ui` · **Depende de:** M19 · **Estado:** 🚫
- **Extra al DoD:** Carlos selecciona, el sistema no decide (R14). Dentro de la
  línea el periodo no se elige: FIFO forzado (R15). Totales en centavos enteros.

### M20 · Filtro inversionistas / referenciadores
- **Tipo:** `ui` · **Depende de:** M18 · **Estado:** 🚫

---

## Conteo

| Bloque | Tareas | Estado |
|---|---|---|
| A — inversionistas/referenciadores | 11 | 2 ✅ · 9 ⬜ (siguiente: M9) |
| B — motor de comisiones | 5 | 🚫 bloqueado |
| C — cuentas por pagar | 4 | 🚫 bloqueado |

## Lo que se decide antes de tocar el Bloque B
Las 3 respuestas de Carlos desbloquean 9 tareas.
