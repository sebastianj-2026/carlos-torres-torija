-- ================================================================
-- MIGRACIÓN: Corte diario de estacionamiento
-- Ejecutar en Neon ANTES de reiniciar el backend.
-- ================================================================

-- 1. Tabla maestra de cortes
CREATE TABLE IF NOT EXISTS cortes_estacionamiento (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha_operacion  DATE          NOT NULL,
  ingreso_coches   NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (ingreso_coches   >= 0),
  ingreso_banos    NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (ingreso_banos    >= 0),
  ingreso_tiendita NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (ingreso_tiendita >= 0),
  monto_total      NUMERIC(12,2) NOT NULL             CHECK (monto_total     >= 0),
  notas            TEXT,
  registrado_por   UUID,
  fecha_registro   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ce_fecha ON cortes_estacionamiento (fecha_operacion DESC);

-- 2. Expandir el CHECK de historial_ingresos_central para aceptar 'Estacionamiento'
DO $$
DECLARE
  cname text;
BEGIN
  SELECT tc.constraint_name INTO cname
  FROM information_schema.table_constraints tc
  JOIN information_schema.check_constraints cc USING (constraint_name)
  WHERE tc.table_name = 'historial_ingresos_central'
    AND cc.check_clause ILIKE '%origen%';

  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE historial_ingresos_central DROP CONSTRAINT %I', cname);
  END IF;
END $$;

ALTER TABLE historial_ingresos_central
  ADD CONSTRAINT hic_origen_check
  CHECK (origen IN ('Prestamo', 'Inmueble', 'Estacionamiento'));
