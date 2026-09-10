# Estado — Carlos Torres Torija

> Lo mantiene **Claude Code** al cerrar cada tarea (`/cerrar-tarea`).
> Es el punto de reentrada: una sesión nueva lee esto y sabe dónde está.

**Metodología:** v0.1.2  ·  **Perfil:** frontback-drizzle (con overrides — ver `gate.sh`)
**Rama activa:** `rediseno-referidor-inversionista`
**Última actualización:** 2026-09-09 (cierre de M22 · **Bloque A completo**; B y C siguen 🚫 por las 3 ⛔ de Carlos)
**Migraciones M1/M2/M9/M10/M11 APLICADAS a Neon el 2026-09-09** (por Claude, con
autorización explícita de Sebastian — excepción puntual a la prohibición 7).
Verificado: tablas con 0 filas y 3 constraints, `asignado_a` fuera,
`tasa_referenciador` en `NUMERIC(5,2)`.
**Verificación visual 2026-09-09 (playwright, sesión JWT local):** lista M5/M6 y
form M22 en 375/768/1440 — cero scroll horizontal, cero error de consola,
tarjetas en 375, dropzone→botón, deuda en `—`; M21 con hint `0.50 = 0.5%`.
Detalle M7 y edición M22 verificados con "Referenciador Prueba" creado desde el
propio form (alta y PATCH end-to-end en verde; es DB de **desarrollo** con seed
demo, confirmado por Sebastian): detalle 1440/375 sin scroll, totales en `—`,
sin botón de pagar; edición precarga y persiste. Hallazgo legacy ajeno al
release: la tarjeta de inversión del perfil pinta "Inicio: Invalid Date ·
Vence: Invalid Date".

---

## Dónde está el proyecto hoy

Sistema legacy funcional, **aún en desarrollo — no hay producción** (la DB Neon
es de desarrollo con seed demo; corregido 2026-09-09). Módulos: préstamos,
inversionistas, ingresos/egresos, tesorería, nómina, juicios. Encima entra un
release: **referenciadores**.

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
| inversionistas / referenciadores | 🟡 Bloque A **completo** (17 ✅ · 1 ❌ / 18); espera Bloques B/C | — | préstamos (lectura) | M22 · form de alta/edición de referenciador (2026-09-09) |
| comisiones-motor | 🚫 bloqueado — 3 reglas sin definir | 14 ✅ (del motor descartado, sirven de referencia) | inversionistas | split de REGLAS 2026-08-19 |
| dashboard | ✅ legacy funcional, documentado post-hoc | 0 | ingresos, egresos, nómina | Fase 0 (modularización) |
| auth / clientes / inversionistas / prestamos / cobros / pagos / ingresos / egresos / cuentas_pagar / nominas / tesoreria / juicios | ✅ legacy funcional | 0 | — | sin spec de metodología |
| ~~personas~~ / ~~comisiones~~ | ❌ DESCARTADOS como módulos | 14 | — | docs en `_to_delete/`; ver "Código huérfano" |

Estados: `⬜ pendiente` · `🟡 en curso` · `✅ legacy funcional` · `🚫 bloqueado` · `❌ descartado`

---

## Bloqueos activos

| Qué | Qué falta | Quién resuelve | Desde |
|---|---|---|---|
| Bloque B y C del backlog (M12–M20, 9 tareas) | Las 3 reglas ⛔ de `docs/modulos/comisiones-motor/REGLAS.md` | **Carlos**, en junta | 2026-08-19 |

Hoja para la junta: `docs/PARA-CARLOS-referenciadores.md`.

Las tres: (1) orden dentro del mismo mes, (2) oficina en rojo, (3) redondeo y
dueño del residuo.

