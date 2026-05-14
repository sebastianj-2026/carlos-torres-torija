-- ================================================================
-- MIGRACIÓN: Corte diario de Cancha de Fútbol
-- Ejecutar en Neon ANTES de reiniciar el backend.
-- ================================================================

CREATE TABLE IF NOT EXISTS cortes_cancha (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha_operacion     DATE          NOT NULL,
  horas_rentadas      NUMERIC(5,2)  NOT NULL CHECK (horas_rentadas > 0),
  monto_esperado      NUMERIC(12,2) NOT NULL CHECK (monto_esperado  >= 0),
  monto_real_recibido NUMERIC(12,2) NOT NULL CHECK (monto_real_recibido >= 0),
  encargado           VARCHAR(100)  NOT NULL DEFAULT 'Alfredo',
  notas               TEXT,
  registrado_por      UUID,
  fecha_registro      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cc_fecha ON cortes_cancha (fecha_operacion DESC);

-- Expandir CHECK de historial_ingresos_central para incluir 'Cancha'
DO $$
DECLARE cname text;
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
  CHECK (origen IN ('Prestamo', 'Inmueble', 'Estacionamiento', 'Cancha'));
