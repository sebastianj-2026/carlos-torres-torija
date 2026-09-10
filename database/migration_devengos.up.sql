-- ================================================================
-- M12 · Tabla `devengos` del motor de comisiones + índice de idempotencia
-- Spec: docs/modulos/inversionistas/DATOS.md § "Tabla devengos (nueva)"
-- Reglas: R16 (FIFO por origen), R18 (congelado), R20 (idempotencia en DB),
--         R24 (2 decimales).
--
-- Nota: existía una tabla `devengos` huérfana del módulo `comisiones`
-- descartado el 2026-08-19 (persona_id BIGINT, 0 filas verificadas).
-- Nada se borra: se renombra a `devengos_descartado`.
-- ================================================================
BEGIN;

-- 1. Apartar la tabla huérfana del módulo descartado (identificable por
--    persona_id). Idempotente: si ya se renombró, no hace nada.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'devengos'
      AND column_name = 'persona_id'
  ) THEN
    ALTER TABLE devengos RENAME TO devengos_descartado;
    ALTER INDEX IF EXISTS devengos_pkey RENAME TO devengos_descartado_pkey;
  END IF;
  -- Los índices del módulo descartado conservan su nombre global y
  -- bloquearían los CREATE INDEX de abajo — se apartan también.
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'devengos_fifo' AND tablename = 'devengos_descartado'
  ) THEN
    ALTER INDEX devengos_fifo RENAME TO devengos_descartado_fifo;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'devengos_periodo' AND tablename = 'devengos_descartado'
  ) THEN
    ALTER INDEX devengos_periodo RENAME TO devengos_descartado_periodo;
  END IF;
END $$;

-- 2. Tabla nueva
CREATE TABLE IF NOT EXISTS devengos (
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
CREATE UNIQUE INDEX IF NOT EXISTS devengos_idempotente
  ON devengos (
    COALESCE(inversionista_id, referenciador_id),
    concepto, origen_tipo, origen_id, periodo_anio, periodo_mes
  );

-- FIFO: por línea (beneficiario + concepto + origen), periodo ascendente
CREATE INDEX IF NOT EXISTS devengos_fifo
  ON devengos (COALESCE(inversionista_id, referenciador_id),
               concepto, origen_tipo, origen_id, periodo_anio, periodo_mes)
  WHERE estado <> 'pagado';

COMMIT;
