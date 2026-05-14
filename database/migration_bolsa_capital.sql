-- ================================================================
-- MIGRACIÓN: Bolsa de Capital / Wallet de Liquidez
-- Aplica contra Supabase / PostgreSQL
-- ================================================================

-- 1. Columnas de wallet en inversionistas
ALTER TABLE inversionistas
  ADD COLUMN capital_aportado_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN capital_disponible     NUMERIC(12,2) NOT NULL DEFAULT 0;

-- 2. Tabla de movimientos por inversionista (log de entrada/salida)
CREATE TABLE movimientos_inversionistas (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inversionista_id UUID NOT NULL REFERENCES inversionistas(id) ON DELETE CASCADE,
  tipo             VARCHAR(20) NOT NULL
                   CHECK (tipo IN ('entrada', 'salida', 'uso_oficina')),
  monto            NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  concepto         VARCHAR(200),
  prestamo_id      UUID REFERENCES prestamos(id) ON DELETE SET NULL,
  registrado_por   UUID REFERENCES usuarios(id),
  fecha_movimiento TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mov_inv_inversionista
  ON movimientos_inversionistas (inversionista_id, fecha_movimiento DESC);

CREATE INDEX idx_mov_inv_prestamo
  ON movimientos_inversionistas (prestamo_id)
  WHERE prestamo_id IS NOT NULL;
