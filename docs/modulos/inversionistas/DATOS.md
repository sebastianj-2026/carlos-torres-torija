# Datos — inversionistas y referenciadores

> Solo se abre en tareas de tipo `data`.
> **Extiende el schema real en producción.** No hay tablas `personas` ni
> `aportaciones`: ese rediseño se descarta. Lo que existe se amplía.

---

## Lo que YA existe y no se toca

| Tabla | Qué guarda |
|---|---|
| `inversionistas` | persona con capital + wallet (Bolsa de Capital) |
| `inversiones` | contrato de capital. **Ya tiene `referenciador_id` y `tasa_referenciador`** |
| `historial_inversiones` | pagos de interés y movimientos de capital |
| `movimientos_inversionistas` | log de la wallet |

La mitad del trabajo de referenciadores de inversión ya está hecho en
`inversiones`. Falta el referenciador de **préstamos** y todo el cálculo.

---

## Las tres formas de ganar

```
1. Solo inversionista            → fila en `inversionistas`, sin referir
2. Inversionista y referenciador → fila en `inversionistas` + filas en `referenciadores`
3. Solo referenciador            → fila en `referenciadores`, sin capital
```

**Nadie se muda de tabla.** Si un referenciador puro aporta capital, se le crea
su fila en `inversionistas` y **conserva la suya en `referenciadores`**. El front
lo muestra en las dos listas; el filtro hace el trabajo.

> Mover la persona de tabla rompería el histórico: sus comisiones apuntarían a
> un id que ya no existe y dejaría de cobrar. Duplicarla haría que su teléfono
> divergiera entre las dos. Por eso se queda donde nació.

---

## M1 · Tabla `referenciadores` (nueva) — la persona

```sql
CREATE TABLE referenciadores (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  nombres             VARCHAR(100) NOT NULL,
  apellido_paterno    VARCHAR(100) NOT NULL,
  apellido_materno    VARCHAR(100),
  telefono            VARCHAR(15),
  correo              VARCHAR(100),
  direccion           TEXT,
  url_ine             TEXT,

  -- M4: para tener a la mano al momento de pagar. NO obligatoria.
  numero_cuenta       VARCHAR(30),
  banco               VARCHAR(60),

  -- Si esta persona además aportó capital, aquí queda ligada.
  -- NULL = solo referenciador (forma 3).
  inversionista_id    UUID REFERENCES inversionistas(id),

  activo              BOOLEAN NOT NULL DEFAULT TRUE,
  registrado_por      UUID REFERENCES usuarios(id),
  fecha_registro      TIMESTAMP DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_referenciadores_nombre
  ON referenciadores (apellido_paterno, nombres);
CREATE INDEX idx_referenciadores_inversionista
  ON referenciadores (inversionista_id) WHERE inversionista_id IS NOT NULL;
```

`inversionistas_id` es lo que permite el filtro de las tres formas sin mover a
nadie: si está lleno, esa persona gana de las dos maneras.

---

## M2 · Tabla `referencias` (nueva) — la relación

Guarda **qué trajo cada quién**. Unifica los dos tipos de referido.

```sql
CREATE TABLE referencias (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referenciador_id  UUID NOT NULL REFERENCES referenciadores(id),

  tipo_referido     VARCHAR(20) NOT NULL
                    CHECK (tipo_referido IN ('inversion', 'prestamo')),
  inversion_id      UUID REFERENCES inversiones(id),
  prestamo_id       UUID REFERENCES prestamos(id),

  -- Tasa mensual en PORCENTAJE, 2 decimales: 0.50 = 0.5%
  -- Misma escala que inversiones.tasa_interes_mensual (M6)
  tasa              NUMERIC(5,2) NOT NULL CHECK (tasa > 0),

  -- R9: vive lo que vive el contrato
  estado            VARCHAR(20) NOT NULL DEFAULT 'activa'
                    CHECK (estado IN ('activa', 'terminada', 'cancelada')),
  fecha_inicio      DATE NOT NULL,
  fecha_fin         DATE,

  notas             TEXT,
  registrado_por    UUID REFERENCES usuarios(id),
  fecha_registro    TIMESTAMP DEFAULT NOW(),

  -- Exactamente uno de los dos, según el tipo
  CONSTRAINT ref_origen_coherente CHECK (
    (tipo_referido = 'inversion' AND inversion_id IS NOT NULL AND prestamo_id IS NULL) OR
    (tipo_referido = 'prestamo'  AND prestamo_id IS NOT NULL AND inversion_id IS NULL)
  ),
  -- P7: un solo nivel. Una inversión o préstamo tiene UN referenciador.
  CONSTRAINT ref_unica_inversion UNIQUE (inversion_id),
  CONSTRAINT ref_unica_prestamo  UNIQUE (prestamo_id)
);

CREATE INDEX idx_referencias_referenciador
  ON referencias (referenciador_id) WHERE estado = 'activa';
```

