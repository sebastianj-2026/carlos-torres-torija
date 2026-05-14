-- Add tasa_anual and fecha_fin to creditos_bancarios
-- Required for financial calculations (annuity and linear amortization)

ALTER TABLE creditos_bancarios
  ADD COLUMN IF NOT EXISTS tasa_anual   NUMERIC(8,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fecha_fin    DATE,
  ADD COLUMN IF NOT EXISTS fecha_inicio DATE,
  ADD COLUMN IF NOT EXISTS concepto     TEXT;
