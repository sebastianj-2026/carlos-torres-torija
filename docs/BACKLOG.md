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

> Orden: `M1 → M2 → M9 → M10a → M10b → M10 → M11 → M3 → M4 → M5 → M6 → M7 → M8`
> **M2 y M11 tocan datos vivos.** Respaldo antes, verificación de conteos después.

### M1 · Migración: tabla `referenciadores`
- **Módulo:** inversionistas · **Tipo:** `data` · **Depende de:** —
- **Lee:** `docs/modulos/inversionistas/DATOS.md`
- **Extra al DoD:** tabla con sus dos índices. `inversionista_id` **nullable**
  (forma 3). Trae `.down.sql`. Aplicación a Neon es MANUAL vía
  `scripts/apply-migration.js` — documentar el paso en el commit.
- **Estado:** ✅ — `.up`/`.down` escritas. **Aplicada a Neon el 2026-09-09.**

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
  filas. **Aplicada a Neon el 2026-09-09.**

### M9 · Migración: `numero_cuenta` y `banco` en inversionistas
- **Módulo:** inversionistas · **Tipo:** `data` · **Depende de:** —
- **Lee:** `docs/modulos/inversionistas/DATOS.md`
- **Extra al DoD:** ambas columnas **opcionales**. Nada las vuelve obligatorias.
  Trae `.down.sql`.
- **Estado:** ✅ — `numero_cuenta`/`banco` opcionales, con `.down.sql`. **Aplicada a Neon el 2026-09-09.**

> **M10 se partió en tres (2026-08-19).** El `DROP` no podía correr: ~8 archivos
> en backend y frontend leen `asignado_a`. Primero deja de leerse (M10a, M10b),
> luego se dropea (M10). Ver decisión en `ESTADO.md`.

### M10a · Backend deja de leer `asignado_a`
- **Módulo:** inversionistas · **Tipo:** `logic` · **Depende de:** —
- **Lee:** `docs/modulos/inversionistas/MODULO.md` + `REGLAS.md`
- **Archivos (2):** `controllers/inversionistas.controller.ts` (filtro, SELECT,
  INSERT, UPDATE) + `models/inversionista.model.ts` (tipo `AsignadoA` + campos).
- **Extra al DoD:** el endpoint sigue funcionando sin el campo. La **columna
  sigue en la DB** (no se dropea aquí). Verde por sí solo.
- **Estado:** ✅ — controller + model sin `asignado_a`. `gate.sh`: `--passWithNoTests`.

### M10b · Frontend deja de leer `asignado_a`
- **Módulo:** inversionistas · **Tipo:** `ui` · **Depende de:** M10a
- **Lee:** `docs/DISENO.md` + `docs/modulos/inversionistas/FLUJOS.md`
- **Archivos (6):** `types/inversionista.types.ts`, `services/inversionistasService.ts`,
  `components/inversionistas/TablaInversionistas.tsx`,
  `pages/inversionistas/{FormularioInversionista,ListaInversionistas,PerfilInversionista}.tsx`.
- **Extra al DoD:** los 6 van **juntos** — el tipo compartido `AsignadoA` los
  acopla; separarlos deja imports colgando y el build rojo. Se quita el filtro, la
  columna, el campo del alta y el dato del perfil. Excepción justificada a ≤5.
- **Estado:** ✅ — 6 archivos sin `asignado_a`; typecheck + compile verdes.

### M10 · Migración: quitar `asignado_a` de inversionistas
- **Módulo:** inversionistas · **Tipo:** `data` · **Depende de:** M10a, M10b
- **Lee:** `docs/modulos/inversionistas/DATOS.md`
- **Extra al DoD:** con M10a+M10b hechas, el `grep` de `asignado_a` debe volver
  limpio (fuera de docs). `DROP COLUMN` en su propia migración, con `.down.sql`.
  Si hay datos, respaldarlos en el commit.
- **Estado:** ✅ — `.up`/`.down` escritas. `.up` respalda valores no nulos en
  `_respaldo_asignado_a` antes del `DROP COLUMN IF EXISTS`; la reversa restaura
  estructura (CHECK fiel: `'sebastian'`,`'abril'`) + datos. Grep de `asignado_a`
  en código limpio. **Aplicada a Neon el 2026-09-09.**

### M11 · Migración: unificar escala de `tasa_referenciador`
- **Módulo:** inversionistas · **Tipo:** `data` · **Depende de:** M2
- **Lee:** `docs/modulos/inversionistas/DATOS.md` (M6)
- **Extra al DoD:** `NUMERIC(6,4)` → `NUMERIC(5,2)`, valores × 100.
  `0.0050 → 0.50`. Después de esto **todo el sistema** usa porcentaje con 2
  decimales: `monto = base * tasa / 100`. Trae `.down.sql`.