### Convivencia con `inversiones.referenciador_id`
La columna vieja apunta a `inversionistas(id)` y solo cubre referidos de
inversión. `referencias` la reemplaza porque además cubre préstamos y admite
referenciadores sin capital.

**Migración:** los datos existentes de `inversiones.referenciador_id` se copian a
`referencias`. La columna vieja se marca deprecada, **no se borra en la misma
migración** — se quita cuando el código ya no la lea.

---

## M3 · Tabla `devengos` (nueva) — lo que se generó

```sql
CREATE TABLE devengos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Beneficiario: exactamente uno
  inversionista_id UUID REFERENCES inversionistas(id),
  referenciador_id UUID REFERENCES referenciadores(id),

  concepto        VARCHAR(20) NOT NULL
                  CHECK (concepto IN ('rendimiento', 'comision')),

  -- R16: el FIFO corre POR ORIGEN. Lo que entra de un préstamo
  -- solo paga lo de ese préstamo.
  origen_tipo     VARCHAR(20) NOT NULL
                  CHECK (origen_tipo IN ('inversion', 'prestamo')),
  origen_id       UUID NOT NULL,

  periodo_mes     INTEGER NOT NULL CHECK (periodo_mes BETWEEN 1 AND 12),
  periodo_anio    INTEGER NOT NULL,

  -- R18: CONGELADOS al generarse. No se recalculan nunca.
  base_capital    NUMERIC(12,2) NOT NULL,
  tasa            NUMERIC(5,2)  NOT NULL,
  monto_devengado NUMERIC(12,2) NOT NULL,
  monto_pagado    NUMERIC(12,2) NOT NULL DEFAULT 0,

  estado          VARCHAR(20) NOT NULL DEFAULT 'pendiente'
                  CHECK (estado IN ('pendiente', 'parcial', 'pagado', 'cancelado')),
  generado_en     TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT dev_un_beneficiario CHECK (
    (inversionista_id IS NOT NULL AND referenciador_id IS NULL) OR
    (inversionista_id IS NULL AND referenciador_id IS NOT NULL)
  ),
  CONSTRAINT dev_no_sobrepago CHECK (monto_pagado <= monto_devengado)
);

-- R20: idempotencia A NIVEL BASE DE DATOS.
-- Correr el corte dos veces por error duplicaría la deuda de todos.
CREATE UNIQUE INDEX devengos_idempotente
  ON devengos (
    COALESCE(inversionista_id, referenciador_id),
    concepto, origen_tipo, origen_id, periodo_anio, periodo_mes
  );

-- FIFO: por línea (beneficiario + concepto + origen), periodo ascendente
CREATE INDEX devengos_fifo
  ON devengos (COALESCE(inversionista_id, referenciador_id),
               concepto, origen_tipo, origen_id, periodo_anio, periodo_mes)
  WHERE estado <> 'pagado';
```

**Por qué tabla nueva y no extender `historial_inversiones`:** esa tabla registra
lo que **se pagó**; `devengos` registra lo que **se generó aunque no se pagara**.
Mezclarlos en una tabla que ya está en producción rompe lo que hoy funciona.

---

## M4 · Pagos (extiende cuentas por pagar)

```sql
CREATE TABLE pagos_devengo (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  inversionista_id    UUID REFERENCES inversionistas(id),
  referenciador_id    UUID REFERENCES referenciadores(id),
  concepto            VARCHAR(20) NOT NULL
                      CHECK (concepto IN ('rendimiento', 'comision')),

  monto               NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  fecha_pago          DATE NOT NULL,

  -- Cómo se le dio el dinero
  forma_pago          VARCHAR(20) NOT NULL
                      CHECK (forma_pago IN ('efectivo', 'transferencia', 'deposito')),
  numero_cuenta       VARCHAR(30),          -- si no fue efectivo
  banco               VARCHAR(60),
  url_comprobante     TEXT NOT NULL,        -- recibo o comprobante, obligatorio

  -- R19: gobernanza. Solo oficina genera pagos.
  autorizado_por      UUID NOT NULL REFERENCES usuarios(id),
  fecha_autorizacion  TIMESTAMP NOT NULL DEFAULT NOW(),

  notas               TEXT,
  fecha_registro      TIMESTAMP DEFAULT NOW(),

  CONSTRAINT pago_un_beneficiario CHECK (
    (inversionista_id IS NOT NULL AND referenciador_id IS NULL) OR
    (inversionista_id IS NULL AND referenciador_id IS NOT NULL)
  ),
  -- Si no fue efectivo, necesita cuenta
  CONSTRAINT pago_cuenta_coherente CHECK (
    forma_pago = 'efectivo' OR numero_cuenta IS NOT NULL
  )
);

-- Qué devengo cubrió qué pago. Es la trazabilidad del FIFO.
CREATE TABLE pago_aplicaciones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pago_id     UUID NOT NULL REFERENCES pagos_devengo(id),
  devengo_id  UUID NOT NULL REFERENCES devengos(id),
  monto       NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  UNIQUE (pago_id, devengo_id)
);
```

