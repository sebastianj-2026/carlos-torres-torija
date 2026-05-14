-- ================================================================
-- MIGRACIÓN: Categorías con color + Series de cuotas
-- Ejecutar UNA sola vez en Neon
-- ================================================================

-- 1. Color en categorías
ALTER TABLE categorias_egresos
  ADD COLUMN IF NOT EXISTS color VARCHAR(7) NOT NULL DEFAULT '#94a3b8';

UPDATE categorias_egresos SET color = CASE nombre
  WHEN 'Nómina'           THEN '#3b82f6'
  WHEN 'Mantenimiento'    THEN '#f59e0b'
  WHEN 'Abogados'         THEN '#8b5cf6'
  WHEN 'Servicios'        THEN '#06b6d4'
  WHEN 'Impuestos'        THEN '#ef4444'
  WHEN 'Seguros'          THEN '#10b981'
  WHEN 'Papelería'        THEN '#f97316'
  WHEN 'Notaría'          THEN '#6366f1'
  WHEN 'Luz'              THEN '#eab308'
  WHEN 'Agua'             THEN '#0ea5e9'
  WHEN 'Internet'         THEN '#64748b'
  WHEN 'Avalúo'           THEN '#a16207'
  WHEN 'Rendimientos'     THEN '#059669'
  WHEN 'Otros'            THEN '#94a3b8'
  ELSE color
END;

-- 2. Serie y cuotas en cuentas_por_pagar
ALTER TABLE cuentas_por_pagar
  ADD COLUMN IF NOT EXISTS serie_id      UUID,
  ADD COLUMN IF NOT EXISTS num_cuota     SMALLINT NOT NULL DEFAULT 1 CHECK (num_cuota >= 1),
  ADD COLUMN IF NOT EXISTS total_cuotas  SMALLINT NOT NULL DEFAULT 1 CHECK (total_cuotas >= 1);

CREATE INDEX IF NOT EXISTS idx_cpp_serie
  ON cuentas_por_pagar (serie_id)
  WHERE serie_id IS NOT NULL;
