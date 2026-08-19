# Estado — Carlos Torres Torija

> Lo mantiene **Claude Code** al cerrar cada tarea (`/cerrar-tarea`).
> Es el punto de reentrada: una sesión nueva lee esto y sabe dónde está.

**Metodología:** v0.1.1  ·  **Perfil:** frontback-drizzle (con overrides — ver `gate.sh`)
**Rama activa:** `rediseno-referidor-inversionista`
**Última actualización:** 2026-08-19

---

## Dónde está el proyecto hoy

Sistema legacy **vivo en producción** (préstamos, inversionistas, ingresos/egresos,
tesorería, nómina, juicios). Encima de él entra un release: **referenciadores**.

El release se re-especificó el **2026-08-19**. La versión anterior creaba módulos
`personas` y `comisiones` **paralelos** al de inversionistas. Eso estaba mal: el
módulo de inversionistas ya existe y se **extiende**. Los docs de `personas/` y
`comisiones/` se descartaron y viven en `_to_delete/`.

**Backlog vigente:** `docs/BACKLOG.md` — 20 modificaciones (M1–M20).
**El porqué de cada una:** `docs/modulos/inversionistas/MODIFICACIONES.md`.

### Lo que ya estaba hecho y no se sabía

`inversiones` **ya tiene** `referenciador_id`, `tasa_referenciador`, el CHECK de
auto-referencia y el de coherencia de tasa, con su `.down.sql`. La mitad del
referenciador de inversión ya existe. Falta el referenciador de **préstamos**,
los referenciadores **sin capital**, y todo el cálculo.

---

## Grafo de módulos

| Módulo | Estado | Tests | Depende de | Última tarea |
|---|---|---|---|---|
| inversionistas / referenciadores | 🟡 en curso — Bloque A corriendo (3/11) | — | préstamos (lectura) | M9 · datos bancarios en inversionistas (2026-08-19, sin aplicar a Neon) |
| comisiones-motor | 🚫 bloqueado — 3 reglas sin definir | 14 ✅ (del motor descartado, sirven de referencia) | inversionistas | split de REGLAS 2026-08-19 |
| dashboard | ✅ producción (legacy), documentado post-hoc | 0 | ingresos, egresos, nómina | Fase 0 (modularización) |
| auth / clientes / inversionistas / prestamos / cobros / pagos / ingresos / egresos / cuentas_pagar / nominas / tesoreria / juicios | ✅ producción (legacy) | 0 | — | sin spec de metodología |
| ~~personas~~ / ~~comisiones~~ | ❌ DESCARTADOS como módulos | 14 | — | docs en `_to_delete/`; ver "Código huérfano" |

Estados: `⬜ pendiente` · `🟡 en curso` · `✅ producción` · `🚫 bloqueado` · `❌ descartado`

---

## Bloqueos activos

| Qué | Qué falta | Quién resuelve | Desde |
|---|---|---|---|
| Bloque B y C del backlog (M12–M20, 9 tareas) | Las 3 reglas ⛔ de `docs/modulos/comisiones-motor/REGLAS.md` | **Carlos**, en junta | 2026-08-19 |

Hoja para la junta: `docs/PARA-CARLOS-referenciadores.md`.

Las tres: (1) orden dentro del mismo mes, (2) oficina en rojo, (3) redondeo y
dueño del residuo.

> Un módulo bloqueado por regla de negocio sin definir **no entra al backlog**.
> No se marca TODO — se detiene.

---

## Código huérfano por el rediseño

Existe en el repo y en Neon, pero **ya no tiene UI ni especificación**:

- `backend/src/controllers/personas.controller.ts` + `routes/personas.routes.ts`
- `backend/src/controllers/comisiones.controller.ts` + `routes/comisiones.routes.ts`
- `backend/src/modules/comisiones/{reparto,fifo}.ts` + sus tests (14 ✅)
- Tablas en Neon: `personas`, `persona_documentos`, `aportaciones`, `devengos`,
  `pagos`, `pago_aplicaciones` — **sin uso**