- **⚠️ Convierte datos:** respaldo antes. Después, verificar cada fila
  convertida a mano contra su valor original.
- **Estado:** ✅ — `.up` respalda valores no nulos en `_respaldo_tasa_referenciador`
  y convierte `NUMERIC(6,4)→(5,2)` (`× 100`); reversa simétrica (`/ 100`) suelta el
  respaldo. Guardas de idempotencia por `numeric_scale`. **0 filas hoy** (verificado
  en Neon). **Aplicada a Neon el 2026-09-09.**

### M3 · Alta y edición de referenciador
- **Módulo:** inversionistas · **Tipo:** `logic` · **Depende de:** M1
- **Lee:** `docs/modulos/inversionistas/MODULO.md` + `REGLAS.md`
- **Extra al DoD:** `POST`/`PATCH`/`GET /api/referenciadores`. **Reusa** el
  formulario de inversionista, no lo duplica. Baja por cambio de estado, nunca
  `DELETE` (P6). Montos y tasas como string en el JSON.
- **Estado:** ✅ — `GET`/`POST`/`GET/:id`/`PATCH /api/referenciadores`. Envelope
  `{ success, data, error }` (contrato de `MODULO.md`). Filtro `forma=2|3` derivado
  de `inversionista_id` (forma 1 no es referenciador → fuera de este endpoint, es
  M5). Baja por `activo` (P6). `GET/:id` **sin** join a `referencias` (llega en M4;
  la tabla no está en Neon). 4 archivos.

### M4 · Ligar referenciador a inversión o préstamo
- **Módulo:** inversionistas · **Tipo:** `logic` · **Depende de:** M2, M3
- **Lee:** `docs/modulos/inversionistas/MODULO.md` + `REGLAS.md` (P3, P4)
- **Extra al DoD:** `POST`/`PATCH /api/referencias`. Opcional en los dos
  orígenes. **No hereda** el referenciador de una inversión anterior (P4).
  Rechaza el segundo referenciador del mismo origen (P3) con error en español.
- **Estado:** ✅ — `POST`/`PATCH /api/referencias`. Coherencia de origen validada
  en código; P3 vía captura del `UNIQUE` (23505) → 409 en español. `fecha_inicio`
  la pone el servidor (`CURRENT_DATE`). `PATCH` sólo estado/tasa/fecha_fin/notas
  (R9), no mueve origen ni referenciador. `tasa` como string. 4 archivos.
  `referencias` aplicada a Neon el 2026-09-09 — el endpoint ya corre.

### M5 · Lista con filtro de las tres formas de ganar
- **Módulo:** inversionistas · **Tipo:** `ui` · **Depende de:** M3
- **Lee:** `docs/DISENO.md` + `docs/modulos/inversionistas/FLUJOS.md`
- **Extra al DoD:** el filtro es lo primero que se ve, no un menú escondido.
  Forma derivada de `inversionista_id` (NULL → 3, lleno → 2). En 375px la tabla
  se vuelve tarjetas.
- **Estado:** ✅ — filtro de 4 botones primero que todo; forma 1 = inversionistas
  sin fila en `referenciadores`, unión client-side (el UNION no existe como
  endpoint, decisión de M3). Baja por `activo` (P6) con confirmación de dos
  clics. "Referidos activos" muestra `—` (el backend no expone el conteo aún).
  Botón de alta deshabilitado hasta M22; detalle hasta M7. 5 archivos + ruta
  (App.tsx, del borrador previo). M1 aplicada a Neon el 2026-09-09 — corre en runtime.

### M6 · Columnas de deuda en la lista
- **Módulo:** inversionistas · **Tipo:** `ui` · **Depende de:** M5
- **Lee:** `docs/DISENO.md` + `docs/modulos/inversionistas/FLUJOS.md`
- **Extra al DoD:** *se le debe* y *al corriente*. Orden por defecto: se le debe
  descendente. **Mientras M12 esté bloqueada muestran `—`, nunca `0.00`.**
- **Estado:** ✅ — dos columnas + cifra grande en tarjeta 375px; con motor
  bloqueado pintan `—` con tooltip, nunca `0.00` (los campos llegan `null` del
  service). Orden *se le debe* desc con comparación de NUMERIC como string (sin
  float); `null` empata → alfabético. Ramas con dato real ya escritas, se
  activan cuando el backend exponga los campos (Bloque B/C). 4 archivos.

