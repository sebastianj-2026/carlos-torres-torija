-- ================================================================
-- MIGRACIÓN: Egresos y Deuda Corporativa
-- Módulo independiente — no toca tablas de cuentas_pagar existentes
-- Ejecutar UNA sola vez en Neon
-- ================================================================

-- ----------------------------------------------------------------
-- 1. Catálogo de categorías de egreso
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categorias_egresos (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre           VARCHAR(100) NOT NULL UNIQUE,
  tipo_frecuencia  VARCHAR(10)  NOT NULL DEFAULT 'variable'
                     CHECK (tipo_frecuencia IN ('fijo', 'variable', 'mixto')),
  activo           BOOLEAN      NOT NULL DEFAULT true,
  fecha_registro   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Catálogo base (idempotente)
INSERT INTO categorias_egresos (nombre, tipo_frecuencia) VALUES
  ('Nómina',         'fijo'),
  ('Mantenimiento',  'variable'),
  ('Abogados',       'variable'),
  ('Servicios',      'fijo'),
  ('Impuestos',      'mixto'),
  ('Seguros',        'fijo'),
  ('Papelería',      'variable'),
  ('Otros',          'variable')
ON CONFLICT (nombre) DO NOTHING;

-- ----------------------------------------------------------------
-- 2. Proveedores / beneficiarios de pago
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS proveedores_beneficiarios (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_razon_social VARCHAR(200) NOT NULL,
  rfc                 VARCHAR(13),
  banco               VARCHAR(100),
  clabe               VARCHAR(18),
  moneda_defecto      VARCHAR(3)   NOT NULL DEFAULT 'MXN'
                        CHECK (moneda_defecto IN ('MXN', 'USD')),
  activo              BOOLEAN      NOT NULL DEFAULT true,
  registrado_por      UUID         REFERENCES usuarios(id) ON DELETE SET NULL,
  fecha_registro      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  fecha_actualizacion TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proveedores_nombre
  ON proveedores_beneficiarios (nombre_razon_social);

-- ----------------------------------------------------------------
-- 3. Deudas bancarias / créditos corporativos
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS deudas_bancarias (
  id                     UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo                   VARCHAR(30)    NOT NULL
                           CHECK (tipo IN ('hipotecario', 'tarjeta', 'linea_credito', 'prestamo_simple', 'otro')),
  institucion            VARCHAR(100)   NOT NULL,
  alias_ubicacion        VARCHAR(200),
  
  numero_referencia      VARCHAR(100),
  saldo_inicial          DECIMAL(15,2)  NOT NULL CHECK (saldo_inicial > 0),
  saldo_actual           DECIMAL(15,2)  NOT NULL CHECK (saldo_actual >= 0),
  tasa_anual             DECIMAL(6,4)   NOT NULL CHECK (tasa_anual > 0),
  tasa_mensual           DECIMAL(6,4)   GENERATED ALWAYS AS (tasa_anual / 12) STORED,
  cuota_mensual_total    DECIMAL(15,2),
  fecha_vencimiento_final DATE,
  moneda                 VARCHAR(3)     NOT NULL DEFAULT 'MXN'
                           CHECK (moneda IN ('MXN', 'USD')),
  activo                 BOOLEAN        NOT NULL DEFAULT true,
  notas                  TEXT,
  registrado_por         UUID           REFERENCES usuarios(id) ON DELETE SET NULL,
  fecha_registro         TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  fecha_actualizacion    TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deudas_institucion
  ON deudas_bancarias (institucion);

-- ----------------------------------------------------------------
-- 4. Cuentas por pagar (egresos corporativos)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cuentas_por_pagar (
  id                   UUID           PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Referencias
  proveedor_id         UUID           REFERENCES proveedores_beneficiarios(id) ON DELETE SET NULL,
  categoria_id         UUID           NOT NULL REFERENCES categorias_egresos(id) ON DELETE RESTRICT,
  deuda_id             UUID           REFERENCES deudas_bancarias(id) ON DELETE SET NULL,

  -- Concepto libre
  concepto             VARCHAR(300)   NOT NULL,

  -- Montos
  monto_total          DECIMAL(15,2)  NOT NULL CHECK (monto_total > 0),
  moneda               VARCHAR(3)     NOT NULL DEFAULT 'MXN'
                         CHECK (moneda IN ('MXN', 'USD')),
  tipo_cambio          DECIMAL(10,4)  NOT NULL DEFAULT 1,

  -- Desglose (obligatorio cuando deuda_id no es NULL)
  monto_capital        DECIMAL(15,2)  NOT NULL DEFAULT 0,
  monto_interes        DECIMAL(15,2)  NOT NULL DEFAULT 0,
  monto_iva            DECIMAL(15,2)  NOT NULL DEFAULT 0,

  -- Programación y flujo
  fecha_limite_pago    DATE           NOT NULL,
  estatus              VARCHAR(20)    NOT NULL DEFAULT 'borrador'
                         CHECK (estatus IN ('borrador', 'por_aprobar', 'programado', 'pagado', 'vencido')),
  fecha_pago_real      DATE,

  -- Documentos adjuntos (URLs)
  url_factura_pdf      TEXT,
  url_factura_xml      TEXT,
  url_comprobante_pago TEXT,

  -- Auditoría
  notas                TEXT,
  registrado_por       UUID           REFERENCES usuarios(id) ON DELETE SET NULL,
  aprobado_por         UUID           REFERENCES usuarios(id) ON DELETE SET NULL,
  fecha_registro       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  fecha_actualizacion  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  -- Validación: si hay deuda_id el desglose debe sumar al total
  CONSTRAINT chk_desglose_deuda CHECK (
    deuda_id IS NULL
    OR ABS((monto_capital + monto_interes + monto_iva) - monto_total) < 0.01
  )
);

CREATE INDEX IF NOT EXISTS idx_cpp_estatus
  ON cuentas_por_pagar (estatus);
CREATE INDEX IF NOT EXISTS idx_cpp_fecha_limite
  ON cuentas_por_pagar (fecha_limite_pago);
CREATE INDEX IF NOT EXISTS idx_cpp_proveedor
  ON cuentas_por_pagar (proveedor_id);
CREATE INDEX IF NOT EXISTS idx_cpp_categoria
  ON cuentas_por_pagar (categoria_id);
CREATE INDEX IF NOT EXISTS idx_cpp_deuda
  ON cuentas_por_pagar (deuda_id)
  WHERE deuda_id IS NOT NULL;

-- ----------------------------------------------------------------
-- 5. Trigger: marcar vencidas automáticamente (función reutilizable)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION marcar_cpp_vencidas()
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE cnt INTEGER;
BEGIN
  UPDATE cuentas_por_pagar
    SET estatus = 'vencido', fecha_actualizacion = NOW()
  WHERE estatus IN ('borrador', 'por_aprobar', 'programado')
    AND fecha_limite_pago < CURRENT_DATE;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  RETURN cnt;
END;
$$;