⚠️ `gate.sh` todavía apunta `CMD_TEST_CASOS` a esos tests. Mientras pasen, no
estorban. **`reparto.ts` y `fifo.ts` son la referencia viva del algoritmo** —
antes de escribir M13/M15 desde cero, leerlos: el FIFO por origen y el reparto ya
están resueltos ahí.

Decisión pendiente: portarlos al motor nuevo o borrarlos. **No borrar hasta que
M13–M15 estén verdes.**

---

## Deuda técnica

- [ ] **Dinero en float.** ~100 hits de `parseFloat(...).toFixed(2)` sobre dinero
      en todos los controllers. El check `dinero-sin-float` sale ROJO.
      **Desactivado como bloqueante** (no está en `CHECKS_EXTRA`). La regla nueva
      (M16) aplica **solo a lo nuevo**: el legacy se ataca en ticket propio.
- [ ] **Dos escalas de tasa** en la misma tabla: `tasa_interes_mensual` es
      `NUMERIC(5,2)` (2.00 = 2%) y `tasa_referenciador` es `NUMERIC(6,4)`
      (0.0050 = 0.5%). M11 lo unifica. **Hasta que M11 corra, cuidado al leer
      cualquier tasa.**
- [ ] **Backend con tests solo del motor descartado.** 14 tests, todos de
      `modules/comisiones`. Cero tests de los controllers en producción.
- [ ] **Sin script de lint.** Solo `eslintConfig` de CRA en build. `CMD_LINT` vacío.
- [ ] **Migraciones manuales, sin runner.** SQL plano en `database/`, aplicado a
      mano a Neon vía `scripts/apply-migration.js`. `CMD_MIGRATE_*` vacíos → el
      gate `data`/`full` **no verifica migraciones**. Las verifica el humano.
- [ ] **Migraciones NO aplicadas en prod** con workarounds hardcoded en el
      analytics controller (`otros=0::NUMERIC`, `pensiones_activas=0`).
      Ver `docs/modulos/dashboard/DATOS.md`.
- [ ] **Sin e2e/responsive.** No existe `e2e/responsive.spec.ts`; responsive se
      verifica a ojo con playwright-mcp. `CMD_E2E_RESPONSIVE` vacío.
- [ ] **`docs/DISENO.md` con marcas `{{TODO}}`** — tokens y tipografía sin extraer.
- [ ] **El working tree marca ~140 archivos como modificados** sin cambio de
      contenido aparente (probable normalización de fin de línea CRLF/LF).
      Revisar `core.autocrlf` / `.gitattributes` **antes** del próximo commit, o
      el diff del release será ilegible.

---

## Decisiones de arquitectura

