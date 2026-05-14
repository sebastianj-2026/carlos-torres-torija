-- ================================================================
-- MIGRACIÓN: Motor de proyección CxC Préstamos
-- Ejecutar en Neon ANTES de reiniciar el backend.
-- ================================================================

CREATE TABLE IF NOT EXISTS obligaciones_cobro_prestamo (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  prestamo_id    UUID        NOT NULL REFERENCES prestamos(id) ON DELETE CASCADE,
  periodo_mes    SMALLINT    NOT NULL CHECK (periodo_mes  BETWEEN 1 AND 12),
  periodo_anio   SMALLINT    NOT NULL CHECK (periodo_anio >= 2000),
  dia_pago       SMALLINT    NOT NULL,
  monto_interes  NUMERIC(14,2) NOT NULL CHECK (monto_interes >= 0),
  registrado_por UUID,
  fecha_generado TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (prestamo_id, periodo_mes, periodo_anio)
);

CREATE INDEX IF NOT EXISTS idx_ocp_prestamo ON obligaciones_cobro_prestamo (prestamo_id);
CREATE INDEX IF NOT EXISTS idx_ocp_periodo  ON obligaciones_cobro_prestamo (periodo_anio, periodo_mes);
