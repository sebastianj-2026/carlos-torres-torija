-- ============================================================================
-- migration_comisiones.up.sql   ·   T-004
-- Tablas del módulo comisiones: devengos, pagos, pago_aplicaciones.
-- Schema verbatim de docs/modulos/comisiones/DATOS.md.
--
-- Depende de P-001 (personas, persona_documentos). Idempotente (IF NOT EXISTS).
-- Aplicación a Neon: MANUAL (ver pasos al pie). Nada se borra: se archiva con estado.
-- ============================================================================

BEGIN;

-- El corazón del módulo. R11-R13: se devenga siempre, se paga cuando hay.
CREATE TABLE IF NOT EXISTS devengos (
  id              BIGSERIAL PRIMARY KEY,
  persona_id      BIGINT NOT NULL REFERENCES personas(id),
  concepto        TEXT NOT NULL CHECK (concepto IN ('rendimiento','comision')),
  origen_tipo     TEXT NOT NULL CHECK (origen_tipo IN ('aportacion','credito')),
  origen_id       BIGINT NOT NULL,          -- R16: el FIFO corre POR ORIGEN
  periodo         DATE NOT NULL,            -- primer día del mes

  -- R18: congelados al generarse. NO se recalculan nunca.
  base_capital    NUMERIC(14,2) NOT NULL,
  tasa            NUMERIC(6,4)  NOT NULL,
  monto_devengado NUMERIC(14,2) NOT NULL,
  monto_pagado    NUMERIC(14,2) NOT NULL DEFAULT 0,

  estado          TEXT NOT NULL DEFAULT 'pendiente'
                  CHECK (estado IN ('pendiente','parcial','pagado')),
  generado_en     TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT no_sobrepago CHECK (monto_pagado <= monto_devengado),
  -- R20: idempotencia A NIVEL BASE DE DATOS, no de código.
  CONSTRAINT corte_idempotente UNIQUE (persona_id, concepto, origen_tipo, origen_id, periodo)
);

-- R17: un pago por concepto. R19: gobernanza.
CREATE TABLE IF NOT EXISTS pagos (
  id                  BIGSERIAL PRIMARY KEY,
  persona_id          BIGINT NOT NULL REFERENCES personas(id),
  concepto            TEXT NOT NULL CHECK (concepto IN ('rendimiento','comision')),
  monto               NUMERIC(14,2) NOT NULL CHECK (monto > 0),
  fecha               DATE NOT NULL,
  autorizado_por      TEXT NOT NULL,                    -- R19
  fecha_autorizacion  TIMESTAMPTZ NOT NULL DEFAULT now(),
  comprobante_doc_id  BIGINT NULL REFERENCES persona_documentos(id),
  nota                TEXT,
  creado_en           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Qué devengo cubrió qué pago. Es la trazabilidad del FIFO.
CREATE TABLE IF NOT EXISTS pago_aplicaciones (
  id          BIGSERIAL PRIMARY KEY,
  pago_id     BIGINT NOT NULL REFERENCES pagos(id),
  devengo_id  BIGINT NOT NULL REFERENCES devengos(id),
  monto       NUMERIC(14,2) NOT NULL CHECK (monto > 0),
  UNIQUE (pago_id, devengo_id)
);

-- R15/R16: el FIFO barre por línea (persona+concepto+origen), periodo ascendente.
CREATE INDEX IF NOT EXISTS devengos_fifo
  ON devengos (persona_id, concepto, origen_tipo, origen_id, periodo)
  WHERE estado <> 'pagado';

CREATE INDEX IF NOT EXISTS devengos_periodo ON devengos (periodo);

-- "¿cuánto le debo?" es una suma, no una reconstrucción.
CREATE OR REPLACE VIEW saldo_por_persona AS
SELECT persona_id, concepto,
       SUM(monto_devengado) AS devengado,
       SUM(monto_pagado)    AS pagado,
       SUM(monto_devengado - monto_pagado) AS acumulado
FROM devengos GROUP BY persona_id, concepto;

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────
-- Aplicación MANUAL a Neon (después de P-001):
--   psql "$DATABASE_URL" -f database/migration_comisiones.up.sql
-- Reversa:
--   psql "$DATABASE_URL" -f database/migration_comisiones.down.sql
-- ─────────────────────────────────────────────────────────────────────────