| Fecha | Tarea | Decisión | Por qué |
|---|---|---|---|
| 2026-08-16 | Fase 0 | Perfil `frontback-drizzle` con overrides pesados | Es el perfil "financiera-sistema y forks", pero este fork usa CRA/CRACO + pg raw, no Drizzle/Vitest/migrate. Comandos inexistentes → vacíos, registrados como deuda. |
| 2026-08-16 | Fase 0 | `dinero-sin-float` NO bloqueante | Sale rojo con ~100 hits legacy; bloquearía cada tarea hasta refactor total. |
| 2026-08-16 | Fase 0 | Módulo `dashboard` como destino del conocimiento del CLAUDE.md monolítico | El dashboard es real y transversal; agrega ingresos/egresos/nómina. |
| 2026-08-16 | Fase 0 | Resuelto stale del dashboard vía `migration_remove_modules.sql` | `inmuebles`/`contratos_arrendamiento`/`cuentas_por_cobrar` eliminadas; `juicios` viva. Solo origen `'Prestamo'` vivo. |
| 2026-08-17 | rediseño | Un solo módulo de inversionistas + referidores; se quitaron las pantallas personas/comisiones | Feedback de Sebastian: el referidor es otro inversionista, no una entidad aparte. |
| **2026-08-19** | **re-especificación** | **`personas`/`aportaciones` se descartan. Se extiende el schema real con `referenciadores` + `referencias`** | Los módulos paralelos duplicaban a `inversionistas`, que ya existe en producción. `referencias` cubre además el referido de **préstamo**, que la columna vieja no cubría. |
| **2026-08-19** | **re-especificación** | **Nadie se muda de tabla.** Un referenciador que aporta capital conserva su fila y gana otra; `referenciadores.inversionista_id` las liga | Mover la persona rompe el histórico (sus comisiones apuntarían a un id muerto); copiarla hace que su teléfono diverja entre las dos tablas. |
| **2026-08-19** | **re-especificación** | `devengos` es tabla nueva, **no** extensión de `historial_inversiones` | Una registra lo que se **pagó**; la otra lo que se **generó aunque no se pagara**. Mezclarlas rompe lo que hoy funciona en producción. |
| **2026-08-19** | **re-especificación** | `inversiones.referenciador_id` se **depreca, no se borra**, en la misma migración que crea `referencias` | Borrarla mientras el código todavía la lee tumba producción. Se quita cuando ya nadie la lea. |
| **2026-08-19** | M1 | **Los dos defectos del check de reglas se arreglan en `gate.base.sh` (v0.1.1), no en el proyecto** | `grep -r` crudo sobre `docs/` matcheaba la prosa de `DEFINICION-DE-LISTO.md` (gate rojo desde siempre) y barría todo el árbol (un módulo detenido congelaba el repo). Se corrige en la base porque el `gate.sh` del proyecto no admite lógica y porque lo heredan los demás proyectos. Ver `docs/CORRECCIONES.md` C-01 y C-02. |
| **2026-08-19** | M1 | **`REGLAS.md` se parte en dos: estructura (P1–P7) y cálculo (R1–R21 + las 3 ⛔)** | El Bloque A no usa ninguna R, pero el gate lo rechazaba por marcas ⛔ de un módulo que ni toca. Estaban juntas por accidente. Ni se inventó una regla ni se tocó el check del gate: el bloqueo sigue vivo, ahora sobre el módulo que sí corresponde. |
| **2026-08-19** | M2 | **La copia de referidos legacy a `referencias` se difiere; no se inventa el puente** | Hoy hay **0 filas** con `inversiones.referenciador_id` (verificado en Neon). El copiado real exige dos decisiones sin especificar: puente `inversionista(id)→referenciadores(id)` y escala de tasa (`NUMERIC(6,4)→(5,2)`, unifica M11). Se crea la tabla y se depreca la columna; la migración lleva una **guarda** que aborta si aparecen filas antes de definir el copiado. |

---

## Bitácora de aceptación (Sebastian)

| Fecha | Tarea | Veredicto | Nota |
|---|---|---|---|
| 2026-08-19 | M1 · tabla `referenciadores` | ✅ aceptada | Cierre autorizado sobre gate verde (`data · inversionistas`, v0.1.1). Migración escrita, **sin aplicar a Neon** — la aplica Sebastian. |
| 2026-08-19 | M2 · tabla `referencias` | ✅ aceptada | Cierre autorizado sobre gate verde. Copia diferida (0 filas hoy). **Sin aplicar a Neon.** |
| 2026-08-19 | M9 · datos bancarios | ✅ aceptada | `numero_cuenta`/`banco` opcionales en inversionistas. **Sin aplicar a Neon.** |
| 2026-08-19 | M10 (split) | — | El `DROP asignado_a` no corría: ~8 archivos (backend + 6 de frontend) leen la columna. Se parte en M10a (logic, backend deja de leer), M10b (ui, frontend deja de leer), M10 (data, DROP, dependiente). M10b lleva 6 archivos como excepción a ≤5 porque el tipo `AsignadoA` los acopla. Bloque A: 11 → 13 tareas. |