---

## M5 · Cambios a tablas existentes

```sql
-- Número de cuenta a la mano al momento de pagar. NO obligatoria.
ALTER TABLE inversionistas ADD COLUMN numero_cuenta VARCHAR(30);
ALTER TABLE inversionistas ADD COLUMN banco VARCHAR(60);

-- asignado_a es de otro sistema, no aplica aquí
ALTER TABLE inversionistas DROP COLUMN asignado_a;
```

⚠️ El `DROP COLUMN` va en su propia migración con reversa y verificando que nada
lo lea. Si hay datos, se respaldan antes.

---

## M6 · Escalas de tasa unificadas

**Problema detectado:** `inversiones.tasa_interes_mensual` es `NUMERIC(5,2)`
(2.00 = 2%) pero `inversiones.tasa_referenciador` es `NUMERIC(6,4)`
(0.0050 = 0.5%). **Escalas distintas en la misma tabla.** Alguien va a
multiplicar mal.

Se unifica a **porcentaje con 2 decimales** en todo el sistema:

```
tasa 2.00  →  2%     →  monto = base * tasa / 100
tasa 0.50  →  0.5%   →  monto = base * tasa / 100
```

Migración: `tasa_referenciador` se convierte multiplicando por 100 y se cambia el
tipo a `NUMERIC(5,2)`. Con reversa.

---

## M7 · Dinero exacto en el motor

El backend hace `parseFloat` al leer `NUMERIC`, y eso convierte un decimal exacto
en un float binario:

```
0.1 + 0.2  →  0.30000000000000004
```

En un saldo que solo se muestra no pasa nada. En comisiones que se acumulan mes
a mes, los residuos se suman: el estado de cuenta dice $12,499.99 y el reparto
dice $12,500.00, y la invarianza no cierra.

**Regla para todo lo nuevo:** los montos se leen como **string** y se operan con
`Decimal` (decimal.js o Prisma.Decimal). Nunca `parseFloat` dentro del motor de
devengos ni de aplicación de pagos.

No hay que arreglar el sistema entero. Sí lo nuevo.

---

## Base de cálculo — R3

| Quién | Base |
|---|---|
| Inversionista | `inversiones.monto_actual` de su inversión |
| Referenciador de **inversión** | `inversiones.monto_actual` de la inversión que trajo |
| Referenciador de **préstamo** | monto vigente del préstamo que trajo |

**Es por origen, no por persona.** Si trajo dos inversiones de 100,000 cada una,
cobra sobre 200,000 — pero como dos devengos separados, cada uno con su FIFO (R16).

**Base viva:** baja conforme baja el capital de su referido.

### Capital sin ligar
En este sistema los inversionistas siempre están ligados a un préstamo. El único
`capital_disponible` legítimo es el de la oficina.

Si existe una inversión activa sin préstamo ligado, **la UI muestra una alerta**:
*"Esta inversión no está ligada a ningún préstamo."* No bloquea nada, avisa.

---

## Migraciones

| # | Qué hace | Reversa | Riesgo |
|---|---|---|---|
| 1 | crea `referenciadores` | ✅ | bajo |
| 2 | crea `referencias` + copia datos de `inversiones.referenciador_id` | ✅ | **medio — datos vivos** |
| 3 | crea `devengos` + índice de idempotencia | ✅ | bajo |
| 4 | crea `pagos_devengo` + `pago_aplicaciones` | ✅ | bajo |
| 5 | `numero_cuenta` y `banco` en inversionistas | ✅ | bajo |
| 6 | unifica escala de `tasa_referenciador` | ✅ | **medio — convierte datos** |
| 7 | quita `asignado_a` | ✅ | bajo |

Todas con `.down.sql`. Check: `migracion-reversible`. Se aplican a mano en Neon
vía `scripts/apply-migration.js`.

⚠️ La 2 y la 6 tocan datos existentes. Respaldo antes, y verificar conteos
después: mismo número de filas con referenciador antes y después.

---

## Seed

- Un **referenciador puro** (sin `inversionista_id`) con dos referencias
- Un **inversionista que además refiere** (`inversionista_id` lleno) — la forma 2
- Una referencia de tipo `prestamo` y otra de tipo `inversion`
- Devengos de dos periodos, uno pagado y otro pendiente, para probar FIFO
- Una inversión activa **sin préstamo ligado**, para ver la alerta