Además, la hoja lleva **2 preguntas nuevas** (⛔4, ⛔5) de la revisión de seguridad
de M3/M4 — **no bloquean** nada (el código ya corre con un supuesto), sólo
confirman permiso de rol para ligar referencias y transiciones válidas de estado.

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
- [x] ~~**Dos escalas de tasa**~~ — resuelta el 2026-09-09: M11 aplicada a Neon
      (`tasa_referenciador` ya es `NUMERIC(5,2)`, 0.50 = 0.5%) y M21 alineó el
      form legacy. Todo el sistema usa porcentaje con 2 decimales.
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
- [ ] **Validación de entrada laxa en endpoints nuevos de referencias** (M4).
      Los UUID del body (`referenciador_id`, `inversion_id`, `prestamo_id`) no se
      validan de forma antes de la DB → UUID mal formado da **500** (22P02) en vez
      de **400**; `tasa` no valida el techo de `NUMERIC(5,2)` (>999.99 → overflow);
      `fecha_fin` no valida fecha. **Sin brecha** (todo parametrizado). Mismo hueco
      en el legacy `crearInversion`. Ticket propio de endurecimiento (revisión de
      seguridad del commit de M4, 2026-08-26). No se parchó en caliente para no
      reabrir tarea cerrada.
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
| 2026-08-25 | M11 | **La migración se queda pura `data`; alinear el form legacy a la escala nueva se difiere a M21 (`ui`)** | Cambiar la escala de la columna es una cosa; cambiar cómo el form la captura es otra (otro módulo/tipo). Meterlas juntas rompe "una tarea = un tipo". Con 0 filas hoy el hueco (una alta post-M11 redondearía `0.0050→0.01`) no es urgente, pero queda anotado en backlog para no crear un referido por esa ruta antes de M21. |
| 2026-08-26 | M3 | **`GET /api/referenciadores/:id` NO joinea `referencias`; el desglose se difiere a M4** | `referencias` (M2) está escrita pero **sin aplicar a Neon**; joinearla haría 500 en runtime. Su lectura/gestión es M4. Así M3 depende sólo de M1 y sigue atómico. |
| 2026-08-26 | M3 | **Código nuevo usa envelope `{ success, data, error }`; el filtro `forma` sólo cubre 2 y 3** | Es el contrato de `MODULO.md` (el legacy `{ mensaje }` no se toca). Forma 1 (solo inversionista) no vive en `referenciadores`; la lista combinada de las 3 formas es de M5 (ui). No se inventó UNION con `inversionistas`. |
| 2026-08-26 | M4 | **`referencias.fecha_inicio` la pone el servidor (`CURRENT_DATE`); `PATCH` no mueve origen ni referenciador** | Convención del proyecto: las fechas las genera el servidor, nunca el cliente. R9: la edición sólo toca estado/tasa/fecha_fin/notas — una referencia no se muda de origen, se cambia de estado. P3 se apoya en el `UNIQUE` de la tabla (409 en español), no en un `SELECT` previo con carrera. |
| 2026-09-08 | M5 | **La lista combinada de las 3 formas se arma en el cliente: ambas APIs se traen completas (100/página, tope 50 vueltas) y se filtran/paginan localmente** | El UNION no existe como endpoint (decisión de M3) y agregarlo sería `logic` dentro de una tarea `ui`. Escala de oficina (decenas de filas) lo aguanta; si crece, el endpoint combinado es tarea nueva. |
| 2026-09-08 | M23 | **La lectura de referencias vive en `GET /api/referenciadores/:id` (join con `origen_nombre`), no en un `GET /api/referencias` nuevo** | Es el contrato ya pactado en `MODULO.md` ("detalle + sus referencias"). M3 difirió el join "a M4" y M4 sólo hizo alta/edición — la lectura quedó huérfana y M7 no podía arrancar. Tarea `logic` propia (M23) en vez de meter backend en la tarea `ui`. |
| 2026-09-08 | M5 | **Acciones sin destino se ven pero no navegan: alta deshabilitada con tooltip (M22 nueva en backlog), detalle sin acción hasta M7** | FLUJOS §2 (form de alta) quedó etiquetada "(M3)" pero M3 cerró como API pura — la pantalla no tenía tarea. Se registró M22 en vez de meterla aquí (rompería atomicidad). Decisión de Sebastian en sesión. |
| 2026-09-09 | M8 | **M8 se descarta sin código** | La liga inversión→préstamo no existe en el schema (`participantes_prestamo` liga inversionista→préstamo) y el controller ni la consulta; implementarla exigía inventar la regla o una tarea `logic` previa. Sebastian: la liga se hace desde préstamos al crear el préstamo — la condición del banner no puede darse. |

