# Código al momento — Carlos Torres Torija

> **Corte:** 2026-09-16 · commit `df7a812` · rama `main` (el release se desarrolló
> en `rediseno-referidor-inversionista`, ya integrado).
> **Propósito:** volcado completo del estado real del sistema para contrastarlo
> contra lo que falta por crear. Todo lo de aquí está verificado contra el código,
> contra Neon en vivo y contra la suite de tests (127 ✅ al momento de escribir).

---

## Índice

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Stack, infraestructura y deploy](#2-stack-infraestructura-y-deploy)
3. [Estructura del repositorio](#3-estructura-del-repositorio)
4. [Metodología de trabajo (gate, tareas, prohibiciones)](#4-metodología-de-trabajo)
5. [Modelo de datos vivo en Neon](#5-modelo-de-datos-vivo-en-neon)
6. [Migraciones](#6-migraciones)
7. [API — inventario completo de endpoints](#7-api--inventario-completo-de-endpoints)
8. [Frontend — rutas, menú, pantallas y diseño](#8-frontend--rutas-menú-pantallas-y-diseño)
9. [Reglas de negocio](#9-reglas-de-negocio)
10. [Motor de comisiones y aritmética de dinero](#10-motor-de-comisiones-y-aritmética-de-dinero)
11. [Tests y verificación](#11-tests-y-verificación)
12. [Backlog — las 45 modificaciones y su estado](#12-backlog--las-45-modificaciones-y-su-estado)
13. [Decisiones de arquitectura](#13-decisiones-de-arquitectura)
14. [Deuda técnica](#14-deuda-técnica)
15. [🔴 Huecos detectados — lo que el sistema NO puede hacer hoy](#15--huecos-detectados)
16. [Código y tablas descartados](#16-código-y-tablas-descartados)

---

## 1. Resumen ejecutivo

Sistema de gestión financiera para la oficina de Carlos Torres Torija: préstamos,
inversionistas, referenciadores, ingresos/egresos, tesorería, nómina y juicios.

- **No hay producción.** La DB (Neon) es de **desarrollo**, con datos demo del seed.
- **Escala:** 116 commits · ~11,050 líneas de backend (+1,807 de tests) ·
  ~21,812 líneas de frontend · 306 archivos indexados en el grafo.
- **Release terminado:** *Referenciadores* — 33 tareas (Bloques A, B, C +
  post-release + serie de dinero half-up). 32 ✅ · 1 ❌ descartada (M8).
- **Sin bloqueos de negocio.** Las 5 ⛔ se resolvieron el 2026-09-09 (R22–R24,
  ⛔4→M28, ⛔5→M29) y Sebastian validó las 7 decisiones el 2026-09-10.
- **Deuda de dinero cerrada** el 2026-09-15 con la serie M38–M44: el backend ya
  no tiene un solo `toFixed` sobre dinero (quedan 7, todos ratios de display).
- **Lo que existe pero no está conectado:** el motor de devengos y el ligado de
  referencias. Ver [§15](#15--huecos-detectados).

### Módulos y su estado

| Módulo | Estado | Tests |
|---|---|---|
| inversionistas / referenciadores | ✅ release completo y validado | 83 (controllers, pool mockeado) |
| comisiones-motor | ✅ Bloque B completo (M12–M16) + helpers half-up | 41 (motor + lib dinero) |
| dashboard | ✅ legacy funcional, documentado post-hoc, display exacto | 3 (caracterización) |
| auth, clientes, prestamos, cobros, pagos, ingresos, egresos, cuentas_pagar, nominas, tesoreria, juicios | ✅ legacy funcional | 0 (deuda) |
| ~~personas~~ / ~~comisiones~~ | ❌ descartados 2026-08-19 | — |

---

## 2. Stack, infraestructura y deploy

### Frontend
- React 19 + **CRA/CRACO** (no Vite, no Next) + TypeScript
- Tailwind CSS · react-router-dom v7 · recharts · lucide-react · axios · xlsx
- `tsconfig` target **ES2020** (subido en M18 por BigInt)
- Scripts: `start` `build` `test` (craco) · `lint` (`eslint --max-warnings=0`) ·
  `test:e2e` (playwright)
- **Deploy: Vercel** (2026-09-11)

### Backend
- Express 5 + ts-node + **`pg` (SQL crudo, sin ORM)** + JWT + bcrypt
- helmet · cors con allowlist + patrón opt-in de previews de Vercel
  (`VERCEL_PREVIEW_SUFFIX`, anclado al scope del equipo contra typosquatting)
- multer para subida de archivos (documentos en `bytea` dentro de Postgres)
- Tests: **Vitest** (`npm test` = `vitest run`)
- **Deploy: Railway**, ligado al repo `carlos-torres-torija` → push a `main`
  auto-despliega el backend

### Base de datos
- **PostgreSQL en Neon — entorno de desarrollo**
- Migraciones SQL planas en `database/`, aplicadas por Claude vía
  `node scripts/migrar.js up` (runner con tracking en la tabla `_migraciones`)
- Nuevas migraciones: par `<fecha>_<nombre>.up.sql` / `.down.sql`
- Al cerrar tarea `data`: `node scripts/migrar.js sellar`

### Variables de entorno (backend/.env)
`PORT` · `DATABASE_URL` · `JWT_SECRET` · `JWT_EXPIRES_IN` · `FRONTEND_URL` ·
`NODE_ENV` · `SEED_PWD_SEBASTIAN`

---

## 3. Estructura del repositorio

```
carlos torres torija/
├── CLAUDE.md                  ← router de 150 líneas, no manual
├── gate.sh                    ← compuerta de verificación (hereda de metodologia/)
├── backend/
│   └── src/
│       ├── index.ts           ← monta 17 routers
│       ├── config/database.ts
│       ├── controllers/       ← 15 controllers + 10 archivos .test.ts
│       ├── routes/            ← 14 archivos de rutas
│       ├── models/            ← 7 modelos de tipos
│       ├── middlewares/       ← auth, role, magicBytes, validateUuid, validateIntId
│       ├── lib/dinero.ts      ← aritmética canónica de dinero (+ test)
│       └── modules/motor/     ← corte, aplicación FIFO, dinero (+ tests)
├── frontend/
│   ├── src/
│   │   ├── App.tsx            ← 30 rutas
│   │   ├── components/        ← por módulo + shared/
│   │   ├── pages/             ← por módulo
│   │   ├── services/          ← 14 servicios axios
│   │   ├── types/             ← 14 archivos de tipos
│   │   └── context/AuthContext.tsx
│   └── e2e/responsive.spec.ts ← 6 pantallas × 3 viewports = 18 tests
├── database/                  ← 66 archivos .sql (migraciones + seeds + schema)
├── scripts/                   ← migrar.js · apply-migration.js · generate-passwords.js
├── docs/                      ← ver abajo
├── graphify-out/              ← grafo de conocimiento (2,159 nodos, 3,558 aristas)
└── _to_delete/                ← descartes, los vacía Sebastian (prohibición 8)
```

### Documentación (`docs/`)

| Archivo | Qué contiene | Cuándo se abre |
|---|---|---|
| `ESTADO.md` | estado, bloqueos, deuda, decisiones, bitácora de aceptación | arrancar el día |
| `BACKLOG.md` | las 45 modificaciones con su estado y criterios extra | arrancar el día |
| `DISENO.md` | tokens, tipografía, componentes canónicos, prohibiciones de UI | tareas `ui` |
| `DINERO.md` | reglas D1–D4 + casos C1–C5 de aritmética | tareas de dinero |
| `DEFINICION-DE-HECHO.md` | qué corre el gate aquí + lista humana no delegable | verificar |
| `DEFINICION-DE-LISTO.md` | compuerta de especificación (8 criterios) | especificar módulo |
| `CORRECCIONES.md` | escalera de ascenso de correcciones (👀 → 🔒 → ⚙️ → 🌎) | — |
| `PARA-CARLOS-referenciadores.md` | las 7 preguntas de negocio y sus respuestas | junta con Carlos |
| `modulos/inversionistas/` | MODULO · REGLAS (P1–P7) · DATOS · FLUJOS · MODIFICACIONES | por tipo de tarea |
| `modulos/comisiones-motor/` | REGLAS (R1–R24) · CASOS-RESUELTOS (C1–C19) | tareas `motor` |
| `modulos/dashboard/` | MODULO · REGLAS (R1–R3) · DATOS | tareas del dashboard |

---

## 4. Metodología de trabajo

### El gate (`gate.sh`)
Hereda de `metodologia/base/gate.base.sh` v0.1.2, perfil `frontback-drizzle` con
overrides pesados (este fork usa CRA/CRACO + `pg` raw, no Drizzle).

| Comando declarado | Qué corre |
|---|---|
| `CMD_TYPECHECK` | `tsc --noEmit` en backend **y** frontend |
| `CMD_LINT` | `npm run lint --prefix frontend` |
| `CMD_TEST` | `npm test --prefix backend` (vitest run) |
| `CMD_TEST_MODULO` | igual + `--passWithNoTests` |
| `CMD_BUILD` | `npm run build --prefix frontend` |
| `CMD_MIGRATE_UP` / `DOWN` | `node scripts/migrar.js up` / `down` |
| `CMD_SEED` | `node scripts/apply-migration.js database/seed_datos_demo.sql` |
| `CMD_E2E_RESPONSIVE` | `npm run test:e2e --prefix frontend` |
| `CMD_TEST_CASOS` | `npm test --prefix backend -- modules/motor` |

Perfiles: `data` (9/9) · `logic` (6/6) · `ui` (7/7) · `motor` (8/8) · `full` (12/12).
**El check `dinero-sin-float` existe pero NO está activado como bloqueante.**

### Tipos de tarea
`data` (migración/schema) · `logic` (backend) · `ui` (frontend) · `motor` (cálculo puro)

### Reglas de tamaño de una tarea (las 5, no se negocian)
1. Toca **un** módulo
2. Toca **≤5** archivos
3. **Pasa el gate por sí sola**
4. Cabe en un commit con mensaje de una línea
5. Si el título necesita "y", son dos tareas

### Prohibiciones del proyecto
1. Una tarea = una sesión (se ha exceptuado con autorización explícita).
2. No tocar `components/shared/` dentro de una tarea de módulo — es tarea propia.
3. **No inventar reglas de negocio.** Si `REGLAS.md` no lo dice, parar y preguntar.
4. No arrancar una tarea 🚫.
5. **No correr deploy.** (Se exceptuó el 2026-09-11 con autorización.)
6. No cerrar una tarea con el gate rojo.
7. Migraciones a Neon (dev) las aplica Claude vía el runner, siempre con su
   `.down.sql` escrito antes y verificación de conteos después. Cuando exista
   producción, esta regla se revierte.
8. No borrar nada de `_to_delete/`.

### Convenciones de código
- Código y comentarios en **inglés**; UI y explicaciones en **español**.
- Dinero: `NUMERIC` en DB; montos como **string** + aritmética de `lib/dinero.ts`
  en código nuevo. (Deuda legacy: `parseFloat` en los controllers — mitigada.)
- **Tasas: porcentaje con 2 decimales.** `0.50` = 0.5%, `monto = base * tasa / 100`.
- Fechas las genera el servidor (`now()` / `current_date`), nunca el cliente.
- **Nada se borra.** Archivado con bandera de estado.
- API nueva: `{ success, data, error }`. Errores con mensaje en español.
  (La API legacy usa `{ mensaje }` — no se tocó.)

---

## 5. Modelo de datos vivo en Neon

> Volcado directo de `information_schema` + `pg_stat_user_tables` el 2026-09-16.
> Los conteos son de la DB de desarrollo con seed demo.
> **52 tablas + 2 vistas** en el schema `public`.
>
> ⚠️ `deudas_bancarias` y `creditos_bancarios` están en `database/*.sql` pero
> **no existen en Neon** — sus migraciones nunca se aplicaron o fueron eliminadas
> por `migration_remove_modules`. No construir sobre ellas sin verificar primero.

### 5.1 Núcleo — préstamos y clientes

**`clientes`** (8 filas) — `id uuid PK` · nombres · apellido_paterno · apellido_materno ·
fecha_nacimiento · rfc · curp · telefono_celular · telefono_adicional · correo ·
calle · numero_exterior · numero_interior · colonia · municipio · estado ·
codigo_postal · ocupacion · nombre_trabajo · telefono_trabajo ·
`estatus varchar(20) NOT NULL DEFAULT 'activo'` · ubicacion_expediente ·
registrado_por · fecha_registro · fecha_actualizacion

**`prestamos`** (10 filas) — `id uuid PK` · cliente_id · folio ·
`tipo_garantia DEFAULT 'hipotecaria'` · `monto_prestado numeric(12,2)` ·
`saldo_pendiente numeric(12,2)` · valor_propiedad · `tasa_interes_mensual numeric(5,2)` ·
`tasa_moratoria_mensual numeric(5,2)` · plazo_meses · interes_anticipado ·
cantidad_entregada · apertura · avaluo · gastos_notariales · fecha_inicio ·
fecha_vencimiento · notaria · url_contrato · descripcion_garantia ·
url_evidencia_garantia · `estatus DEFAULT 'documentos_incompletos'` · renovado ·
prestamo_anterior_id · url_contrato_renovacion · notas · registrado_por ·
`comision_gestion_pct numeric(5,2)` · aval_nombre · fecha_proximo_pago

**`participantes_prestamo`** (10 filas) — liga **inversionista → préstamo**.
`id` · prestamo_id · inversionista_id · `es_oficina bool` · `monto_aportado numeric(12,2)` ·
`tasa_rendimiento numeric(5,2)` · `interes_mensual numeric(12,2)` · registrado_por

> ⚠️ Ésta es la única liga inversión↔préstamo del schema. Es **por inversionista**,
> no por inversión. Por eso M8 se descartó.

**`historial_pagos_prestamo`** (0) · **`moratorios_prestamo`** (0) ·
**`documentos_prestamo`** (0) · **`archivos_prestamo`** (0, contenido en `bytea`) ·
**`obligaciones_cobro_prestamo`** (0, proyección de CxC)

### 5.2 Inversionistas y referenciadores

**`inversionistas`** (4 filas) — `id uuid PK` · nombres · apellido_paterno ·
apellido_materno · telefono · correo · url_ine · registrado_por ·
`capital_aportado_total numeric(12,2)` · `capital_disponible numeric(12,2)` ·
`dia_pago_pactado int DEFAULT 30` · **`numero_cuenta varchar(30)`** ·
**`banco varchar(60)`** (M9)
*(`asignado_a` fue eliminada en M10; respaldo en `_respaldo_asignado_a`, 4 filas.)*

**`inversiones`** (4 filas) — `id` · inversionista_id · `monto_inicial numeric(12,2)` ·
`monto_actual numeric(12,2)` · `tasa_interes_mensual numeric(5,2)` · dia_pago ·
forma_ingreso · cuenta_deposito · tiene_pagare · url_pagare ·
`estatus DEFAULT 'activo'` · fecha_inicio · fecha_vencimiento · notas ·
**`referenciador_id uuid`** · **`tasa_referenciador numeric(5,2)`**

> ⚠️ `referenciador_id` está **deprecada** (apunta a `inversionistas(id)`, no a
> `referenciadores(id)`) y `tasa_referenciador` ya fue convertida a escala nueva
> por M11. **La sustituye `referencias`.** No se borró porque el frontend legacy
> todavía la escribe — ver [§15](#15--huecos-detectados).

**`referenciadores`** (1 fila) — **tabla nueva (M1)**
`id uuid PK` · nombres NOT NULL · apellido_paterno NOT NULL · apellido_materno ·
telefono · correo · direccion · url_ine · numero_cuenta · banco ·
**`inversionista_id uuid`** (NULL = forma 3) · `activo bool NOT NULL DEFAULT true` ·
registrado_por · fecha_registro · fecha_actualizacion
Índices: `idx_referenciadores_nombre` · `idx_referenciadores_inversionista` (parcial)

**`referencias`** (**0 filas**) — **tabla nueva (M2)**
`id uuid PK` · referenciador_id NOT NULL · `tipo_referido` CHECK IN
('inversion','prestamo') · inversion_id · prestamo_id · `tasa numeric(5,2) NOT NULL
CHECK (tasa > 0)` · `estado DEFAULT 'activa'` CHECK IN ('activa','terminada','cancelada') ·
fecha_inicio NOT NULL · fecha_fin · notas · registrado_por
Constraints: `ref_origen_coherente` · `ref_unica_inversion UNIQUE` ·
`ref_unica_prestamo UNIQUE` · índice parcial `idx_referencias_referenciador`

**`devengos`** (**0 filas**) — **tabla nueva (M12)**
`id` · inversionista_id · referenciador_id · `concepto` CHECK IN
('rendimiento','comision') · `origen_tipo` CHECK IN ('inversion','prestamo') ·
origen_id NOT NULL · periodo_mes CHECK 1–12 · periodo_anio ·
**`base_capital numeric(12,2)`** y **`tasa numeric(5,2)`** (congelados, R18) ·
`monto_devengado numeric(12,2)` · `monto_pagado numeric(12,2) DEFAULT 0` ·
`estado DEFAULT 'pendiente'` CHECK IN ('pendiente','parcial','pagado','cancelado')
Constraints: `dev_un_beneficiario` · `dev_no_sobrepago`
Índices: **`devengos_idempotente` UNIQUE** (R20) · `devengos_fifo` (parcial)

**`pagos_devengo`** (**0 filas**) — **tabla nueva (M30)**
`id` · inversionista_id · referenciador_id · concepto · `monto numeric(12,2) CHECK > 0` ·
fecha_pago · `forma_pago` CHECK IN ('efectivo','transferencia','deposito') ·
numero_cuenta · banco · **`url_comprobante TEXT NOT NULL`** ·
**`autorizado_por uuid NOT NULL`** · fecha_autorizacion · notas
Constraints: `pago_un_beneficiario` · `pago_cuenta_coherente`

**`pago_aplicaciones`** (0) — `id` · pago_id · devengo_id · `monto CHECK > 0` ·
`UNIQUE (pago_id, devengo_id)` — trazabilidad del FIFO

**`historial_inversiones`** (0) · **`movimientos_inversionistas`** (0, log de la wallet)

### 5.3 Ingresos, egresos, tesorería, nómina, juicios

| Tabla | Filas | Para qué |
|---|---|---|
| `historial_ingresos_central` | 0 | ledger de cobros; **solo origen `'Prestamo'` y `'Otros'` vivos** |
| `historial_pagos_global` | 0 | pagos transversales con recibo |
| `recibos_pago` | 0 | PDF del recibo en `bytea` |
| `ingresos_directos` | 0 | ingresos por unidad de negocio |
| `metricas_cancha` | 0 | métrica anexa a un ingreso directo |
| `cuentas_por_pagar` | 0 | egresos: capital/interés/IVA, series, centro de costo |
| `cuentas_pagar` | 0 | CxP simple (rendimientos de inversionistas, manual) |
| `pagos_cuentas_pagar` | 0 | pago de una CxP, con voucher en `bytea` |
| `proveedores_beneficiarios` | 0 | catálogo de proveedores |
| `categorias_egresos` | 17 | catálogo con color y módulo |
| `cuentas_bancarias` | 5 | cuentas con saldo inicial/actual |
| `movimientos_caja` | 1 | caja chica, voucher en `bytea` |
| `traspasos` | 0 | movimiento entre cuentas |
| `categorias_movimiento` | 6 | catálogo de tesorería |
| `logs_auditoria` | 0 | log jsonb por módulo/tabla/acción |
| `empleados` | 4 | sueldo semanal, vacaciones, IMSS |
| `nominas_pagadas` | 1 | semana, horas extras, faltas, prima, bonos, ajuste, descuento de préstamo |
| `juicios` | 3 | etapa procesal, abogado, fecha crítica |
| `gastos_legales` / `documentos_juicio` / `bitacora_legal` | 0 | anexos del juicio |
| `usuarios` | 1 | 1 administrador activo |
| `bitacora_accesos` | 16 | log de login/logout |
| `referencias_cliente` | 0 | referencias personales del cliente (≠ `referencias`) |
| `documentos_cliente` | 0 | checklist documental |

**Vistas:** `cxc_prestamos` · `saldo_por_persona`
*(`saldo_por_persona` es residuo del módulo `personas` descartado — lee `persona_id`.)*

### 5.4 Tablas de control y respaldo
- `_migraciones` (44 filas) — nombre · aplicada_en · **sellada**
- `_respaldo_asignado_a` (4) · `_respaldo_tasa_referenciador` (0) ·
  `_respaldo_recalculo_half_up` (0)

### 5.5 Tablas descartadas (renombradas, no borradas)
`personas_descartado` (4) · `persona_documentos_descartado` (0) ·
`aportaciones_descartado` (4) · `pagos_descartado` (0) ·
`devengos_descartado` (0) · `pago_aplicaciones_descartado` (0)

---

## 6. Migraciones

**44 migraciones aplicadas y selladas** en Neon. El runner (`scripts/migrar.js`)
soporta `up` · `down` · `sellar` · `baseline` · `status`.

**Diseño clave — el sellado:** el `down` del gate solo revierte la migración de la
tarea en curso, nunca las de tareas cerradas (no-op si todo está sellado). Las 43
migraciones preexistentes entraron como baseline sellado sin ejecutarse.

### Migraciones del release (todas aplicadas el 2026-09-09 o después)

| Migración | Qué hizo |
|---|---|
| `migration_referenciadores.up/.down` | tabla `referenciadores` + 2 índices (M1) |
| `migration_referencias.up/.down` | tabla `referencias` + 3 constraints + deprecación de la columna vieja (M2) |
| `migration_inversionistas_datos_bancarios.up/.down` | `numero_cuenta` + `banco` (M9) |
| `migration_inversionistas_drop_asignado_a.up/.down` | respaldo + `DROP COLUMN` (M10) |
| `migration_tasa_referenciador_escala.up/.down` | `NUMERIC(6,4)→(5,2)`, ×100 (M11) |
| `migration_devengos.up/.down` | tabla `devengos` + idempotencia; la huérfana → `devengos_descartado` (M12) |
| `migration_pagos_devengo.up/.down` | `pagos_devengo` + `pago_aplicaciones` (M30) |
| `migration_tablas_huerfanas_descartadas.up/.down` | 4 tablas → `*_descartado` (M34) |
| `migration_ingresos_directos.up/.down` | `ingresos_directos` + `metricas_cancha` |
| `migration_hic_origen_otros.up/.down` | amplía el CHECK de origen a `'Otros'` |
| `2026-09-15_recalculo_half_up.up/.down` | recálculo retroactivo D3 (M44) |

**Patrones obligatorios:** toda migración trae `.down.sql`; si convierte o borra
datos, respaldo en tabla `_respaldo_*` dentro del `.up`; guardas de idempotencia;
la reversa aborta a propósito si hay filas reales (M12, M30).

---

## 7. API — inventario completo de endpoints

Base: `/api`. Autenticación por JWT (`authMiddleware`). Rol vía `roleMiddleware('administrador')`.

### auth
```
POST   /api/auth/login
POST   /api/auth/logout                          [auth]
GET    /api/auth/me                              [auth]
GET    /api/auth/usuarios                        [admin]
```

### clientes
```
GET    /api/clientes/stats
GET    /api/clientes
GET    /api/clientes/:id
POST   /api/clientes
PUT    /api/clientes/:id
PATCH  /api/clientes/:id/estatus
GET    /api/clientes/:id/documentos
PUT    /api/clientes/:id/documentos
GET    /api/clientes/:id/referencias
POST   /api/clientes/:id/referencias
DELETE /api/clientes/:id/referencias/:refId
```

### inversionistas e inversiones
```
GET    /api/inversionistas/stats
POST   /api/inversionistas/importar              [admin]
GET    /api/inversionistas
GET    /api/inversionistas/:id
POST   /api/inversionistas
PUT    /api/inversionistas/:id
GET    /api/inversionistas/:id/movimientos
POST   /api/inversionistas/:id/movimientos
GET    /api/inversionistas/:id/inversiones
POST   /api/inversionistas/:id/inversiones
PUT    /api/inversiones/:id
PATCH  /api/inversiones/:id/...
GET    /api/inversiones/:id/historial
POST   /api/inversiones/:id/historial
```

### referenciadores y referencias  ← **release**
```
GET    /api/referenciadores            lista, filtro forma=2|3
GET    /api/referenciadores/:id        detalle + referencias[] con origen_nombre
                                       y origen_inversionista_id (M23/M24)
POST   /api/referenciadores            alta
PATCH  /api/referenciadores/:id        edición + baja por `activo` (P6)

POST   /api/referencias                [admin] liga referenciador ↔ inversión|préstamo
PATCH  /api/referencias/:id            [admin] estado/tasa/fecha_fin/notas (R9, M29)
```
Envelope `{ success, data, error }`. Validación dura antes de tocar la DB (M26):
UUID, tasa con regex de 2 decimales y techo 999.99, fecha `AAAA-MM-DD` real.
P3 se resuelve capturando el `UNIQUE` (23505) → **409** en español.

### pagos de devengo  ← **release**
```
GET    /api/pagos-devengo/pendientes   por línea (beneficiario+concepto+origen, R16),
                                       slots FIFO dentro de la línea (R15),
                                       total_pendiente en centavos BigInt
POST   /api/pagos-devengo              [admin] transaccional: FOR UPDATE sobre la
                                       línea, aplicarPagoFifo, escribe pagos_devengo
                                       + pago_aplicaciones, actualiza devengos.
                                       Monto que excede la línea → 400 (R16/R22).
```

### préstamos, moratorios y cobros
```
GET    /api/prestamos/auditoria
GET    /api/prestamos/stats
POST   /api/prestamos/sincronizar-estatus
GET    /api/prestamos                    ·  GET /api/prestamos/:id
POST   /api/prestamos                    ·  PUT /api/prestamos/:id
PATCH  /api/prestamos/:id/...
POST   /api/prestamos/:id/...            (renovación)
GET    /api/prestamos/:id/pagos          ·  POST /api/prestamos/:id/pagos
GET    /api/prestamos/:id/moratorios     ·  POST /api/prestamos/:id/moratorios/calcular
PUT    /api/prestamos/:id/documentos
GET    /api/prestamos/:id/archivos       ·  GET /api/prestamos/:id/archivos/:tipo
POST   /api/prestamos/:id/archivos
PATCH  /api/moratorios/:id/...           (perdonar)
GET    /api/cobros/calendario
POST   /api/cobros/:id/registrar
```

### pagos globales
```
POST   /api/pagos/registrar              multipart, recibo obligatorio
GET    /api/pagos/recibo/:pagoId
GET    /api/pagos/historial/:referenciaId
GET    /api/pagos/cliente/:clienteId
GET    /api/pagos/deuda-activa/:clienteId
```

### egresos
```
GET    /api/egresos/stats · /alertas · /oficina/kpis
GET    /api/egresos/categorias           ·  POST /api/egresos/categorias
GET    /api/egresos/proveedores          ·  POST /api/egresos/proveedores
PUT    /api/egresos/proveedores/:id      ·  DELETE /api/egresos/proveedores/:id [admin]
GET    /api/egresos/cuentas              ·  GET /api/egresos/cuentas/:id
POST   /api/egresos/cuentas              ·  POST /api/egresos/cuentas/serie
PUT    /api/egresos/cuentas/:id          ·  PATCH /api/egresos/cuentas/:id/estatus
POST   /api/egresos/generar-rendimientos [admin]
```

### ingresos
```
GET    /api/ingresos/stats
GET    /api/ingresos/dashboard-central
GET    /api/ingresos/cxc-prestamos       ·  GET /api/ingresos/cxc-prestamos/proyeccion
POST   /api/ingresos/cxc-prestamos/generar-mes
GET    /api/ingresos/directos            ·  POST /api/ingresos/directos
PUT    /api/ingresos/directos/:id
```

### tesorería
```
GET/POST/PUT   /api/tesoreria/cuentas[/:id]      ·  DELETE [admin]
GET/POST       /api/tesoreria/categorias
GET    /api/tesoreria/caja/resumen · /caja · /caja/:id/voucher
POST   /api/tesoreria/caja (voucher) · PUT /caja/:id · DELETE /caja/:id
GET    /api/tesoreria/traspasos · POST /traspasos (voucher) · GET /traspasos/:id/voucher
GET    /api/tesoreria/logs               [admin]
GET    /api/tesoreria/flujo-caja
```

### nóminas
```
GET/POST/PUT  /api/nominas/empleados[/:id]
GET    /api/nominas/pre-calculo
POST   /api/nominas/pagar        ·  POST /api/nominas/pagar-base
GET    /api/nominas/historial    ·  GET /api/nominas/empleado/:id/log
GET    /api/nominas/costo-real
```

### juicios
```
GET    /api/juicios · /juicios/:id · /juicios/prestamo/:prestamoId
PUT    /api/juicios/:id
POST   /api/juicios/:id/gastos    ·  DELETE /api/juicios/:id/gastos/:gastoId
GET    /api/juicios/:id/documentos ·  POST (multipart + validateMagicBytes)
GET    /api/juicios/:id/documentos/:docId · DELETE
GET    /api/juicios/:id/bitacora  ·  POST /api/juicios/:id/bitacora
```

### dashboard
```
GET    /api/dashboard/kpis          KPIs de supervivencia
GET    /api/dashboard/boss-kpis     centro de comando gerencial, mes actual
GET    /api/dashboard/analytics     radiografía con selector ?mes=&anio=
```

---

## 8. Frontend — rutas, menú, pantallas y diseño

### Menú lateral (`Sidebar.tsx`)
| Etiqueta | Ruta | Restricción |
|---|---|---|
| Dashboard | `/dashboard` | solo admin |
| Clientes | `/clientes` | — |
| **Inversionistas** | `/inversionistas` | — |
| Préstamos | `/prestamos` | — |
| Caja Chica y Bancos | `/caja` | — |
| Gastos | `/egresos` | — |
| Hub de Ingresos | `/ingresos` | — |
| Nóminas | `/nominas` | — |
| Juicios | `/juicios` | solo admin |

> **M45:** "Referenciadores" **ya no es entrada de menú.** `/referenciadores`
> redirige a `/inversionistas`, que es la lista única de las tres formas.

### Rutas (`App.tsx`)
```
/login · /403
/  ·  /dashboard  ·  /inicio
/clientes · /clientes/nuevo · /clientes/:id · /clientes/:id/editar
/inversionistas · /inversionistas/nuevo · /inversionistas/importar
/inversionistas/:id · /inversionistas/:id/editar
/referenciadores → Navigate a /inversionistas
/referenciadores/nuevo · /referenciadores/:id · /referenciadores/:id/editar
/prestamos · /prestamos/auditoria · /prestamos/nuevo
/prestamos/:id · /prestamos/:id/editar
/caja · /egresos · /ingresos · /nominas
/juicios · /juicios/:id
```

### Pantallas por módulo
- **Inversionistas:** `ListaInversionistas` (lista combinada de las 3 formas con
  filtro Todos/Inversionistas/Referenciadores, badge *Inversionista*/*Ambos*/
  *Referenciador*, columna **Ligado a**, tarjetas de stats, Importar, Nuevo
  inversionista, Nuevo referenciador) · `FormularioInversionista` ·
  `PerfilInversionista` · `ImportarInversionistas`
- **Referenciadores:** `DetalleReferenciador` (encabezado, 3 totales, desglose
  **una fila por origen**, sin botón de pagar) · `FormularioReferenciador`
- **Préstamos:** Lista · Formulario · Expediente · Auditoría de capital ·
  modales de pago, moratorio y perdón
- **Egresos (Hub):** tabs Dashboard · Cuentas por pagar · Proveedores ·
  Cuentas de inversionistas · **Pendientes de devengos** (M18/M20)
- **Ingresos (Hub):** tabs Dashboard central · CxC préstamos · Ingresos extras
- **Nóminas:** tabs Empleados · Generador · Pagar · Historial · Costo real
- **Tesorería:** Cuentas · Caja chica · Traspasos · Flujo de caja
- **Juicios:** Lista · Expediente
- **Clientes:** Lista · Formulario · Expediente + checklist documental

### Componentes compartidos (`components/shared/`)
| Componente | Reemplaza a | Nota |
|---|---|---|
| `ErrorBoundary` | try/catch ad-hoc en render | — |
| `FileDropZone` | `<input type=file>` suelto | prop opcional `accept` (M25); sin prop = PDF/JPG/PNG |
| `ProtectedRoute` | check de auth inline | — |
| `RoleGuard` | check de rol inline | usar **además** `roleMiddleware` en backend, nunca solo UI |

### Design tokens (`docs/DISENO.md`)
| Token | Clase Tailwind | Uso |
|---|---|---|
| `--ink` | `slate-800` | texto principal, títulos |
| `--ink-soft` | `slate-500/600` | texto secundario, labels |
| `--muted` | `slate-400` | hints, placeholders, `—` de datos vacíos |
| `--accent` | `sky-500` (hover `sky-600`) | botones primarios, tab activa, focus ring |
| `--accent-soft` | `sky-50/100` | fondos de selección, badges informativos |
| `--surface` | `white` sobre `slate-50` | tarjetas `rounded-2xl border-slate-100` |
| `--linea` | `slate-100/200` | bordes, divisores |
| éxito / alerta / error | `green-*` / `amber-*` / `red-*` | badges y mensajes |

Tipografía de sistema (stack Tailwind por defecto). Escala 12·14·16·20·24·32.
Iconos **solo** `lucide-react`. Cero colores hardcodeados. Cero estilos inline.
`naranja.*` del tema viejo se eliminó en M35.

### Responsive
Breakpoints verificados: **375 / 768 / 1440**. Criterio duro: **cero scroll
horizontal, cero error de consola** en los tres. En 375px las tablas se vuelven
tarjetas y las dropzones se vuelven botón.

---

## 9. Reglas de negocio

### 9.1 Estructura — inversionistas / referenciadores (P1–P7, **completas**)

**Nomenclatura fijada:** *referenciador* = el que trae · *referido* = el que fue
traído. En schema, código y UI siempre `referenciador_id`. Nunca otra variante.

- **P1 · Tres formas de ganar.**
  1. Solo inversionista → fila en `inversionistas`
  2. Inversionista y referenciador → fila en ambas tablas
  3. Solo referenciador → fila en `referenciadores` con `inversionista_id` NULL

  **Nadie se muda de tabla.** `referenciadores.inversionista_id` liga las dos
  filas de la misma persona. El filtro de la lista hace el trabajo.
- **P2 · Dos tipos de referido.** Si trajo a un inversionista, la base es el
  capital de esa inversión; si trajo a un cliente, el monto vigente de ese préstamo.
- **P3 · Un solo nivel — sin cascada.** Si A trae a B y B trae a C, la comisión
  por C es de B. A no cobra nada. Una inversión o préstamo tiene **un**
  referenciador (UNIQUE en `referencias`). Sin esto el esquema se vuelve piramidal.
- **P4 · Se liga por origen y es opcional.** No se hereda: si un inversionista
  referido mete otra inversión por su cuenta, el referenciador no cobra sobre esa
  a menos que se ligue explícitamente.
- **P5 · Datos de la persona.** Nombre, apellidos, dirección, teléfono, correo,
  INE en PDF (drag-and-drop). **Número de cuenta y banco: opcionales.**
- **P6 · Nadie se borra.** Bandera de estado, nunca `DELETE`.
- **P7 · Sucesión.** Si un referenciador fallece o se retira, lo decide la oficina
  y se captura como cambio de estado. El sistema no tiene regla propia.

### 9.2 Cálculo — motor de comisiones (R1–R24, **resueltas y validadas**)

| # | Regla |
|---|---|
| R1 | Comisión **mensual** sobre **capital**, no sobre interés |
| R2 | La paga la **oficina**, de su margen. El inversionista cobra íntegro |
| R3 | **Base viva:** baja conforme baja el capital del referido |
| R4 | Cada referenciador sigue a **su origen**, no al crédito completo |
| R8 | **Moratorios = 100% oficina.** No entran al reparto |
| R9 | Vive lo que vive el contrato. Liquidación anticipada corta; renovación reinicia |
| R11 | Si no se cobró, **se devenga y acumula.** Se paga cuando entre el dinero |
| R12 | Lo acumulado se paga **FIFO** — lo más viejo primero |
| R13 | El referenciador **también** se devenga y acumula |
| R14 | Cuando no alcanza, **la oficina decide a quién paga.** El resto se acumula |
| R15 | **FIFO forzado dentro de la línea.** Carlos elige a quién; el sistema el periodo |
| R16 | **FIFO por origen, no por persona** |
| R17 | Al liquidar, **un pago por concepto**. No se juntan rendimiento y comisión |
| R18 | El devengo **se congela**: guarda base y tasa del momento |
| R19 | Todo pago registra forma, comprobante, cuenta y **quién autorizó** |
| R20 | Correr el corte dos veces **no duplica nada** |
| R21 | Solo la oficina paga. Ningún cálculo automático genera pagos |
| **R22** | **Sin orden automático entre beneficiarios.** El sistema muestra todos los pendientes; la oficina decide cuál liquidar y en qué orden, pago por pago |
| **R23** | **La oficina nunca absorbe automáticamente.** Lo no pagado permanece devengado sin límite de tiempo |
| **R24** | **Redondeo a 2 decimales half-up; el residuo es de la oficina.** La suma de las partes más el residuo cuadra exacto con el total cobrado, cada mes |

**R16 en detalle — lo más fácil de implementar mal:** si un referenciador trajo
dos préstamos y solo uno paga, cobra del que pagó. El dinero del préstamo A **no**
cubre lo que se debe por el préstamo B.
```
Juan · comisión · Préstamo de Ana   → línea propia, FIFO propio
Juan · comisión · Préstamo de Beto  → independiente
```

**Criterios derivados (marcados para validación final de Carlos):**
- Un préstamo `atrasado` o `en_juicio` **sí** sigue generando comisión (el capital
  sigue vivo, R9+R11). `liquidado`/`cancelado` no. En inversiones, solo `activo` genera.
- Si al pagar se captura más dinero del que se debe en la línea, **el pago se
  rechaza completo** con el sobrante exacto en el error: el sobrante no tiene
  destino legal definido (R16/R22).

### 9.3 Dinero — reglas transversales (D1–D4)

- **D1 · Half-up parejo, en todo.** Todo monto calculado se redondea a 2 decimales
  half-up. **Prohibido `toFixed` sobre dinero** — redondea según el binario del
  double: `(1.005).toFixed(2) === "1.00"`.
- **D2 · Un solo redondeo, al resultado final.** Pasos intermedios en centavos
  BigInt o enteros. Nada de redondear la tarifa por hora antes de multiplicar.
- **D3 · Recálculo retroactivo total.** Válido **solo porque no hay producción**.
  No se hereda a producción como precedente.
- **D4 · Una sola aritmética, display incluido.** Ningún total mostrado puede
  diferir de la suma de sus renglones persistidos. `toFixed` queda permitido solo
  para porcentajes/ratios de display.

### 9.4 Dashboard (R1–R3)
- **R1 · Regla de oro de flujo:** nunca mezclar saldo total de deuda con flujo
  mensual de efectivo. `pago_creditos_mes` = pagos reales del mes a
  `cuentas_por_pagar WHERE centro_costo='Bancos'`.
- **R2 · Top deudores** filtrado por `periodo_mes`/`periodo_anio`, no acumula.
- **R3 · Fuente de verdad de ingresos:** `historial_ingresos_central`.
  Solo `'Prestamo'` y `'Otros'` tienen escritores vivos; el CHECK todavía lista
  `'Inmueble'/'Cancha'/'Estacionamiento'` como residuo cosmético.
  `historial_ingresos` **no existe en Neon** — no referenciarla.

### 9.5 Casos resueltos — convertidos en tests

**Corte mensual (C1–C7):** devengo simple · redondeo half-up (916.666575 → 916.67) ·
medio centavo exacto sube (0.005 → 0.01) · devengo que redondea a cero **no se
inserta** · solo inversiones `activo` generan · el corte es determinista y no paga ·
idempotencia contra la DB.

**Comisiones con base viva (C8–C13):** comisión sobre inversión referida ·
comisión sobre préstamo referido (**base = `saldo_pendiente`**, capital no interés) ·
base viva mes a mes sin recalcular lo anterior · referencia no activa no genera ·
el origen debe estar vivo · moratorios fuera de la base.

**Aplicación FIFO (C14–C19):** FIFO dentro de la línea · dos préstamos del mismo
referenciador y solo uno paga (líneas mezcladas **lanzan error**) · el pago no
sobrepasa la línea (sobrante regresa al caller) · slots ya pagados se saltan ·
pago parcial previo cuenta · exactitud a centavo sin drift.

**Dinero half-up (C1–C5):** $20,000 × 1.50% = $300.00 · $10,001 × 1.75% = $175.02 ·
$100.50 × 1.00% = **$1.01** (el que rompe `toFixed`) · nómina con un solo redondeo ·
prima vacacional exacta en enteros.

### 9.6 Regla de oro, en todos los archivos de reglas
> **Prohibido inventar.** Si una situación no está cubierta: **para y pregunta.**
> Una regla inventada que corre sin error es el peor resultado posible: se
> descubre meses después, cuando alguien reclama su dinero.

---

## 10. Motor de comisiones y aritmética de dinero

### `backend/src/lib/dinero.ts` — aritmética canónica
```ts
aCentavos(s: string): bigint          // string → centavos, regex estricta
deCentavos(c: bigint): string         // centavos → string con 2 decimales
sumaMontos(montos: Array<string|null|undefined>): string
restaMontos(a: string, b: string): string
restaPiso0(a: string, b: string): string          // nunca negativo
comparaMontos(a: string, b: string): number       // -1 | 0 | 1
esCero(m: string): boolean
porcentajeHalfUp(base: string, tasa: string): string       // envuelve montoPorTasa (R24)
proporcionHalfUp(monto: string, por: number, entre: number): string  // un solo redondeo (D2)
montoDeNumero(n, { conSigno? }): string            // DTO numérico → string; >2 decimales → error
```
**Sin dependencia externa.** Todo en BigInt de centavos. `montoDeNumero` es la
única versión (M43a eliminó las 4 copias locales).

### `backend/src/modules/motor/dinero.ts` — primitivas
`aCentavos` · `deCentavos` · `montoPorTasa(baseCents, tasaCents)` — half-up R24,
regex estricta (los helpers previos tragaban `"1.2.3"` en silencio).

### `backend/src/modules/motor/corte.ts` — núcleo puro (M13/M14)
```ts
devengosRendimiento(inversiones: InversionFuente[], mes, anio): DevengoCandidato[]
devengosComision(referencias: ReferenciaFuente[], mes, anio): DevengoComisionCandidato[]
```
Congela `base_capital` y `tasa` al generarse (R18). Un devengo de $0.00 no se inserta.

### `backend/src/modules/motor/corte.db.ts` — shell de DB
```ts
generarCorte(pool, mes, anio): Promise<{ candidatos, insertados, omitidos }>
```
Lee `inversiones WHERE estatus='activo'` y `referencias WHERE estado='activa'`
(con LEFT JOIN a `inversiones`/`prestamos` para la base viva y el estatus del
origen). Inserta con `ON CONFLICT DO NOTHING` contra `devengos_idempotente` (R20).

> 🔴 **`generarCorte` no está montado en ningún controller, ruta, cron ni UI.**
> Su único llamador es `corte.integracion.ts`, un script de verificación manual.
> Ver [§15](#15--huecos-detectados).

### `backend/src/modules/motor/aplicacion.ts` — FIFO (M15)
```ts
aplicarPagoFifo(slots: DevengoSlot[], monto: string): ResultadoAplicacion
```
Pura, sobre **una sola línea** (beneficiario + concepto + origen). **Slots de
líneas mezcladas lanzan error** — R16 es imposible de violar por diseño, no
disciplina del caller. FIFO por periodo con cruce de año, sin sobrepago, sobrante
regresa al caller (R22).

---

## 11. Tests y verificación

### Backend — 127 tests ✅ (15 archivos, vitest, ~1.3 s)
| Archivo | Tests | Qué cubre |
|---|---|---|
| `modules/motor/corte.test.ts` | — | C1–C6 (rendimiento) + C8–C13 (comisión, base viva) |
| `modules/motor/aplicacion.test.ts` | — | C14–C19 (FIFO por origen) |
| `modules/motor/dinero.test.ts` | — | primitivas, regex estricta, half-up |
| `lib/dinero.test.ts` | — | C1–C5 de `DINERO.md` + no-acumulación + divisor cero |
| `controllers/referenciadores.controller.test.ts` | — | forma 2/3, P6, escape de ILIKE, contrato M23 |
| `controllers/referencias.controller.test.ts` | — | coherencia de origen, tasa, P3→409, M29, R9 |
| `controllers/pagos_devengo.controller.test.ts` | 15 | R16 agrupado, R19, `pago_cuenta_coherente`, sobrante→400, transacción con el FIFO real |
| `controllers/nominas.controller.test.ts` | 11 | horas extras, faltas, prima, tarifas half-up |
| `controllers/tesoreria_pagos_cxp.controller.test.ts` | 7 | traspaso, monto_pagado, monto_real, mensajes exactos |
| `controllers/cobros.controller.test.ts` | 6 | interés, próximo mes, faltante exacto |
| `controllers/prestamos.controller.test.ts` | 5 | moratorio, saldo string exacto, renovación |
| `controllers/egresos.controller.test.ts` | 5 | rendimiento half-up, desglose capital+interés+IVA |
| `controllers/ingresos.controller.test.ts` | 4 | caracterización de `dashboardCentral` y CxC |
| `controllers/inversionistas.controller.test.ts` | 4 | interés al registrar movimiento, `monto_actual` |
| `controllers/dashboard.controller.test.ts` | 3 | caracterización de `getKpis`/`getBossKpis`/`getAnalytics` |

Técnica: **`pool` mockeado con `vi.mock`**, sin dependencia nueva (nada de
supertest), corren en milisegundos, sin red ni DB. El FIFO del pago se ejercita
con el motor real, no mockeado.

### Frontend — e2e responsive
`frontend/e2e/responsive.spec.ts` con `@playwright/test` usando el Chrome
instalado (`channel`, sin descarga de navegadores).
**6 pantallas × 3 viewports = 18 tests:**
`/dashboard` · `/inversionistas` · `/referenciadores/nuevo` · `/prestamos` ·
`/egresos` · `/ingresos` × 375 / 768 / 1440.
Verifica cero scroll horizontal y cero error de consola (filtra 401). Sesión con
JWT firmado localmente contra un admin real. Evidencia PNG en `e2e/__screens__/`
(gitignored).

### Lo que NO está cubierto
- Los ~13 controllers legacy (auth, clientes, juicios, cobros parcialmente, pagos,
  cuentas_pagar, tesorería parcialmente) siguen sin tests unitarios.
- El smoke default de CRA (`craco test`) está roto por react-router-dom v7.
- No hay e2e funcional (solo responsive).

---

## 12. Backlog — las 45 modificaciones y su estado

### Bloque A — inversionistas / referenciadores (23 tareas: 22 ✅ · 1 ❌)

| # | Tipo | Qué hizo | Estado |
|---|---|---|---|
| M1 | data | tabla `referenciadores` + 2 índices | ✅ aplicada a Neon |
| M2 | data | tabla `referencias` + 3 constraints; copia **diferida** (0 filas, guarda que aborta si aparecen) | ✅ aplicada |
| M9 | data | `numero_cuenta` + `banco` opcionales en inversionistas | ✅ aplicada |
| M10a | logic | backend deja de leer `asignado_a` | ✅ |
| M10b | ui | frontend deja de leer `asignado_a` (6 archivos, excepción a ≤5) | ✅ |
| M10 | data | `DROP COLUMN asignado_a` con respaldo | ✅ aplicada |
| M11 | data | `tasa_referenciador` `NUMERIC(6,4)→(5,2)`, ×100 | ✅ aplicada |
| M3 | logic | API `/api/referenciadores` (list/get/alta/edición), envelope nuevo, filtro forma, baja por `activo` | ✅ |
| M4 | logic | API `/api/referencias` (alta/edición), coherencia de origen, P3→409, `fecha_inicio` del servidor | ✅ |
| M5 | ui | lista de las 3 formas, filtro primero que todo, unión client-side | ✅ |
| M6 | ui | columnas *se le debe* / *al corriente*, `—` mientras el motor esté apagado | ✅ |
| M7 | ui | detalle con desglose **una fila por origen**, 3 totales, sin botón de pagar | ✅ |
| M8 | ui | alerta de inversión sin préstamo ligado | ❌ **descartada** — la liga se hace desde préstamos vía `participantes_prestamo`; la condición no puede darse |
| M21 | ui | form legacy de referidor a escala nueva (`0.50 = 0.5%`) | ✅ |
| M22 | ui | `FormularioReferenciador` (alta/edición), reusa `Campo` y `FileDropZone` | ✅ |
| M23 | logic | `GET /:id` devuelve `referencias[]` con `origen_nombre` | ✅ |
| M24 | logic | `referencias[]` agrega `origen_inversionista_id` para navegar | ✅ |
| M25 | ui | `FileDropZone` con prop `accept` (tarea propia de shared) | ✅ |
| M26 | logic | endurecer validación de `/api/referencias` (UUID/tasa/fecha → 400) | ✅ |
| M27 | ui | fix "Invalid Date" en `CardInversion` | ✅ |
| M28 | logic | solo admin liga/edita referencias (⛔4=A) | ✅ |
| M29 | logic | estados de referencia solo hacia adelante (⛔5=A) | ✅ |
| M31 | logic | endurecer el legacy `crearInversion` | ✅ |

### Bloque B — motor de comisiones (5 ✅)
| # | Tipo | Qué hizo |
|---|---|---|
| M12 | data | tabla `devengos` + `devengos_idempotente` + `devengos_fifo` |
| M13 | motor | corte mensual idempotente (rendimiento), C1–C7 |
| M14 | motor | comisiones con base viva (R3), C8–C13 |
| M15 | motor | aplicación FIFO por origen, C14–C19 |
| M16 | logic | dinero canónico sin `parseFloat` (BigInt centavos, sin dependencia) |

### Bloque C — cuentas por pagar inversionistas (5 ✅)
| # | Tipo | Qué hizo |
|---|---|---|
| M30 | data | tablas `pagos_devengo` + `pago_aplicaciones` |
| M17 | logic | `GET /pendientes` agrupado por línea, ambos conceptos |
| M19 | logic | `POST /api/pagos-devengo` transaccional con FIFO, solo admin, exceso → 400 |
| M18 | ui | pestaña **Devengos** en el Hub de Egresos, totales en BigInt |
| M20 | ui | filtro Todos/Inversionistas/Referenciadores en pendientes |

### Post-release (6 ✅)
| # | Tipo | Qué hizo |
|---|---|---|
| M32 | logic | código huérfano `personas`/`comisiones` → `_to_delete/backend-huerfano/` |
| M33 | logic | 41 tests unitarios de los 3 controllers nuevos |
| M34 | data | 4 tablas huérfanas → `*_descartado` en Neon |
| M35 | ui | limpiar `naranja.*` del tema viejo |
| M36 | data | runner de migraciones con tracking y **sellado** |
| M37 | data | seed demo idempotente y alineado al schema vivo |

### Serie de dinero half-up (8 ✅, orden obligatorio)
| # | Tipo | Qué hizo |
|---|---|---|
| M38 | motor | `porcentajeHalfUp` + `proporcionHalfUp` en `lib/dinero.ts` (TDD, 6 rojos primero) |
| M39 | logic | cobros a half-up, cero `toFixed` |
| M40 | logic | préstamos a half-up, fuera el épsilon `+0.009` |
| M41 | logic | egresos e inversionistas a half-up |
| M42 | logic | nómina a half-up, un solo redondeo (D2) |
| M43a | motor | `montoDeNumero` único en `lib/dinero.ts` (4 copias fuera) |
| M43b | logic | display de ingresos exacto |
| M43c | logic | display del dashboard exacto |
| M43d | logic | tesorería, pagos y CxP exactos — **backend sin `toFixed` de dinero** |
| M44 | data | recálculo retroactivo (D3), aplicado y sellado, 0 filas con drift |

### Corrección de organización
| # | Tipo | Qué hizo |
|---|---|---|
| M45 | ui | **Referenciadores dentro de Inversionistas:** una sola lista, filtro de 3 botones, badge *Ambos*, columna "Ligado a", menú sin entrada propia, `/referenciadores` redirige |

---

## 13. Decisiones de arquitectura

| Fecha | Tarea | Decisión | Por qué |
|---|---|---|---|
| 2026-08-17 | rediseño | Un solo módulo de inversionistas + referidores | El referidor es otro inversionista, no una entidad aparte |
| **2026-08-19** | re-especificación | **`personas`/`aportaciones` se descartan; se extiende el schema real con `referenciadores` + `referencias`** | Los módulos paralelos duplicaban a `inversionistas`. `referencias` cubre además el referido de **préstamo** |
| 2026-08-19 | re-especificación | **Nadie se muda de tabla** | Mover la persona rompe el histórico; copiarla hace que su teléfono diverja |
| 2026-08-19 | re-especificación | `devengos` es tabla nueva, **no** extensión de `historial_inversiones` | Una registra lo que se **pagó**; la otra lo que se **generó aunque no se pagara** |
| 2026-08-19 | re-especificación | `inversiones.referenciador_id` se **depreca, no se borra** | Borrarla mientras el código la lee tumba producción |
| 2026-08-19 | M1 | `REGLAS.md` se parte en dos: estructura (P1–P7) y cálculo (R1–R24) | El Bloque A no usa ninguna R, pero el gate lo rechazaba por marcas ⛔ de otro módulo |
| 2026-08-19 | M2 | La copia de referidos legacy se **difiere**; no se inventa el puente | 0 filas hoy; el copiado exige dos decisiones sin especificar |
| 2026-08-26 | M3 | Código nuevo usa envelope `{ success, data, error }`; el legacy `{ mensaje }` no se toca | Contrato de `MODULO.md` |
| 2026-08-26 | M4 | `fecha_inicio` la pone el servidor; `PATCH` no mueve origen ni referenciador | Convención del proyecto + R9 |
| 2026-09-08 | M5 | La lista combinada se arma **en el cliente** (ambas APIs completas, 100/página) | El UNION no existe como endpoint; escala de oficina lo aguanta |
| 2026-09-09 | M8 | **M8 se descarta sin código** | La liga se hace desde préstamos; la condición del banner no puede darse |
| 2026-09-09 | M16 | BigInt centavos en vez de lib `Decimal` | Exacto y sin dependencia nueva |
| 2026-09-11 | M32 | El código huérfano se **descarta, no se porta** | Mantener dos implementaciones del mismo algoritmo es el riesgo, no el seguro |
| 2026-09-11 | M33 | Tests de controllers **unitarios con pool mockeado**, no E2E contra Neon | Sin dependencia nueva, corren en ms, no dependen de red/DB |
| 2026-09-11 | M36 | Runner de migraciones con **sellado por tarea** | Sin sellado, el ciclo up→down→up del gate revertiría migraciones viejas cuyas reversas abortan a propósito |
| 2026-09-11 | spec dinero | Half-up parejo, un solo redondeo final, recálculo retroactivo total, display incluido | `toFixed` redondea por binario, no half-up |
| 2026-09-15 | M41 | `montoDeNumero` copiado localmente y extraído en M43 | Extraerlo en M41 rompía ≤5 archivos |
| 2026-09-15 | M42 | **La base de horas semanales queda en 48** (código); C4 del doc ilustra con 40 | Cambiar la base sería inventar una regla de negocio. ⚠️ **Pendiente de confirmar con Sebastian** |
| 2026-09-15 | M44 | El recálculo solo pisa filas cuya diferencia es **drift de redondeo** (≤1¢ por componente, ≤3¢ en total de nómina); mayor = override manual y se conserva. `moratorios_prestamo` queda fuera | Nómina y CxP aceptan montos capturados a mano; pisarlos sería inventar que eran cálculos |
| 2026-09-15 | M45 | **Los referenciadores no tienen menú propio.** "Ligado a" apunta a la otra fila de la misma persona (opción a), no a sus referidos | Dos entradas de menú contradecían la decisión del 2026-08-17 |

---

## 14. Deuda técnica

### ✅ Cerradas
- **Dinero en float (legacy)** — cerrada 2026-09-15 con M38–M44. Backend sin
  `toFixed` de dinero (quedan 7, todos ratios). Entrada con >2 decimales → 400
  en todos los controllers. Display exacto (D4). Recálculo retroactivo codificado.
- **Dos escalas de tasa** — cerrada 2026-09-09 (M11 + M21). Todo el sistema usa
  porcentaje con 2 decimales.
- **Sin script de lint** — cerrada 2026-09-09 (`npm run lint` en frontend,
  `eslint --max-warnings=0`, cero deps nuevas).
- **Migraciones sin runner / seed no idempotente** — cerrada 2026-09-11
  (M36 + M37). Gate `data` 9/9, cero no declarados.
- **Sin e2e/responsive** — cerrada 2026-09-09. 18 tests de playwright.
- **`DISENO.md` con `{{TODO}}`** — cerrada 2026-09-09, tokens extraídos del uso real.
- **Validación de entrada laxa** — cerrada con M26 + M31.
- **Working tree con ~140 archivos modificados** — cerrada 2026-09-09.

### 🟡 Abierta
- **Backend sin tests de controllers legacy.** Atacada parcialmente (M33 + la
  serie de dinero): hoy hay 15 archivos de test. **Pendiente:** ~13 controllers
  legacy (auth, clientes, juicios, pagos, cuentas_pagar, tesorería) sin cobertura.
  Criterio: cubrir al tocarlos, no en un big bang.
- **Backend sin eslint propio** (queda cubierto por typecheck; añadirlo sería
  dependencia nueva — decidir en ticket futuro).
- **Smoke default de CRA roto** por react-router-dom v7.
- **⚠️ Base de horas semanales de nómina: 48 en el código, 40 en el ejemplo C4
  de `DINERO.md`.** Hay que confirmar cuál es la correcta.

---

## 15. 🔴 Huecos detectados

> Verificados directamente contra el código el 2026-09-16. **Esto es lo que el
> sistema no puede hacer hoy aunque las piezas existan.**

### 15.1 🔴 El corte mensual no tiene disparador
`generarCorte(pool, mes, anio)` está escrito, probado (C1–C13) y verificado contra
Neon — pero **no existe ningún controller, ruta, cron ni botón que lo llame.** Su
único llamador es `backend/src/modules/motor/corte.integracion.ts`, un script de
verificación que se corre a mano.

**Consecuencia:** `devengos` tiene **0 filas** y nunca tendrá ninguna por operación
normal. Toda la cadena aguas abajo está muerta en la práctica:
```
corte (sin disparador) → devengos (0) → GET /pendientes (vacío)
  → pestaña Devengos (vacía) → POST /api/pagos-devengo (nada que pagar)
```
**Falta:** decidir el disparador (endpoint `POST /api/devengos/corte` solo admin,
cron mensual, o botón en la UI), quién lo autoriza, y qué pasa si se corre un
periodo pasado. El motor ya es idempotente (R20), así que correrlo dos veces es
seguro por diseño.

### 15.2 🔴 No hay UI para ligar un referenciador a una inversión o préstamo
`POST /api/referencias` existe, está validado, es solo-admin y tiene tests —
pero **ningún componente del frontend lo llama.** Verificado: `referenciadoresService.ts`
expone listar/obtener/crear/editar/dar de baja **referenciadores**, nunca
**referencias**.

`FLUJOS.md` §3 describe la pantalla (buscador con autocompletar dentro del alta/
edición de inversión y de préstamo, campo tasa obligatorio si se eligió
referenciador, filtrar la auto-referencia) pero **nunca se le asignó tarea**:
M4 cerró como API pura, igual que M3 antes de M22.

**Consecuencia:** `referencias` tiene **0 filas** y no hay forma de crear una
desde el sistema. Sin referencias no hay devengos de comisión, aunque el corte
se disparara.

### 15.3 🔴 El form legacy sigue escribiendo la columna deprecada
`PerfilInversionista.tsx:148-149` sigue mandando `referenciador_id` y
`tasa_referenciador` al crear una inversión — es decir, escribe
`inversiones.referenciador_id`, la columna **deprecada** que apunta a
`inversionistas(id)`.

El motor (`corte.db.ts`) lee **solo `referencias`**. Por lo tanto:

> **Un referidor capturado hoy desde la UI no genera ni un centavo de comisión.**

Además la columna vieja no puede representar a un referenciador sin capital
(forma 3), que es justo lo que el release vino a resolver.

**Falta:** o migrar ese form a `POST /api/referencias` (que resolvería 15.2 y 15.3
de un golpe), o escribir el puente `inversionista(id) → referenciadores(id)` que
M2 dejó explícitamente diferido.

### 15.4 🟡 Columnas de dinero de la lista y el detalle siguen en `—`
`ListaReferenciadores`/`ListaInversionistas` (*se le debe*, *al corriente*) y
`DetalleReferenciador` (3 totales + desglose por origen) tienen **las ramas con
dato real ya escritas**, pero el backend no expone esos campos: hoy llegan `null`
y se pintan `—` con tooltip. Se activan solas cuando `GET /api/referenciadores`
y `GET /api/referenciadores/:id` agreguen los agregados de `devengos`.

### 15.5 🟡 No hay pantalla de historial de pagos de devengo
Se puede registrar un pago (`POST /api/pagos-devengo`) pero no existe endpoint ni
pantalla para **consultar** los pagos hechos, ni para ver la trazabilidad de
`pago_aplicaciones` (qué devengo cubrió qué pago). Se escribe y no se puede leer.

### 15.6 🟡 Ligado de referenciador a préstamo, del lado de préstamos
`FormularioPrestamo.tsx` no tiene campo de referenciador. `referencias` soporta
`tipo_referido = 'prestamo'` y el motor calcula sobre `saldo_pendiente` (C9/C10),
pero no hay por dónde capturarlo.

### 15.7 🟡 Sin ejecución en producción
No hay DB de producción, ni datos reales, ni la revisión de D3 que eso exigiría.
Cuando exista: la prohibición 7 se revierte (las migraciones las aplica Sebastian
a mano) y **el recálculo retroactivo total (D3) deja de ser válido**.

### 15.8 🟡 Validación pendiente con Carlos
Las 7 decisiones están validadas por **Sebastian** (2026-09-10), que confirmó que
provienen de los requerimientos que él levantó con la oficina. La validación
directa con Carlos de los dos **criterios derivados** sigue marcada en
`PARA-CARLOS-referenciadores.md`:
- préstamo `atrasado`/`en_juicio` **sí** devenga comisión
- monto excedente al pagar **se rechaza completo**

Ninguna corrección sería un rehacer — los siete puntos se programaron para
poderse invertir con un ajuste acotado.

### Resumen de la cadena rota

```
   [ UI de inversión ]──escribe──▶ inversiones.referenciador_id  (deprecada)
                                              │
                                              ✗  nadie lee esto
                                              
   [ FALTA UI ]────────────────▶ POST /api/referencias ──▶ referencias (0 filas)
                                                                │
                                                                ▼
   [ FALTA DISPARADOR ]────────▶ generarCorte() ──────────▶ devengos (0 filas)
                                                                │
                                                                ▼
                                 GET /pendientes ──▶ pestaña Devengos ──▶ POST pago
                                       ✅ existe          ✅ existe        ✅ existe
```
**Tres eslabones faltan; los de abajo ya están construidos y probados.**

---

## 16. Código y tablas descartados

### `_to_delete/` (no se borra — la vacía Sebastian, prohibición 8)
| Carpeta | Qué contiene |
|---|---|
| `backend-huerfano/` | controllers, rutas y `modules/comisiones/` (`reparto.ts`, `fifo.ts` + 14 tests) del módulo descartado. Fueron la referencia viva del algoritmo hasta que M13–M15 quedaron verdes |
| `frontend/` | `ListaReferenciadores.tsx`, retirada por M45 |
| `docs/` | docs de `personas/` y `comisiones/` (rediseño descartado el 2026-08-19) |
| `database/` | migraciones obsoletas (`migration_ingresos_hub.sql`, `migration_historial_ingresos.sql`) que ya no deben aplicarse |
| `CAMBIOS.md` | bitácora del descarte |

### En Neon
`personas` · `persona_documentos` · `aportaciones` · `pagos` · `devengos` (vieja) ·
`pago_aplicaciones` (vieja) fueron **renombradas a `*_descartado`** (M12, M30, M34),
con sus índices y secuencias. Nada se borró: el rename preserva filas y FKs.
La vista `saldo_por_persona` sigue apuntando a ese modelo viejo.

### Módulos eliminados del negocio
`migration_remove_modules.sql` eliminó `inmuebles`, `contratos_arrendamiento` y
`cuentas_por_cobrar` (módulo inmobiliaria). `pensiones_activas = 0` en el
dashboard es el **valor definitivo**, no un workaround: el módulo de
estacionamiento ya no existe.

---

*Generado el 2026-09-16 contra el commit `df7a812`. El schema es un volcado en
vivo de Neon; los conteos de tests son de una corrida real (`127 passed`).*
