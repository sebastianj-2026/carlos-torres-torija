# Backlog — Carlos Torres Torija

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

> Backlog heredado del pre-metodología: `docs/BACKLOG-referenciadores.md`.
> Migrar sus items a este formato atómico cuando se retomen.

---

# Módulo: personas (slice mínimo)

> Decidido 2026-08-16: solo lo que comisiones necesita. Incluye
> `persona_documentos` (comisiones lo referencia para comprobante, R19).
> **Difiere:** `persona_roles` (roles simultáneos) y la fusión con `clientes`.
> Orden: data → seed → logic → ui.

### P-001 · Migración: personas, persona_documentos, aportaciones
- **Módulo:** personas
- **Tipo:** data
- **Depende de:** —
- **Lee:** `docs/modulos/personas/DATOS.md`
- **Extra al DoD:** las 3 tablas del spec (personas, persona_documentos, aportaciones) con sus índices y constraints (identidad única, `no_auto_referencia`, `tasa_ref_coherente`). **Sin** `persona_roles`. Trae `.down.sql`. Aplicación a Neon es MANUAL (documentar el paso).
- **Estado:** ✅ aplicada a Neon 2026-08-17. Tablas personas/persona_documentos/aportaciones vivas.

### P-002 · Seed personas + aportaciones desde inversionistas legacy
- **Módulo:** personas
- **Tipo:** data
- **Depende de:** P-001
- **Lee:** `docs/modulos/personas/DATOS.md`
- **Extra al DoD:** migración de datos one-shot: `personas` desde `inversionistas` (nombres/apellidos/teléfono), `aportaciones` desde `inversiones` (inversionista_id, monto, tasa_inversionista) con `referenciador_id` NULL. Idempotente. No borra el legacy.
- **Estado:** ✅ aplicada a Neon 2026-08-17. 4 inversionistas→4 personas, 4 inversiones→4 aportaciones (tasa /100 verificada, referidor NULL).

### P-003 · CRUD backend personas + aportaciones
- **Módulo:** personas
- **Tipo:** logic
- **Depende de:** P-001
- **Lee:** `docs/modulos/personas/MODULO.md` + `REGLAS.md`
- **Extra al DoD:** endpoints POST/GET/PATCH `/personas`, POST `/personas/:id/aportaciones` con `referenciador_id`+`tasa_referenciador` opcionales (P6/P7). Validar constraints en el servicio.
- **Estado:** ✅ hecha — validado EN VIVO contra Neon 2026-08-17 (14/14: auth 401/403, lectura sembrada, alta, negativos P7/coherencia/monto/404/id). Sin test de integración automatizado (deuda).

### P-004 · UI aportaciones con referidor + tasa (captura de Carlos)
- **Módulo:** personas
- **Tipo:** ui
- **Depende de:** P-003
- **Lee:** `docs/DISENO.md` + `docs/modulos/personas/FLUJOS.md`
- **Extra al DoD:** alta/edición de aportación con campo referidor (autocompletar persona) + tasa opcional. Los históricos quedan sin referidor hasta que Carlos los complete.
- **Estado:** 🟡 código completo + contrato validado (usa los endpoints que P-003 probó en vivo). Responsive endurecido (fila monto/fecha apila en <640px). **Falta:** check visual 375/768/1440 (extension de Chrome no conectado → click-through manual o e2e) y link en Sidebar (UI compartida → tarea propia).

---

# Módulo: comisiones (motor)

> Derivado 2026-08-16 de `docs/modulos/comisiones/` (spec completa, R21/R22/R23
> cerradas). Orden: **motor → data → logic → ui**. El motor de cálculo (T-001…T-003)
> es puro y **no** depende de la DB → arranca ya. Todo lo que toca tablas
> (T-004+) **espera a que `personas` esté implementado** (FKs a personas/
> persona_documentos/aportaciones).

## Motor de cálculo — sin DB, arranca ya

### T-001 · Casos resueltos de comisiones como tests
- **Módulo:** comisiones
- **Tipo:** motor
- **Depende de:** —
- **Lee:** `comisiones/REGLAS.md` + `CASOS-RESUELTOS.md`
- **Extra al DoD:** los 8 casos + 7 invariantes convertidos en tests. Deben salir **rojos** (el motor no existe todavía). Incluir la invarianza de suma `inv+ref+oficina==cobrado` al centavo.
- **Estado:** ✅ hecha — tests en `backend/src/modules/comisiones/casos-resueltos.test.ts`, RED por diseño (motor `reparto`/`fifo` inexistente). Cubre casos 1,2,3,6 (reparto), 4,8 (FIFO) e invariantes 1,4,6. Casos 5 y 7 son de servicio (T-005/T-006), no motor puro.

### T-002 · Motor de reparto mensual (devengo)
- **Módulo:** comisiones
- **Tipo:** motor
- **Depende de:** T-001
- **Lee:** `comisiones/REGLAS.md` + `CASOS-RESUELTOS.md`
- **Extra al DoD:** funciones puras que reparten cobrado→(inv, ref, oficina) con base viva (R3), moratorios fuera (R8), 2 decimales y residuo a oficina (R23). Pone verdes los casos 1, 2, 3, 6.
- **Estado:** ✅ hecha — `backend/src/modules/comisiones/reparto.ts`. 10/10 verde. `round2` seguro, oficina como residuo (absorbe rojo).

