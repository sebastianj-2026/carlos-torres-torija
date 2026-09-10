-- ================================================================
-- MIGRACIÓN: historial_ingresos
-- Hub centralizado de ingresos: diferencia utilidad vs retorno de capital
-- Ejecutar en Neon ANTES de reiniciar el backend.
-- ================================================================

CREATE TYPE origen_ingreso AS ENUM (
  'Cancha',
  'Estacionamiento',
  'Otros',
  'Prestamo',
  'Inmueble'
);

CREATE TABLE IF NOT EXISTS historial_ingresos (
  id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  origen                   origen_ingreso NOT NULL,

  -- UUID del registro de origen (prestamo_id, ingreso_directo_id, contrato_id…)
  referencia_id            UUID,

  -- Flujo de efectivo real que entró a la cuenta
  monto_total_cobrado      NUMERIC(14,2) NOT NULL CHECK (monto_total_cobrado >= 0),

  -- Ganancia pura: intereses de préstamo, renta de inmueble, entrada de cancha
  monto_utilidad           NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (monto_utilidad >= 0),

  -- Recuperación de principal: SOLO abonos a capital en préstamos
  monto_capital_recuperado NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (monto_capital_recuperado >= 0),

  -- Período de negocio (no necesariamente fecha_registro)
  periodo_mes              SMALLINT NOT NULL CHECK (periodo_mes  BETWEEN 1 AND 12),
  periodo_anio             SMALLINT NOT NULL CHECK (periodo_anio >= 2000),

  fecha_cobro              DATE        NOT NULL DEFAULT CURRENT_DATE,
  notas                    TEXT,
  registrado_por           UUID,
  fecha_registro           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hi_periodo ON historial_ingresos (periodo_anio, periodo_mes);
CREATE INDEX IF NOT EXISTS idx_hi_origen  ON historial_ingresos (origen);
CREATE INDEX IF NOT EXISTS idx_hi_ref     ON historial_ingresos (referencia_id);

-- Integridad: monto_utilidad + monto_capital_recuperado debe cuadrar con monto_total_cobrado
ALTER TABLE historial_ingresos
  ADD CONSTRAINT chk_hi_desglosa
  CHECK (
    monto_utilidad + monto_capital_recuperado <= monto_total_cobrado + 0.01
  );