---

## Bitácora de aceptación (Sebastian)

| Fecha | Tarea | Veredicto | Nota |
|---|---|---|---|
| 2026-08-19 | M1 · tabla `referenciadores` | ✅ aceptada | Cierre autorizado sobre gate verde (`data · inversionistas`, v0.1.1). Migración escrita, **sin aplicar a Neon** — la aplica Sebastian. |
| 2026-08-19 | M2 · tabla `referencias` | ✅ aceptada | Cierre autorizado sobre gate verde. Copia diferida (0 filas hoy). **Sin aplicar a Neon.** |
| 2026-08-19 | M9 · datos bancarios | ✅ aceptada | `numero_cuenta`/`banco` opcionales en inversionistas. **Sin aplicar a Neon.** |
| 2026-08-19 | M10a · backend sin `asignado_a` | ✅ aceptada | Cierre sobre gate verde `logic`. Columna intacta en DB; el front todavía la manda (se ignora). |
| 2026-08-19 | M10b · frontend sin `asignado_a` | ✅ aceptada | Cierre sobre gate verde `ui` (v0.1.2). 6 archivos; fuera filtro, columna, campo y perfil. Verificación visual a ojo en localhost. |
| 2026-08-25 | M10 · DROP `asignado_a` | ✅ aceptada | Cierre sobre gate verde `data`. `.up` respalda a `_respaldo_asignado_a` antes del DROP; reversa restaura estructura (CHECK `'sebastian'`,`'abril'`) + datos. Grep en código limpio. **Sin aplicar a Neon** — la aplica Sebastian. |
| 2026-08-25 | M11 · unificar escala `tasa_referenciador` | ✅ aceptada | Cierre sobre gate verde `data · inversionistas`. `NUMERIC(6,4)→(5,2)` (`× 100`), respaldo en `_respaldo_tasa_referenciador`, reversa simétrica (`/ 100`), guardas de idempotencia por `numeric_scale`. 0 filas hoy. Form legacy → **M21** (opción a, autorizada). **Sin aplicar a Neon.** |
| 2026-08-26 | M3 · alta/edición de referenciador | ✅ aceptada | Cierre sobre gate verde `logic · inversionistas`. API `/api/referenciadores` (list/get/alta/edición), envelope `{ success, data, error }`, filtro `forma=2\|3`, baja por `activo` (P6). `GET/:id` sin `referencias` (M4). 4 archivos. |
| 2026-08-26 | M4 · ligar referenciador a inversión/préstamo | ✅ aceptada | Cierre sobre gate verde `logic · inversionistas`. API `/api/referencias` (alta/edición). Coherencia de origen, P3 vía `UNIQUE`→409, `fecha_inicio` servidor, `PATCH` R9. 4 archivos. **Ejecutado en la misma sesión que M3 por instrucción explícita de Sebastian** (excepción a "una tarea = una sesión"). ⚠️ `referencias` sin aplicar a Neon. |
| 2026-09-08 | M5 · lista tres formas | ✅ aceptada | Cierre ordenado sobre gate verde `ui · inversionistas`. Filtro 4 botones, unión client-side, baja P6, `—` en referidos activos. 5 archivos + App.tsx (borrador previo). **Verificación visual 375/768/1440 pendiente de aplicar M1 a Neon** (la pantalla 500a sin la tabla). **Siguiente tarea en la misma sesión por instrucción explícita** (excepción a "una tarea = una sesión", como M3/M4). |
| 2026-09-08 | M6 · columnas de deuda | ✅ aceptada | Cierre ordenado sobre gate verde `ui · inversionistas`. `—` con tooltip mientras M12 esté bloqueada (nunca `0.00`); orden *se le debe* desc comparando NUMERIC como string, sin float. 4 archivos. **Siguiente tarea en la misma sesión por instrucción explícita.** |
| 2026-09-08 | M23 · GET con referencias | ✅ aceptada | Cierre ordenado sobre gate verde `logic · inversionistas`. `referencias[]` + `origen_nombre` por join en servidor, una fila por origen (R16). 2 archivos. ⚠️ 500a hasta aplicar M2 a Neon. **Siguiente tarea en la misma sesión por instrucción explícita.** |
| 2026-09-08 | M24 · id navegable del origen | ✅ aceptada | Cierre ordenado sobre gate verde `logic · inversionistas`. `origen_inversionista_id` en `referencias[]` para que M7 navegue a `/inversionistas/:id`; préstamos ya navegaban con `prestamo_id`. 2 archivos. **Siguiente tarea en la misma sesión por instrucción explícita.** |
| 2026-09-09 | M22 · form alta/edición referenciador | ✅ aceptada | Cierre ordenado sobre gate verde `ui · inversionistas`. Reusa `Campo` (P5) y `FileDropZone accept` PDF (M25); alta crea forma 3 (FLUJOS §2 no lista `inversionista_id` — la liga a inversionista queda fuera del form). **6 archivos, excepción a ≤5 autorizada.** Verificación visual pendiente de aplicar M1/M2 a Neon. |
| 2026-09-09 | M25 · FileDropZone prop `accept` | ✅ aceptada | Cierre ordenado sobre gate verde `ui · inversionistas` (shared sin docs propios). Tarea propia de componente compartido (prohibición 2), nacida de M22; default intacto. 1 archivo. **Cadena de tareas en la misma sesión por instrucción explícita.** |
| 2026-09-09 | M8 · alerta inversión sin préstamo | ❌ descartada | Sin código. La liga se hace desde préstamos al crear el préstamo (`participantes_prestamo`); la condición del banner no puede darse. Decisión de Sebastian en sesión. |
| 2026-09-09 | M21 · form legacy a escala nueva | ✅ aceptada | Cierre ordenado sobre gate verde `ui · inversionistas`. Tasa referidor a % con 2 decimales (`0.50 = 0.5%`), string pass-through. 1 archivo. **Cadena de tareas en la misma sesión por instrucción explícita.** |
| 2026-09-08 | M7 · detalle por origen | ✅ aceptada | Cierre ordenado sobre gate verde `ui · inversionistas`. Desglose una fila por origen (R16), totales en `—`, sin botón de pagar. Navegación de lista conectada. 5 archivos. Verificación visual pendiente de aplicar M1/M2 a Neon. **Siguiente tarea en la misma sesión por instrucción explícita.** |
| 2026-08-19 | M10 (split) | — | El `DROP asignado_a` no corría: ~8 archivos (backend + 6 de frontend) leen la columna. Se parte en M10a (logic, backend deja de leer), M10b (ui, frontend deja de leer), M10 (data, DROP, dependiente). M10b lleva 6 archivos como excepción a ≤5 porque el tipo `AsignadoA` los acopla. Bloque A: 11 → 13 tareas. |
| 2026-08-19 | M10a | — | `gate.sh` → `CMD_TEST_MODULO` con `--passWithNoTests`: un módulo sin tests pasa en vez de reventar (vitest sale 1 con filtro sin match). Override de proyecto, no toca la base. Deuda de fondo: cero tests por módulo. |
