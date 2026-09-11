# Estado — Carlos Torres Torija

> Lo mantiene **Claude Code** al cerrar cada tarea (`/cerrar-tarea`).
> Es el punto de reentrada: una sesión nueva lee esto y sabe dónde está.

**Metodología:** v0.1.2  ·  **Perfil:** frontback-drizzle (con overrides — ver `gate.sh`)
**Rama activa:** `rediseno-referidor-inversionista`
**Última actualización:** 2026-09-11 · **RELEASE COMPLETO, VALIDADO Y DESPLEGADO**
(2026-09-11: frontend a Vercel, backend a Railway; Railway re-ligado al repo
`carlos-torres-torija` → push a `main` auto-despliega el backend).
Las 7 decisiones (R22–R24, ⛔4/⛔5→M28/M29, criterio de M14 y rechazo de monto
excedente en M19) quedaron **validadas el 2026-09-10**: Sebastian confirmó que
provienen de los requerimientos que levantó con la oficina. Sin pendientes de
negocio. Push y deploy hechos el 2026-09-11 por Claude con autorización
explícita de Sebastian (excepción puntual a la prohibición 5).
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
sin botón de pagar; edición precarga y persiste. El hallazgo "Invalid Date" en
la tarjeta de inversión se corrigió en M27 (mismo día).

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
| inversionistas / referenciadores | ✅ **release completo y validado** (22 ✅ · 1 ❌ / 23; Bloques A/B/C) | 41 ✅ (controllers nuevos, pool mockeado) | préstamos (lectura) | M33 · tests de controllers del release (2026-09-11) |
| comisiones-motor | ✅ **Bloque B completo** (M12–M16) + limpieza | 29 ✅ (motor + lib dinero; los 14 de referencia se retiraron con el huérfano) | inversionistas | M32 · limpieza de código huérfano (2026-09-11) |
| dashboard | ✅ legacy funcional, documentado post-hoc | 0 | ingresos, egresos, nómina | Fase 0 (modularización) |
| auth / clientes / inversionistas / prestamos / cobros / pagos / ingresos / egresos / cuentas_pagar / nominas / tesoreria / juicios | ✅ legacy funcional | 0 | — | sin spec de metodología |
| ~~personas~~ / ~~comisiones~~ | ❌ DESCARTADOS como módulos | 14 | — | docs en `_to_delete/`; ver "Código huérfano" |

Estados: `⬜ pendiente` · `🟡 en curso` · `✅ legacy funcional` · `🚫 bloqueado` · `❌ descartado`

---

## Bloqueos activos

**Ninguno.** Las 5 ⛔ se resolvieron el **2026-09-09** (R22–R24 + M28/M29) y las
7 decisiones del release quedaron **validadas el 2026-09-10**: Sebastian
confirmó que provienen de los requerimientos que levantó con la oficina.

> Un módulo bloqueado por regla de negocio sin definir **no entra al backlog**.
> No se marca TODO — se detiene.

---

## Código huérfano por el rediseño

**Resuelto el 2026-09-11 (M32):** con M13–M15 verdes, la referencia viva ya no
hacía falta. Controllers, rutas y `modules/comisiones/` (reparto, fifo y sus 14
tests) se movieron a `_to_delete/backend-huerfano/` — nada se borró, la carpeta
la vacía Sebastian (prohibición 8). Rutas desmontadas de `index.ts`;
`CMD_TEST_CASOS` reapuntado a `modules/motor`.

**Queda en Neon, sin uso:** `personas`, `persona_documentos`, `aportaciones`,
`pagos` (las huérfanas `devengos` y `pago_aplicaciones` ya se renombraron a
`*_descartado` en M12/M30). Retirarlas es una tarea `data` propia, con respaldo
`_respaldo_*` y `.down.sql`. Sin urgencia: 0 filas útiles.

---

## Deuda técnica

- [~] **Dinero en float (legacy)** — atacada el 2026-09-09 con corte quirúrgico:
      - **Hecho:** `backend/src/lib/dinero.ts` (suma/resta/piso-cero/comparación
        exactas en centavos, con tests) y migrados los sitios **neutrales al
        redondeo** que escriben saldos o validan desgloses: `pagos` (nuevoSaldo),
        `nominas` (descuento de préstamo ×2), `egresos` (desglose
        capital+interés+IVA, que además pasó de tolerar ±$0.01 a exigir igualdad
        exacta — la tolerancia solo existía por el drift de float).
      - **Pendiente a propósito (~45 sitios):** las fórmulas `base × tasa / 100`
        de cobros/egresos/nómina usan `toFixed` (redondeo bancario errático);
        migrarlas a half-up **cambia centavos cobrados/pagados** → cada fórmula
        necesita visto bueno de negocio antes de tocarse. Los `parseFloat` de
        solo-display/porcentajes son inofensivos (2 decimales es exacto en
        double) y no se tocan.