### M7 · Detalle con desglose por origen
- **Módulo:** inversionistas · **Tipo:** `ui` · **Depende de:** M4, M6
- **Lee:** `docs/DISENO.md` + `docs/modulos/inversionistas/FLUJOS.md`
- **Extra al DoD:** una fila **por origen**, nunca agregado por persona (R16).
  Tres totales arriba. Sin botón de pagar — eso es cuentas por pagar.
- **Estado:** ✅ — `/referenciadores/:id` con encabezado (forma derivada, cuenta
  y banco a la mano), tres totales y desglose por origen en `—` con tooltip
  (motor bloqueado). Abrir origen: inversión → perfil del dueño
  (`origen_inversionista_id`, M24), préstamo → `/prestamos/:id`. Editar
  deshabilitado hasta M22; baja P6 con doble clic. La lista (M5) ya navega al
  detalle. 5 archivos.

### M8 · Alerta de inversión activa sin préstamo ligado
- **Módulo:** inversionistas · **Tipo:** `ui` · **Depende de:** M5
- **Estado:** ❌ **descartada (2026-09-09, Sebastian).** La liga se hace desde
  **préstamos** al crear el préstamo (`participantes_prestamo`, por
  inversionista); no existe liga por inversión en el schema y no hay inversiones
  "no ligadas" que detectar — la condición del banner no puede darse.

### M21 · Alinear el form legacy de referidor a la escala nueva
- **Módulo:** inversionistas · **Tipo:** `ui` · **Depende de:** M11
- **Lee:** `docs/DISENO.md` + `docs/modulos/inversionistas/FLUJOS.md`
- **Por qué:** M11 dejó `inversiones.tasa_referenciador` en `NUMERIC(5,2)` (`0.50`).
  `PerfilInversionista.tsx:140` todavía captura/manda la tasa en escala vieja
  (`0.0050`); una alta **después** de M11 se redondearía a `0.01`. Con 0 filas hoy
  no hay urgencia, pero se cierra antes de crear un referido por esa ruta.
- **Extra al DoD:** el form captura y muestra la tasa como % con 2 decimales
  (`0.50 = 0.5%`). El INSERT del controller ya es pass-through — no toca escala.
- **Estado:** ✅ — input limitado a 2 decimales, placeholder `0.50`, hint
  "0.50 = 0.5% mensual"; el valor viaja como string capturado (sin
  `String(parseFloat(...))`). 1 archivo (`PerfilInversionista.tsx`).

### M22 · Formulario de alta y edición de referenciador
- **Módulo:** inversionistas · **Tipo:** `ui` · **Depende de:** M3
- **Lee:** `docs/DISENO.md` + `docs/modulos/inversionistas/FLUJOS.md`
- **Por qué:** FLUJOS §2 quedó etiquetada "(M3)", pero M3 cerró como API pura
  (4 archivos backend); la pantalla nunca tuvo tarea. El botón "Nuevo
  referenciador" de M5 quedó deshabilitado con tooltip hasta que esto corra.
- **Extra al DoD:** **reusa** el formulario de inversionista, no lo duplica
  (P5). INE solo PDF vía `FileDropZone`; cuenta y banco nunca bloquean el
  guardado. En 375px la zona de arrastre se vuelve botón. Al terminar, habilita
  el botón de alta en la lista de M5.
- **Estado:** ✅ — `/referenciadores/nuevo` y `/:id/editar` con
  `FormularioReferenciador`, que reusa `Campo` del form de inversionista (P5) y
  `FileDropZone` con `accept` solo PDF (M25). Cuenta y banco opcionales, nunca
  bloquean. Botón de alta (M5) y Editar (M7) habilitados. **6 archivos —
  excepción a ≤5 autorizada por Sebastian** (habilitar botones sin form deja UI
  muerta; misma lógica que M10b).

### M25 · FileDropZone con prop `accept` opcional
- **Módulo:** shared · **Tipo:** `ui` · **Depende de:** —
- **Por qué:** M22 exige INE **solo PDF** rechazado antes de subir, vía
  `FileDropZone`; el componente aceptaba PDF/JPG/PNG fijo. Tocar
  `components/shared/` es tarea propia (prohibición 2) — se saca de M22.
- **Extra al DoD:** prop opcional `accept` (lista de MIME); **sin prop, el
  comportamiento actual no cambia** (PDF/JPG/PNG). Rechazo antes de subir, con
  mensaje en español; el texto de ayuda refleja los tipos permitidos.
- **Estado:** ✅ — prop `accept?: string[]` con default `PDF/JPG/PNG` (sin prop,
  cero cambio de conducta); rechazo por MIME antes de subir con mensaje en
  español; texto de ayuda y `accept` del input derivados de la prop. 1 archivo.