### T-003 · Motor FIFO de aplicación de pagos
- **Módulo:** comisiones
- **Tipo:** motor
- **Depende de:** T-001
- **Lee:** `comisiones/REGLAS.md` + `CASOS-RESUELTOS.md`
- **Extra al DoD:** aplica un pago a devengos por línea (persona+concepto+origen), FIFO periodo asc (R15), por origen sin cruzar (R16), inversionista primero (R21). Pone verdes los casos 4, 8 y los invariantes 4/6.
- **Estado:** ✅ hecha — `backend/src/modules/comisiones/fifo.ts`. 4/4 verde. Opera sobre la línea ya filtrada (no cruza orígenes).

## Data — espera a `personas`

### T-004 · Migración: devengos, pagos, pago_aplicaciones
- **Módulo:** comisiones
- **Tipo:** data
- **Depende de:** P-001 (tablas personas/persona_documentos/aportaciones)
- **Lee:** `comisiones/DATOS.md`
- **Extra al DoD:** schema exacto de DATOS.md + índices FIFO + vista `saldo_por_persona` + `UNIQUE corte_idempotente` (R20) + `no_sobrepago`. Trae su `.down.sql`.
- **Estado:** ✅ aplicada a Neon 2026-08-17. devengos/pagos/pago_aplicaciones + vista saldo_por_persona vivas.

## Logic — servicios sobre la DB

### T-005 · Servicio de corte del periodo (idempotente)
- **Módulo:** comisiones
- **Tipo:** logic
- **Depende de:** T-002, T-004
- **Lee:** `comisiones/REGLAS.md` + `MODULO.md`
- **Extra al DoD:** `POST /cortes/:periodo` genera devengos, congela `base_capital`+`tasa` al generarse (R18), idempotente a nivel DB (R20). Correr dos veces = mismo estado (caso 7).
- **Estado:** ✅ hecha — validado EN VIVO 2026-08-17 (12/12: auth, periodo inválido, montos round(base*tasa,2), R18 congelado, R20 idempotente). Cálculo en SQL NUMERIC (no JS). Endpoint `POST /api/comisiones/cortes/:periodo`. Falta test de integración automatizado (deuda).

### T-006 · Servicio de pagos + aplicaciones FIFO
- **Módulo:** comisiones
- **Tipo:** logic
- **Depende de:** T-003, T-004
- **Lee:** `comisiones/REGLAS.md` + `MODULO.md`
- **Extra al DoD:** `POST /pagos` aplica FIFO (T-003), un pago por concepto (R17), gobernanza `autorizado_por`+comprobante (R19). No absorbe faltante: lo devenga (R22).
- **Estado:** ✅ hecha — validado EN VIVO 2026-08-17 (16/16: FIFO por antigüedad, estados pagado/parcial, no_sobrepago, sobrepago→400, R19, auth). FIFO en SQL NUMERIC. Endpoint `POST /api/comisiones/pagos`.

### T-007 · Estado de cuenta y pendientes
- **Módulo:** comisiones
- **Tipo:** logic
- **Depende de:** T-004
- **Lee:** `comisiones/MODULO.md` + `DATOS.md`
- **Extra al DoD:** `GET /devengos?persona_id=` (estado de cuenta) y `GET /pagos/pendientes` con disponible calculado. Solo lectura.
- **Estado:** ✅ hecha — validado EN VIVO 2026-08-17 (13/13). `GET /api/comisiones/devengos?persona_id=` (estado de cuenta) y `GET /api/comisiones/pendientes` (líneas con acumulado/meses/desde). Nota: 'disponible' es tesorería, fuera del slice.

## UI — pantallas

### T-008 · Pantalla Corte del mes
- **Módulo:** comisiones
- **Tipo:** ui
- **Depende de:** T-005
- **Lee:** `docs/DISENO.md` + `comisiones/FLUJOS.md`
- **Extra al DoD:** selector de periodo, previsualización antes de generar, aviso + botón deshabilitado si el periodo ya se corrió (R20).
- **Estado:** 🚫 bloqueada (depende de T-005)

### T-009 · Pantalla Pagos pendientes (la de Carlos)
- **Módulo:** comisiones
- **Tipo:** ui
- **Depende de:** T-006, T-007
- **Lee:** `docs/DISENO.md` + `comisiones/FLUJOS.md`
- **Extra al DoD:** selección manual (R14), total seleccionado/quedaría en vivo, FIFO dentro de línea sin elegir periodo (R15), pide `autorizado por` + comprobante PDF (R19). Responsive 375: tarjetas con total fijo abajo.
- **Estado:** 🚫 bloqueada (depende de T-006)

### T-010 · Estado de cuenta por persona
- **Módulo:** comisiones
- **Tipo:** ui
- **Depende de:** T-007
- **Lee:** `docs/DISENO.md` + `comisiones/FLUJOS.md` + `personas/FLUJOS.md`
- **Extra al DoD:** vive en el detalle de persona; devengado/pagado/acumulado por concepto.
- **Estado:** 🚫 bloqueada (depende de T-007)

## Fase 2 — mejoras (no bloquean el core)

### T-011 · Pantalla Rojo de la oficina (mejora 6-7)
- **Tipo:** ui · **Depende de:** T-005 · **Lee:** `DISENO.md` + `comisiones/FLUJOS.md`
- **Extra al DoD:** créditos con margen negativo/comprimido, alerta antes del cierre. **Estado:** ⬜

### T-012 · Pantalla Rentabilidad por referenciador (mejora 8)
- **Tipo:** ui · **Depende de:** T-007 · **Lee:** `DISENO.md` + `comisiones/FLUJOS.md`
- **Extra al DoD:** capital traído, cobrado y generado por referenciador. **Estado:** ⬜

> Solo se escribe el criterio **extra**. Los del gate se dan por hecho.
