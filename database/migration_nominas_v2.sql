-- ================================================================
-- MIGRACIÓN v2: Nóminas — IMSS, Bonos, Faltas, Ajustes
-- Ejecutar en Neon ANTES de reiniciar el backend.
-- ================================================================

-- 1. Campos IMSS en empleados
ALTER TABLE empleados
  ADD COLUMN IF NOT EXISTS activo_imss BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS monto_imss  NUMERIC(12,2) NOT NULL DEFAULT 0;

-- 2. Campos bonos / faltas / ajuste en nominas_pagadas
ALTER TABLE nominas_pagadas
  ADD COLUMN IF NOT EXISTS bonos             NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (bonos >= 0),
  ADD COLUMN IF NOT EXISTS faltas_cantidad   NUMERIC(5,2)  NOT NULL DEFAULT 0 CHECK (faltas_cantidad >= 0),
  ADD COLUMN IF NOT EXISTS monto_faltas      NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (monto_faltas >= 0),
  ADD COLUMN IF NOT EXISTS ajuste_monto      NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ajuste_concepto   TEXT;