### M26 · Endurecer validación de entrada en /api/referencias
- **Módulo:** inversionistas · **Tipo:** `logic` · **Depende de:** M4
- **Por qué:** deuda de la revisión de seguridad de M4: UUID mal formado daba
  **500** (22P02) en vez de **400**; `tasa` sin techo de `NUMERIC(5,2)`;
  `fecha_fin` sin validar. Sin brecha (todo parametrizado) — era endurecimiento.
- **Extra al DoD:** 400 con mensaje en español antes de tocar la DB. El hueco
  gemelo del legacy `crearInversion` queda **fuera** (sigue en deuda).
- **Estado:** ✅ — `esUuid` en `referenciador_id`/`inversion_id`/`prestamo_id`/
  `:id`; `tasaValida` con regex 2 decimales y techo 999.99; `esFecha` para
  `fecha_fin` (AAAA-MM-DD real). Smoke test de los 6 casos contra el server en
  verde. 1 archivo.

### M27 · Fix "Invalid Date" en la tarjeta de inversión
- **Módulo:** inversionistas · **Tipo:** `ui` · **Depende de:** —
- **Por qué:** hallazgo de la verificación visual (2026-09-09): `pg` serializa
  `DATE` como timestamp ISO completo y `CardInversion` le concatenaba
  `'T00:00:00'` → `Invalid Date` en Inicio/Vence.
- **Estado:** ✅ — helper `formatearFecha` normaliza a `YYYY-MM-DD` antes de
  parsear. Verificado en navegador: "Inicio: 01 may 2026 · Vence: 01 may 2027".
  1 archivo.

### M28 · Solo administrador liga y edita referencias
- **Módulo:** inversionistas · **Tipo:** `logic` · **Depende de:** M4
- **Por qué:** ⛔4 resuelta (2026-09-09): opción A. Hoy cualquier usuario con
  sesión puede ligar/editar referencias; debe exigir rol administrador, como
  editar una inversión.
- **Estado:** ✅ — `roleMiddleware('administrador')` en `POST`/`PATCH
  /api/referencias`. Smoke: oficinista → 403, admin llega a validación.
  1 archivo.

### M29 · Estados de referencia solo hacia adelante
- **Módulo:** inversionistas · **Tipo:** `logic` · **Depende de:** M4
- **Por qué:** ⛔5 resuelta (2026-09-09): opción A. `activa → terminada/cancelada`
  sin regreso; la tasa no se edita si la referencia ya no está `activa`.
- **Estado:** ✅ — `editarReferencia` valida contra el estado actual: revivir
  → 400, tasa fuera de `activa` → 400; notas/fecha_fin siguen editables.
  Smoke de 5 casos contra el server, datos temporales borrados. 1 archivo.

### M31 · Endurecer validación del legacy `crearInversion`
- **Módulo:** inversionistas · **Tipo:** `logic` · **Depende de:** —
- **Por qué:** hueco gemelo de M26, anotado en deuda desde la revisión de
  seguridad de M4: UUID de referidor mal formado → 500, tasa sin techo
  `NUMERIC(5,2)`, fechas sin validar formato.
- **Estado:** ✅ — `esUuidV`/`esFechaV`/`tasaEnRango` antes de tocar la DB;
  400 en español en los 3 casos (smoke verificado). El resto del legacy no se
  tocó. 1 archivo.

### M23 · Detalle de referenciador devuelve sus referencias
- **Módulo:** inversionistas · **Tipo:** `logic` · **Depende de:** M3, M4
- **Lee:** `docs/modulos/inversionistas/MODULO.md` + `REGLAS.md`
- **Por qué:** el contrato de `MODULO.md` dice `GET /api/referenciadores/:id` =
  "detalle + sus referencias". M3 difirió el join "a M4" y M4 sólo hizo
  `POST`/`PATCH` — la lectura quedó huérfana. M7 (desglose por origen) no puede
  arrancar sin esto.
- **Extra al DoD:** el GET agrega `referencias[]` con `origen_nombre` (nombre
  del inversionista de la inversión o del cliente del préstamo — join en
  servidor). Una fila **por origen**, nunca agregado (R16). Montos/tasas como
  string. Envelope `{ success, data, error }`.
- **Estado:** ✅ — `GET /:id` devuelve `data.referencias[]` con `origen_nombre`
  (join `inversiones→inversionistas` / `prestamos→clientes` en servidor), orden
  `fecha_inicio DESC`. Tasas como string (NUMERIC de `pg` sin tocar).
  `ReferenciaConOrigen` en el model. 2 archivos. M2 aplicada a Neon el 2026-09-09 — corre en runtime.

