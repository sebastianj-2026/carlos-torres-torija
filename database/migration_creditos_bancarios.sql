-- ================================================================
-- MIGRACIÓN: creditos_bancarios
-- Submódulo Deudas y Créditos Bancarios (Modal de Desglose Asistido)
-- Ejecutar en Neon antes de arrancar el backend.
-- ================================================================

CREATE TYPE tipo_tasa_credito    AS ENUM ('Fija', 'Variable');
CREATE TYPE esquema_pago_credito AS ENUM ('Pagos Fijos', 'Pagos Decrecientes', 'Solo Intereses');

CREATE TABLE IF NOT EXISTS creditos_bancarios (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  banco               VARCHAR(120) NOT NULL,
  alias_credito       VARCHAR(120),
  monto_original      NUMERIC(14,2) NOT NULL CHECK (monto_original > 0),
  saldo_actual        NUMERIC(14,2) NOT NULL CHECK (saldo_actual >= 0),
  tipo_tasa           tipo_tasa_credito    NOT NULL DEFAULT 'Fija',
  esquema_pago        esquema_pago_credito NOT NULL DEFAULT 'Pagos Fijos',
  -- 'Pagos Fijos'        → cuota_base_mensual es el total mensual pactado
  -- 'Pagos Decrecientes' → cuota_base_mensual es la cuota fija de capital; el interés varía
  -- 'Solo Intereses'     → sin amortización de capital en el pago ordinario
  cuota_base_mensual  NUMERIC(14,2),
  dia_corte           SMALLINT CHECK (dia_corte BETWEEN 1 AND 31),
  activo              BOOLEAN NOT NULL DEFAULT true,
  registrado_por      UUID,
  fecha_registro      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Categoría requerida por POST /egresos/creditos/pago
INSERT INTO categorias_egresos (nombre, tipo_frecuencia)
VALUES ('Crédito Bancario', 'fijo')
ON CONFLICT (nombre) DO NOTHING;
