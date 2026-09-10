-- ================================================================
-- M30 · Tablas `pagos_devengo` + `pago_aplicaciones` (cuentas por pagar)
-- Spec: docs/modulos/inversionistas/DATOS.md § "Pagos (extiende cuentas
-- por pagar)". Reglas: R17 (un pago por concepto), R19 (comprobante y
-- autorización obligatorios), R15/R16 (trazabilidad FIFO por aplicación).
--
-- Existía una `pago_aplicaciones` huérfana del módulo descartado
-- (id BIGSERIAL, 0 filas verificadas). Nada se borra: se renombra a
-- `pago_aplicaciones_descartado`. La huérfana `pagos` no colisiona
-- (la tabla nueva se llama `pagos_devengo`) y se queda como está.
-- ================================================================
BEGIN;

-- 1. Apartar la huérfana (identificable por id bigint). Idempotente.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pago_aplicaciones'
      AND column_name = 'id'
      AND data_type = 'bigint'
  ) THEN
    ALTER TABLE pago_aplicaciones RENAME TO pago_aplicaciones_descartado;
    ALTER INDEX IF EXISTS pago_aplicaciones_pkey
      RENAME TO pago_aplicaciones_descartado_pkey;
    ALTER INDEX IF EXISTS pago_aplicaciones_pago_id_devengo_id_key
      RENAME TO pago_aplicaciones_descartado_pago_id_devengo_id_key;
  END IF;
END $$;

-- 2. El pago: un registro por entrega de dinero, un concepto por pago (R17)
CREATE TABLE IF NOT EXISTS pagos_devengo (
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
  url_comprobante     TEXT NOT NULL,        -- recibo o comprobante, obligatorio (R19)

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

-- 3. Qué devengo cubrió qué pago. Es la trazabilidad del FIFO.
CREATE TABLE IF NOT EXISTS pago_aplicaciones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pago_id     UUID NOT NULL REFERENCES pagos_devengo(id),
  devengo_id  UUID NOT NULL REFERENCES devengos(id),
  monto       NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  UNIQUE (pago_id, devengo_id)
);

CREATE INDEX IF NOT EXISTS idx_pago_aplicaciones_devengo
  ON pago_aplicaciones (devengo_id);

COMMIT;