### M24 · Referencias con id navegable del origen
- **Módulo:** inversionistas · **Tipo:** `logic` · **Depende de:** M23
- **Lee:** `docs/modulos/inversionistas/MODULO.md` + `REGLAS.md`
- **Por qué:** la acción "abrir la inversión ligada" (M7, FLUJOS §4) navega al
  perfil del inversionista dueño (`/inversionistas/:id`) y el payload de M23 no
  trae ese id — sólo `inversion_id` y el nombre. Para préstamos `prestamo_id`
  ya alcanza (`/prestamos/:id`).
- **Extra al DoD:** `referencias[]` agrega `origen_inversionista_id`
  (`inv.inversionista_id`; NULL en referencias de préstamo).
- **Estado:** ✅ — columna en el SELECT + campo en `ReferenciaConOrigen`.
  2 archivos.

---

# Bloque B — motor de comisiones · desbloqueado 2026-09-09

> Las 3 reglas se resolvieron (R22–R24, decididas por Sebastian; Carlos valida
> al final del release).
> **Lee (todas las de este bloque):** `docs/modulos/comisiones-motor/REGLAS.md`.
> Hoja con las respuestas: `docs/PARA-CARLOS-referenciadores.md`.
>
> Las reglas de **estructura** (P1–P7) viven en
> `docs/modulos/inversionistas/REGLAS.md` y están completas — el Bloque A no
> depende de nada de aquí.

### M12 · Migración: tabla `devengos` + índice de idempotencia
- **Tipo:** `data` · **Depende de:** M2 + R22–R24
- **Extra al DoD:** `devengos_idempotente` UNIQUE a nivel BD (R20),
  `dev_un_beneficiario`, `dev_no_sobrepago`, índice FIFO. Con `.down.sql`.
- **Estado:** ✅ — tabla nueva conforme a DATOS.md. La `devengos` huérfana del
  módulo descartado (0 filas) se **renombró** a `devengos_descartado` con sus
  índices (nada se borra). Ciclo up→down→up→up verificado; pruebas funcionales:
  duplicado → 23505, sin beneficiario y sobrepago rechazados por CHECK.
  **Aplicada a Neon el 2026-09-09.**

### M13 · Generación mensual de devengos, idempotente
- **Tipo:** `motor` · **Depende de:** M12
- **Extra al DoD:** correr el corte dos veces deja **el mismo estado** (R20).
  Congela `base_capital` y `tasa` al generarse (R18).
- **Estado:** ✅ — `modules/motor/corte.ts` (núcleo puro, BigInt en centavos,
  half-up R24) + `corte.db.ts` (`ON CONFLICT DO NOTHING` sobre
  `devengos_idempotente`). Casos C1–C6 en tests (6 ✅, TDD rojo→verde); C7
  (idempotencia) verificado contra Neon: 4 candidatos, 2ª corrida inserta 0,
  datos de prueba borrados. **Solo rendimiento** — comisiones (base viva R3)
  llegan en M14. 5 archivos.

### M14 · Cálculo sobre capital vigente (base viva)
- **Tipo:** `motor` · **Depende de:** M13
- **Extra al DoD:** base = `inversiones.monto_actual` o monto vigente del
  préstamo (R3). Moratorios fuera del reparto (R8). Casos resueltos primero, en
  rojo, antes del motor.
- **Estado:** ✅ — `devengosComision` en el corte: base viva = `monto_actual` /
  `saldo_pendiente` al momento del corte, tasa de `referencias.tasa`, congeladas
  (R18). Casos C8–C13 (TDD rojo→verde, 12 tests ✅). **Origen vivo:** inversión
  solo `activo`; préstamo `activo/atrasado/en_juicio` sí devengan (R9+R11),
  `liquidado/cancelado` no — ⚠️ criterio derivado de reglas, marcado para
  validación de Carlos al final. Integración Neon: 6 devengos, 2ª corrida 0,
  limpieza total. 4 archivos.

### M15 · Aplicación FIFO por origen
- **Tipo:** `motor` · **Depende de:** M13
- **Extra al DoD:** R16 es lo más fácil de implementar mal. El dinero del
  préstamo A **no** cubre lo del préstamo B. Caso de dos préstamos del mismo
  referenciador, uno pagando, en verde.
- **Estado:** ✅ — `modules/motor/aplicacion.ts`: `aplicarPagoFifo` puro sobre
  UNA línea (concepto+origen); slots mezclados **lanzan error** — R16 es
  imposible de violar por diseño, no disciplina del caller. FIFO por periodo
  (R15) con cruce de año, sin sobrepago, sobrante regresa (R22), centavos
  BigInt. Casos C14–C19 (8 tests ✅, 20/20 el motor). Persistir el pago con
  comprobante/autorización (R19) es M17/M19. 3 archivos.

