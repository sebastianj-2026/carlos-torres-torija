-- ================================================================
-- MÓDULO: Sistema de Pagos Global — Ledger Inmutable
-- Ejecutar UNA sola vez en Neon
-- ================================================================

-- 1. LEDGER CENTRAL ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS historial_pagos_global (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo_origen  VARCHAR(20)  NOT NULL CHECK (modulo_origen IN ('prestamo', 'renta')),
  referencia_id  UUID         NOT NULL,
  cliente_id     UUID         REFERENCES clientes(id) ON DELETE SET NULL,
  monto_pagado   NUMERIC(12,2) NOT NULL CHECK (monto_pagado > 0),
  fecha_pago     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  url_recibo     TEXT,
  registrado_por UUID         REFERENCES usuarios(id) ON DELETE SET NULL,
  notas          TEXT
);

CREATE INDEX IF NOT EXISTS idx_hpg_referencia ON historial_pagos_global(referencia_id);
CREATE INDEX IF NOT EXISTS idx_hpg_cliente    ON historial_pagos_global(cliente_id);
CREATE INDEX IF NOT EXISTS idx_hpg_modulo     ON historial_pagos_global(modulo_origen);
CREATE INDEX IF NOT EXISTS idx_hpg_fecha      ON historial_pagos_global(fecha_pago DESC);

-- 2. ALMACENAMIENTO BINARIO DE RECIBOS ────────────────────────────
CREATE TABLE IF NOT EXISTS recibos_pago (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  pago_id      UUID         NOT NULL REFERENCES historial_pagos_global(id) ON DELETE CASCADE,
  nombre       VARCHAR(255),
  mime_type    VARCHAR(100) DEFAULT 'application/pdf',
  contenido    BYTEA        NOT NULL,
  tamano_bytes INTEGER
);

CREATE INDEX IF NOT EXISTS idx_recibos_pago ON recibos_pago(pago_id);

-- 3. CAMPOS FALTANTES EN TABLAS DE OBLIGACIONES ───────────────────

-- prestamos: ya tiene saldo_pendiente y estatus; falta fecha_proximo_pago
ALTER TABLE prestamos
  ADD COLUMN IF NOT EXISTS fecha_proximo_pago DATE;

-- contratos_arrendamiento: falta saldo_pendiente y fecha_proximo_pago
-- saldo_pendiente representa adeudo acumulado del inquilino
ALTER TABLE contratos_arrendamiento
  ADD COLUMN IF NOT EXISTS saldo_pendiente    NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fecha_proximo_pago DATE;
