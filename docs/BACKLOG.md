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
- **Depende de:** `personas` implementado
- **Lee:** `comisiones/DATOS.md`
- **Extra al DoD:** schema exacto de DATOS.md + índices FIFO + vista `saldo_por_persona` + `UNIQUE corte_idempotente` (R20) + `no_sobrepago`. Trae su `.down.sql`.
- **Estado:** 🚫 bloqueada (depende de personas)

## Logic — servicios sobre la DB

### T-005 · Servicio de corte del periodo (idempotente)
- **Módulo:** comisiones
- **Tipo:** logic
- **Depende de:** T-002, T-004
- **Lee:** `comisiones/REGLAS.md` + `MODULO.md`
- **Extra al DoD:** `POST /cortes/:periodo` genera devengos, congela `base_capital`+`tasa` al generarse (R18), idempotente a nivel DB (R20). Correr dos veces = mismo estado (caso 7).
- **Estado:** 🚫 bloqueada (depende de T-004)

### T-006 · Servicio de pagos + aplicaciones FIFO
- **Módulo:** comisiones
- **Tipo:** logic
- **Depende de:** T-003, T-004
- **Lee:** `comisiones/REGLAS.md` + `MODULO.md`
- **Extra al DoD:** `POST /pagos` aplica FIFO (T-003), un pago por concepto (R17), gobernanza `autorizado_por`+comprobante (R19). No absorbe faltante: lo devenga (R22).
- **Estado:** 🚫 bloqueada (depende de T-004)

### T-007 · Estado de cuenta y pendientes
- **Módulo:** comisiones
- **Tipo:** logic
- **Depende de:** T-004
- **Lee:** `comisiones/MODULO.md` + `DATOS.md`
- **Extra al DoD:** `GET /devengos?persona_id=` (estado de cuenta) y `GET /pagos/pendientes` con disponible calculado. Solo lectura.
- **Estado:** 🚫 bloqueada (depende de T-004)

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