### M16 · Lectura de montos con Decimal, sin `parseFloat`
- **Tipo:** `logic` · **Depende de:** M13
- **Extra al DoD:** aplica **solo a lo nuevo** (devengos y aplicación de pagos).
  El legacy no se refactoriza en esta tarea. Montos leídos como string.
- **Estado:** ✅ — módulo canónico `modules/motor/dinero.ts` (`aCentavos`/
  `deCentavos`/`montoPorTasa`: string ↔ BigInt centavos, half-up R24, **regex
  estricta** — los helpers previos tragaban `"1.2.3"` en silencio); corte y
  aplicación lo importan (duplicados fuera). Grep verificado: cero `parseFloat`
  en lo nuevo; el único `Number()` es validación de rango tras regex en
  `tasaValida` (sin aritmética de dinero). 5 tests nuevos (25/25 motor).
  Se optó por BigInt centavos en vez de lib Decimal: exacto y sin dependencia.
  4 archivos.

---

# Bloque C — cuentas por pagar inversionistas · desbloqueado 2026-09-09

### M30 · Migración: tablas `pagos_devengo` + `pago_aplicaciones`
- **Módulo:** inversionistas · **Tipo:** `data` · **Depende de:** M12
- **Por qué:** MODULO.md las lista como tablas nuevas y M17/M19 las necesitan;
  ninguna tarea del Bloque C las creaba. Spec: `DATOS.md` § Pagos.
- **Extra al DoD:** `pago_un_beneficiario`, `pago_cuenta_coherente`, comprobante
  y `autorizado_por` NOT NULL (R19), `UNIQUE (pago_id, devengo_id)`. La huérfana
  `pago_aplicaciones` del módulo descartado (0 filas) se renombra, no se borra.
  Con `.down.sql`.
- **Estado:** ✅ — ambas tablas conforme a DATOS.md; huérfana renombrada a
  `pago_aplicaciones_descartado` con sus índices. Ciclo up→down→up→up verde;
  reversa aborta si hay filas (no borra pagos reales). **Aplicada a Neon el
  2026-09-09.**

### M17 · Aceptar concepto `comision` además de `rendimiento`
- **Tipo:** `logic` · **Depende de:** M12, M30 · **Estado:** ✅
- **Extra al DoD:** un pago por concepto, no se juntan (R17).
- **Cierre:** `GET /api/pagos-devengo/pendientes` — devengos pendientes/parciales
  de **ambos conceptos**, agrupados por línea (beneficiario+concepto+origen,
  R16), slots FIFO dentro de la línea (R15), `total_pendiente` en centavos
  BigInt, filtros `concepto`/beneficiario, envelope estándar. La respuesta ya
  viene partida por línea → el pago por concepto (R17) es estructural. Smoke:
  6 líneas, mismo referenciador con inversión y préstamo separados, filtro y
  400 verificados, datos de prueba borrados. 3 archivos.

### M19 · Registrar pago con forma, cuenta, comprobante y autorización
- **Tipo:** `logic` · **Depende de:** M15, M17, M30 · **Estado:** ✅
- **Extra al DoD:** `autorizado_por` y comprobante **obligatorios** (R19).
  `pago_cuenta_coherente`: si no fue efectivo, exige cuenta.
- **Cierre:** `POST /api/pagos-devengo` — **solo administrador**
  (`roleMiddleware`, coherente con ⛔4=A). Transacción con `FOR UPDATE` sobre la
  línea, aplica `aplicarPagoFifo` (R15/R16), escribe `pagos_devengo` +
  `pago_aplicaciones` y actualiza devengos. `autorizado_por` = sesión (R19);
  espejo de `pago_cuenta_coherente` en 400 legible. **Monto que excede la línea
  se rechaza** (el sobrante no tiene destino legal — R16/R22). Smoke E2E:
  parcial→`parcial`, exceso→400 con sobrante exacto, sin cuenta→400,
  resto exacto→`pagado`, línea sale de pendientes. Datos borrados. 2 archivos.

### M18 · Pantalla de pendientes
- **Tipo:** `ui` · **Depende de:** M19 · **Estado:** ✅
- **Extra al DoD:** Carlos selecciona, el sistema no decide (R14). Dentro de la
  línea el periodo no se elige: FIFO forzado (R15). Totales en centavos enteros.