- [x] ~~**Dos escalas de tasa**~~ — resuelta el 2026-09-09: M11 aplicada a Neon
      (`tasa_referenciador` ya es `NUMERIC(5,2)`, 0.50 = 0.5%) y M21 alineó el
      form legacy. Todo el sistema usa porcentaje con 2 decimales.
- [~] **Backend sin tests de controllers** — atacada el 2026-09-11 (M33): los 3
      controllers nuevos del release (`referenciadores`, `referencias`,
      `pagos_devengo`) tienen 41 tests unitarios con `pool` mockeado.
      **Pendiente:** los ~13 controllers legacy (auth, prestamos, cobros,
      pagos, etc.) siguen sin tests — cubrir al tocarlos, no en un big bang.
- [x] ~~**Sin script de lint.**~~ — resuelta el 2026-09-09: `npm run lint` en
      frontend (`eslint --max-warnings=0`, config de CRA, cero deps nuevas),
      cableado a `CMD_LINT` del gate. El único warning que existía se limpió.
      Backend queda cubierto por typecheck (eslint propio sería dep nueva —
      decidir si vale en ticket futuro).
- [ ] **Migraciones manuales, sin runner.** SQL plano en `database/`, aplicado a
      mano a Neon vía `scripts/apply-migration.js`. `CMD_MIGRATE_*` vacíos → el
      gate `data`/`full` **no verifica migraciones**. Las verifica el humano.
- [x] ~~**Migraciones NO aplicadas + workarounds del dashboard**~~ — resuelta el
      2026-09-09: `ingresos_directos`/`metricas_cancha` creadas (el INSERT de
      Ingresos Extras tronaba en 500), espejo redirigido a
      `historial_ingresos_central` con origen `'Otros'` (CHECK ampliado), y
      `otros` del dashboard ya lee dato real. `pensiones_activas=0` es
      definitivo (módulo eliminado). Obsoletas movidas a `_to_delete/database/`.
      Detalle en `docs/modulos/dashboard/DATOS.md`.
- [x] ~~**Sin e2e/responsive.**~~ — resuelta el 2026-09-09:
      `frontend/e2e/responsive.spec.ts` (@playwright/test con el Chrome
      instalado, `channel`, sin descarga de navegadores): 7 pantallas × 3
      viewports = 21 tests — cero scroll horizontal, cero error de consola,
      evidencia PNG en `e2e/__screens__/` (gitignored). Sesión con JWT firmado
      localmente contra un admin real de la DB. Cableado a
      `CMD_E2E_RESPONSIVE`; levanta/reusa los dev servers solo
      (`webServer` de playwright). **El perfil `ui` del gate quedó 7/7, 0 sin
      declarar.**
- [x] ~~**`docs/DISENO.md` con marcas `{{TODO}}`**~~ — resuelta el 2026-09-09:
      tokens semánticos extraídos del uso real (slate/sky), tipografía sistema,
      inventario completo de `shared/` (incluye `RoleGuard`, que faltaba).
      Hallazgo: `tailwind.config.js` aún define `naranja.*` del tema viejo,
      sin uso — limpieza en ticket propio.
- [x] ~~**Validación de entrada laxa en endpoints nuevos de referencias**~~ —
      resuelta el 2026-09-09 (M26): UUID/tasa/fecha_fin validados antes de la DB,
      400 en español. La mitad legacy (`crearInversion`) se cerró el mismo día
      con **M31**.
- [x] ~~**Working tree con ~140 archivos modificados**~~ — resuelta el
      2026-09-09. El diagnóstico de CRLF era **incorrecto**: eran cambios reales
      sin commitear (rebranding OFICINA TS→PrestaFácil, schema/seed sin
      `asignado_a`, `.claudeignore`). Commiteados en 3 commits temáticos por
      instrucción de Sebastian. `core.autocrlf=true` funciona bien; no hizo
      falta `.gitattributes`. Sin trackear a propósito: `_to_delete/`,
      `graphify-out/`, `.playwright-mcp/`.

---

## Decisiones de arquitectura

