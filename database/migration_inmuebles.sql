-- ================================================================
-- MÓDULO: Gestión Inmobiliaria — ERP integrado
-- Ejecutar UNA sola vez en Neon
-- ================================================================

-- 1. INMUEBLES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inmuebles (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  ubicacion_direccion TEXT         NOT NULL,
  ciudad              VARCHAR(100) NOT NULL,
  estado              VARCHAR(100) NOT NULL,
  valor_propiedad     NUMERIC(14,2),
  estatus             VARCHAR(30)  NOT NULL DEFAULT 'disponible'
                        CHECK (estatus IN ('disponible','rentado','en_mantenimiento','vendido')),
  foto_principal_url  TEXT,
  predial_cuenta      VARCHAR(100),
  predial_mes_pago    SMALLINT CHECK (predial_mes_pago BETWEEN 1 AND 12),
  fecha_registro      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. INQUILINOS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inquilinos (
  id                      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  nombres                 VARCHAR(150) NOT NULL,
  apellidos               VARCHAR(150) NOT NULL,
  telefono                VARCHAR(30),
  aval_nombre             VARCHAR(300),
  aval_propiedad_garantia TEXT,
  fecha_registro          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_actualizacion     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. CONTRATOS DE ARRENDAMIENTO ────────────────────────────────
CREATE TABLE IF NOT EXISTS contratos_arrendamiento (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  inmueble_id         UUID          NOT NULL REFERENCES inmuebles(id)  ON DELETE RESTRICT,
  inquilino_id        UUID          NOT NULL REFERENCES inquilinos(id) ON DELETE RESTRICT,
  fecha_inicio        DATE          NOT NULL,
  fecha_fin           DATE          NOT NULL,
  monto_renta_mensual NUMERIC(12,2) NOT NULL CHECK (monto_renta_mensual > 0),
  dia_corte_pago      SMALLINT      NOT NULL CHECK (dia_corte_pago BETWEEN 1 AND 31),
  -- Expediente documental (5 URLs)
  url_contrato_pdf    TEXT,
  url_pagare_pdf      TEXT,
  url_llaves_entrega  TEXT,
  url_inventario_pdf  TEXT,
  url_id_inquilino    TEXT,
  -- Servicios incluidos en renta
  incluye_servicios   BOOLEAN NOT NULL DEFAULT FALSE,
  -- [{tipo:'CFE', cuenta:'123', dia_pago:15, frecuencia:'bimestral'}, ...]
  detalles_servicios  JSONB,
  estatus             VARCHAR(20) NOT NULL DEFAULT 'activo'
                        CHECK (estatus IN ('activo','vencido','terminado')),
  notas               TEXT,
  fecha_registro      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. CUENTAS POR COBRAR (rentas e ingresos inmobiliarios) ──────
CREATE TABLE IF NOT EXISTS cuentas_por_cobrar (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  inmueble_id         UUID          REFERENCES inmuebles(id)              ON DELETE SET NULL,
  contrato_id         UUID          REFERENCES contratos_arrendamiento(id) ON DELETE SET NULL,
  concepto            TEXT          NOT NULL,
  monto               NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  periodo_mes         SMALLINT      NOT NULL CHECK (periodo_mes BETWEEN 1 AND 12),
  periodo_anio        SMALLINT      NOT NULL,
  fecha_limite_cobro  DATE          NOT NULL,
  fecha_cobro_real    DATE,
  estatus             VARCHAR(20)   NOT NULL DEFAULT 'pendiente'
                        CHECK (estatus IN ('pendiente','cobrado','vencido','cancelado')),
  forma_cobro         VARCHAR(30),
  notas               TEXT,
  registrado_por      UUID,
  fecha_registro      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. ALTER cuentas_por_pagar → centro de costos inmobiliario ───
ALTER TABLE cuentas_por_pagar
  ADD COLUMN IF NOT EXISTS inmueble_id UUID REFERENCES inmuebles(id) ON DELETE SET NULL;

-- Índices ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cpc_inmueble        ON cuentas_por_cobrar       (inmueble_id);
CREATE INDEX IF NOT EXISTS idx_cpc_contrato        ON cuentas_por_cobrar       (contrato_id);
CREATE INDEX IF NOT EXISTS idx_cpc_periodo         ON cuentas_por_cobrar       (periodo_anio, periodo_mes);
CREATE INDEX IF NOT EXISTS idx_cpc_estatus         ON cuentas_por_cobrar       (estatus);
CREATE INDEX IF NOT EXISTS idx_cpp_inmueble        ON cuentas_por_pagar        (inmueble_id) WHERE inmueble_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contratos_inmueble  ON contratos_arrendamiento  (inmueble_id);
CREATE INDEX IF NOT EXISTS idx_contratos_estatus   ON contratos_arrendamiento  (estatus);
CREATE INDEX IF NOT EXISTS idx_contratos_fecha_fin ON contratos_arrendamiento  (fecha_fin);

-- Función utilitaria: marcar cobros vencidos (llamar desde cron o manualmente)
CREATE OR REPLACE FUNCTION marcar_cobros_vencidos()
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE cnt INTEGER;
BEGIN
  UPDATE cuentas_por_cobrar
    SET estatus = 'vencido', fecha_actualizacion = NOW()
  WHERE estatus = 'pendiente'
    AND fecha_limite_cobro < CURRENT_DATE;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  RETURN cnt;
END;
$$;

-- Función utilitaria: marcar contratos vencidos
CREATE OR REPLACE FUNCTION marcar_contratos_vencidos()
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE cnt INTEGER;
BEGIN
  UPDATE contratos_arrendamiento
    SET estatus = 'vencido', fecha_actualizacion = NOW()
  WHERE estatus = 'activo'
    AND fecha_fin < CURRENT_DATE;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  RETURN cnt;
END;
$$;