- **Cierre:** pestaña "Devengos" en el Hub de Egresos
  (`PendientesDevengosTab`). Checkbox por línea (R14); periodos visibles solo
  lectura en orden FIFO (R15); *Seleccionado* y *Quedaría* en vivo con BigInt
  centavos; forma/cuenta/comprobante antes de habilitar Pagar (R19, comprobante
  vía `FileDropZone`); un POST por línea (R17); solo admin puede pagar. En 375px
  tarjetas + barra de total fija abajo. Verificado 1440/375, consola limpia,
  fixtures borrados. Nota: `tsconfig` frontend subió `target` es5→ES2020
  (BigInt); CRA transpila vía browserslist, typecheck y build verdes.
  4 archivos.

### M20 · Filtro inversionistas / referenciadores
- **Tipo:** `ui` · **Depende de:** M18 · **Estado:** ✅ — tres botones
  ([Todos] [Inversionistas] [Referenciadores]) primero que la lista,
  client-side sobre `beneficiario_tipo`. El *quedaría* sigue siendo global:
  el filtro cambia lo visible, no la deuda. Verificado en navegador
  (6→2→4→6 líneas). 1 archivo.

---

## Post-release

### M32 · Limpieza de código huérfano `personas`/`comisiones`
- **Módulo:** comisiones-motor · **Tipo:** `logic` · **Depende de:** M13–M15 ✅
- **Por qué:** `reparto.ts`/`fifo.ts` eran la referencia viva del algoritmo hasta
  que el motor nuevo quedara verde; los controllers/rutas de `personas` y
  `comisiones` no tenían UI ni spec desde el 2026-08-19. Ya nada los usa.
- **Estado:** ✅ (2026-09-11) — controllers, rutas y `modules/comisiones/`
  (con sus 14 tests de referencia) movidos a `_to_delete/backend-huerfano/`
  (nada se borra, prohibición 8); rutas desmontadas de `index.ts`;
  `CMD_TEST_CASOS` reapuntado a `modules/motor`. Las 4 tablas sin uso en Neon
  (`personas`, `persona_documentos`, `aportaciones`, `pagos`) quedan para una
  tarea `data` propia con respaldo.

### M33 · Tests de los controllers nuevos del release
- **Módulo:** inversionistas · **Tipo:** `logic` · **Depende de:** M29 ✅
- **Por qué:** deuda "cero tests de controllers en producción". Se cubre lo
  nuevo del release (con reglas especificadas); el legacy queda como deuda.
- **Estado:** ✅ (2026-09-11) — 41 tests unitarios con `pool` mockeado
  (`vi.mock`, sin dependencia nueva): `referenciadores` (forma 2/3, P6,
  escape de ILIKE, contrato M23), `referencias` (coherencia de origen,
  tasa NUMERIC(5,2), P3→409, M29 solo-adelante, R9), `pagos_devengo`
  (agrupado R16 con BigInt M16, R19, espejo `pago_cuenta_coherente`,
  sobrante exacto→400, transacción todo-o-nada con el FIFO real R15).
  Suite total: 70 ✅. 3 archivos.

### M34 · Retirar de Neon las tablas huérfanas del módulo descartado
- **Módulo:** inversionistas · **Tipo:** `data` · **Depende de:** M32 ✅
- **Por qué:** `personas`, `persona_documentos`, `aportaciones` y `pagos`
  quedaron sin lector tras M32. Ocupaban los nombres globales.
- **Estado:** ✅ (2026-09-11) — renombradas a `*_descartado` (precedente
  M12/M30: nada se borra; el rename preserva filas y FKs — 4+4 filas demo
  intactas). Índices y secuencias renombrados también (namespace global).
  Guardas de idempotencia en up y down. Ciclo up→down→up verde contra Neon;
  verificado: nombres viejos en `to_regclass` → NULL, 8 FKs intactas.
  2 archivos.

### M35 · Limpiar `naranja.*` del tema viejo en tailwind.config.js
- **Módulo:** shared/diseño · **Tipo:** `ui` · **Depende de:** —
- **Por qué:** hallazgo de la tarea de DISENO.md (2026-09-09): tokens del tema
  viejo sin un solo uso en `src/`.
- **Estado:** ✅ (2026-09-11) — `extend.colors.naranja` fuera; de paso el
  comentario stale "Franja superior naranja" en `Login.tsx` (la franja es sky).
  Verificado: cero clases `naranja-*` en el código. Gate `ui` 7/7 con los
  21 e2e responsive verdes. 2 archivos.

### M36 · Runner de migraciones con tracking
- **Módulo:** infra · **Tipo:** `data` · **Depende de:** —
- **Por qué:** deuda "migraciones manuales, sin runner": `CMD_MIGRATE_*` vacíos
  → el gate `data` no verificaba migraciones, las verificaba el humano.
