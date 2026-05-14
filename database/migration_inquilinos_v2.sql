-- ================================================================
-- MIGRACIÓN v2: Inquilinos — doc aval + campos depósito en contrato
-- Ejecutar en Neon UNA sola vez.
-- ================================================================

ALTER TABLE inquilinos
  ADD COLUMN IF NOT EXISTS url_doc_aval TEXT;

ALTER TABLE contratos_arrendamiento
  ADD COLUMN IF NOT EXISTS monto_deposito  NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS deposito_items  JSONB,
  ADD COLUMN IF NOT EXISTS url_deposito    TEXT;