| Fecha | Tarea | Decisión | Por qué |
|---|---|---|---|
| 2026-09-11 | M33 | **Tests de controllers unitarios con `pool` mockeado (`vi.mock`), no E2E contra Neon** | Sin dependencia nueva (nada de supertest), corren en ms dentro del gate y no dependen de red/DB. El FIFO del pago se ejercita con el motor real, no mockeado. El E2E contra Neon ya existe como smoke en cierres de tarea. |
| 2026-09-11 | M32 | **El código huérfano se descarta, no se porta** — a `_to_delete/backend-huerfano/` | El motor nuevo (M13–M15) reimplementó reparto/FIFO con sus propios casos resueltos y quedó verde; mantener dos implementaciones del mismo algoritmo es el riesgo, no el seguro. Las tablas de Neon quedan para tarea `data` propia. |
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
| 2026-09-09 | M31 · endurecer legacy crearInversion | ✅ aceptada | Cierre sobre gate verde `logic`. Deuda de M4 saldada por completo (M26 + M31). Smoke 3 casos → 400. |
| 2026-09-09 | M28 · solo admin liga referencias | ✅ aceptada | Cierre sobre gate verde `logic`. `roleMiddleware` en POST/PATCH referencias (⛔4=A). Smoke 403/400. |
| 2026-09-09 | M29 · estados solo hacia adelante | ✅ aceptada | Cierre sobre gate verde `logic`. Revivir y tasa fuera de `activa` → 400 (⛔5=A). Smoke 5 casos. **Release completo.** |
| 2026-09-09 | M20 · filtro inv/referenciadores | ✅ aceptada | Cierre ordenado sobre gate verde `ui · inversionistas`. Filtro client-side verificado en navegador (6→2→4→6). **Bloque C completo.** |
| 2026-09-09 | M18 · pantalla de pendientes | ✅ aceptada | Cierre ordenado sobre gate verde `ui · inversionistas`. Pestaña Devengos en Hub de Egresos; R14/R15/R17/R19 en la UI; totales BigInt. Verificación visual 1440/375 con datos sembrados y borrados. `tsconfig` frontend target→ES2020 (BigInt); hizo falta limpiar `node_modules/.cache` del checker de CRA. |
| 2026-09-09 | M19 · registrar pago de devengos | ✅ aceptada | Cierre ordenado sobre gate verde `logic · inversionistas`. POST transaccional con FIFO del motor; solo admin; comprobante+autorización obligatorios (R19); exceso de monto → 400 (R16/R22: el sobrante no tiene destino legal). Smoke E2E contra Neon, datos borrados. |
| 2026-09-09 | M17 · pendientes con concepto comision | ✅ aceptada | Cierre ordenado sobre gate verde `logic · inversionistas`. GET de pendientes por línea (R16/R15); R17 estructural en la respuesta. Smoke contra Neon con datos temporales, borrados al final. |
| 2026-09-09 | M30 · tablas pagos_devengo + pago_aplicaciones | ✅ aceptada | Cierre ordenado sobre gate verde `data · inversionistas`. Tarea nueva: MODULO.md exigía las tablas y ninguna M del Bloque C las creaba. Huérfana `pago_aplicaciones` renombrada (nada se borra). Aplicada a Neon. |
| 2026-09-09 | M16 · dinero canónico sin float | ✅ aceptada | Cierre ordenado sobre gate verde `logic`. `dinero.ts` con validación estricta; BigInt centavos en vez de lib Decimal (decisión: exacto, sin dependencia nueva). Legacy intacto (ticket propio en deuda). **Bloque B completo.** |
| 2026-09-09 | M15 · aplicación FIFO por origen | ✅ aceptada | Cierre ordenado sobre gate verde `motor`. R16 blindada por diseño (líneas mezcladas → error). Nota de proceso: los tests se escribieron antes que el código pero no se corrió el rojo esta vez. |
| 2026-09-09 | M14 · comisiones con base viva | ✅ aceptada | Cierre ordenado sobre gate verde `motor`. Base viva del origen al corte (R3), moratorios jamás en base (R8/C13). ⚠️ **Criterio derivado, validar con Carlos al final:** préstamo `atrasado`/`en_juicio` sí devenga comisión (R9+R11); inversión solo `activo`. |
| 2026-09-09 | M13 · corte mensual idempotente | ✅ aceptada | Cierre ordenado sobre gate verde `motor · comisiones-motor` (casos resueltos + tests + typecheck). TDD: CASOS-RESUELTOS.md C1–C7 primero, rojo→verde. Dinero en BigInt centavos (sin float ni dependencia nueva; M16 decidirá si se formaliza con Decimal). Alcance: rendimiento; comisiones → M14. |
| 2026-09-09 | M12 · tabla devengos | ✅ aceptada | Cierre ordenado sobre gate verde `data · comisiones-motor`. La `devengos` huérfana (0 filas) se renombró a `devengos_descartado` — nada se borra; sus índices también, porque bloqueaban los nombres globales. Ciclo up/down/reaplica + 4 pruebas funcionales (23505, CHECKs). Aplicada a Neon. |
| 2026-09-11 | M33 · tests de controllers del release | ✅ aceptada | Cierre sobre gate verde `logic · inversionistas` 6/6. 41 tests unitarios (pool mockeado, FIFO real), suite total 70 ✅. Tarea elegida por Sebastian ("haz la de tests de controllers"). |
| 2026-09-11 | M32 · limpieza de código huérfano | ✅ aceptada | Cierre sobre gate verde `motor · comisiones-motor` 8/8. Huérfano a `_to_delete/backend-huerfano/`, rutas desmontadas, `CMD_TEST_CASOS`→`modules/motor` (29 tests). Autorizada por Sebastian en sesión ("seguimos" sobre la propuesta). |
| 2026-09-10 | validación de las 7 decisiones | ✅ validadas | Sebastian confirma que las 7 (R22–R24, ⛔4/⛔5, criterio M14, rechazo de excedente M19) vienen de los requerimientos que él levantó con la oficina. **Release cerrado; sin pendientes de negocio.** |
| 2026-09-09 | ⛔1–⛔5 | ✅ resueltas | **Sebastian decide; Carlos valida al final del release** (instrucción en sesión). ⛔1→R22 (sin orden automático, la oficina elige pago por pago), ⛔2→R23 (nunca absorbe en automático, todo devenga hasta pago manual), ⛔3→R24 (2 decimales, residuo a la oficina), ⛔4→A (solo admin, M28), ⛔5→A (estados solo adelante, M29). |
| 2026-09-09 | M27 · fix Invalid Date en CardInversion | ✅ aceptada | Cierre ordenado sobre gate verde `ui · inversionistas`. `DATE` de pg llega como ISO completo; se normaliza a `YYYY-MM-DD` antes de parsear. Verificado en navegador. 1 archivo. |
| 2026-09-09 | M26 · endurecer validación /api/referencias | ✅ aceptada | Cierre ordenado sobre gate verde `logic · inversionistas`. Deuda de seguridad de M4 saldada en lo nuevo; smoke test de 6 casos contra el server (datos temporales creados y borrados). 1 archivo. Elegida por Sebastian ante backlog bloqueado. |
| 2026-09-09 | M22 · form alta/edición referenciador | ✅ aceptada | Cierre ordenado sobre gate verde `ui · inversionistas`. Reusa `Campo` (P5) y `FileDropZone accept` PDF (M25); alta crea forma 3 (FLUJOS §2 no lista `inversionista_id` — la liga a inversionista queda fuera del form). **6 archivos, excepción a ≤5 autorizada.** Verificación visual pendiente de aplicar M1/M2 a Neon. |
| 2026-09-09 | M25 · FileDropZone prop `accept` | ✅ aceptada | Cierre ordenado sobre gate verde `ui · inversionistas` (shared sin docs propios). Tarea propia de componente compartido (prohibición 2), nacida de M22; default intacto. 1 archivo. **Cadena de tareas en la misma sesión por instrucción explícita.** |
| 2026-09-09 | M8 · alerta inversión sin préstamo | ❌ descartada | Sin código. La liga se hace desde préstamos al crear el préstamo (`participantes_prestamo`); la condición del banner no puede darse. Decisión de Sebastian en sesión. |
| 2026-09-09 | M21 · form legacy a escala nueva | ✅ aceptada | Cierre ordenado sobre gate verde `ui · inversionistas`. Tasa referidor a % con 2 decimales (`0.50 = 0.5%`), string pass-through. 1 archivo. **Cadena de tareas en la misma sesión por instrucción explícita.** |
| 2026-09-08 | M7 · detalle por origen | ✅ aceptada | Cierre ordenado sobre gate verde `ui · inversionistas`. Desglose una fila por origen (R16), totales en `—`, sin botón de pagar. Navegación de lista conectada. 5 archivos. Verificación visual pendiente de aplicar M1/M2 a Neon. **Siguiente tarea en la misma sesión por instrucción explícita.** |
| 2026-08-19 | M10 (split) | — | El `DROP asignado_a` no corría: ~8 archivos (backend + 6 de frontend) leen la columna. Se parte en M10a (logic, backend deja de leer), M10b (ui, frontend deja de leer), M10 (data, DROP, dependiente). M10b lleva 6 archivos como excepción a ≤5 porque el tipo `AsignadoA` los acopla. Bloque A: 11 → 13 tareas. |
| 2026-08-19 | M10a | — | `gate.sh` → `CMD_TEST_MODULO` con `--passWithNoTests`: un módulo sin tests pasa en vez de reventar (vitest sale 1 con filtro sin match). Override de proyecto, no toca la base. Deuda de fondo: cero tests por módulo. |