- **Estado:** ✅ (2026-09-11) — `scripts/migrar.js` (up/down/sellar/baseline/
  status) con tabla `_migraciones` en Neon. Clave del diseño: **sellado** — el
  `down` del gate solo revierte la migración de la tarea en curso, nunca las de
  tareas cerradas (no-op si todo está sellado). Las 43 existentes entraron como
  baseline sellado sin ejecutarse. Nuevas migraciones: par
  `<fecha>_<nombre>.up.sql`/`.down.sql`. Ciclo up→down→up probado con
  migración desechable; gate `data` ahora 8/9 declarados (solo seed queda
  fuera: no es idempotente). Prohibición 7 de CLAUDE.md actualizada al runner.
  3 archivos.

### M37 · Seed demo idempotente y alineado al schema vivo
- **Módulo:** infra · **Tipo:** `data` · **Depende de:** M36 ✅
- **Por qué:** `CMD_SEED` vacío (el seed duplicaba datos al re-correr) y además
  **stale**: insertaba en `inmuebles`/`inquilinos`/`contratos_arrendamiento`/
  `cuentas_por_cobrar`/`creditos_bancarios`, eliminadas por
  `migration_remove_modules` — contra el Neon actual tronaba.
- **Estado:** ✅ (2026-09-11) — guarda de idempotencia por cliente marcador
  (RFC demo): si existe, no-op con NOTICE. Secciones de tablas muertas
  recortadas (555→~400 líneas). Probado 2× contra Neon: conteos idénticos
  (8 clientes / 10 préstamos / 4 inversionistas / 4 empleados). `CMD_SEED`
  cableado. **Gate `data` 9/9, cero no declarados — perfil completo.**
  2 archivos.

---

## Dinero half-up (especificado 2026-09-11 · `docs/DINERO.md`)

> Orden obligatorio: M38 primero, M44 al final. Reglas D1–D4; casos C1–C5.

### M38 · Helpers half-up en lib/dinero.ts
- **Tipo:** `motor` · **Depende de:** — · **Estado:** ⬜
- `porcentajeHalfUp(base, tasa)` y `dividirHalfUp` en centavos BigInt.
  TDD con C1–C5 de DINERO.md; el rojo se corre antes del código.

### M39 · Cobros a half-up
- **Tipo:** `logic` · **Depende de:** M38 · **Estado:** ⬜
- `cobros.controller`: interés del mes, interés próximo mes, faltante,
  nuevoSaldo, montoTotalCobro (D1/D2). Tests con C2/C3.

### M40 · Préstamos a half-up
- **Tipo:** `logic` · **Depende de:** M38 · **Estado:** ⬜
- `prestamos.controller`: interés anticipado, monto entregado, rendimiento
  de participantes, moratorios, montoOficina, saldos.

### M41 · Egresos e inversionistas a half-up
- **Tipo:** `logic` · **Depende de:** M38 · **Estado:** ⬜
- `egresos.controller` (rendimiento → CxP) e `inversionistas.controller`
  (interés al capitalizar, nuevoMonto).

### M42 · Nómina a half-up
- **Tipo:** `logic` · **Depende de:** M38 · **Estado:** ⬜
- `nominas.controller`: prima, horas extras, faltas, total, costo_real.
  D2 estricto: fuera el `tarifa_hora.toFixed(4)` intermedio. Tests con C4/C5.

### M43 · Display a la misma aritmética
- **Tipo:** `logic` · **Depende de:** M39–M42 · **Estado:** ⬜
- `dashboard`, `ingresos`, `tesoreria`, `pagos`, mensajes de error (D4).
  Los porcentajes/ratios (ocupación, variación) NO son dinero y se quedan.

### M44 · Recálculo retroactivo (D3)
- **Tipo:** `data` · **Depende de:** M39–M43 · **Estado:** ⬜
- Migración par fecha_*.up/.down que recalcula lo persistido con la regla
  vieja, **con respaldo `_respaldo_*`** de cada tabla tocada. ⚠️ Válida solo
  pre-producción (D3). Inventariar columnas derivadas antes de escribirla.

## Conteo

| Bloque | Tareas | Estado |
|---|---|---|
| A — inversionistas/referenciadores | 23 (incluye M21–M31 extra) | **22 ✅ · 1 ❌ (M8) · Bloque A completo** |
| B — motor de comisiones | 5 | **5 ✅ · Bloque B completo** |
| C — cuentas por pagar | 5 (incluye M30 data) | **5 ✅ · Bloque C completo** |

## Bloques B y C desbloqueados el 2026-09-09
Reglas R22–R24 decididas por Sebastian; Carlos valida al final del release.
