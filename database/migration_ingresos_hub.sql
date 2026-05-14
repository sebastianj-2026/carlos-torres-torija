-- ================================================================
-- MÓDULO: Hub Central de Ingresos y Cuentas por Cobrar
-- Ejecutar UNA sola vez en Neon (requiere migration_inmuebles.sql previo)
-- ================================================================

-- 1. PENSIONES DE ESTACIONAMIENTO (CxC) ────────────────────────
CREATE TABLE IF NOT EXISTS pensiones_estacionamiento (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_nombre       VARCHAR(200)  NOT NULL,
  vehiculo_placas      VARCHAR(20),
  vehiculo_color       VARCHAR(50),
  monto_mensual        NUMERIC(10,2) NOT NULL CHECK (monto_mensual > 0),
  fecha_inicio         DATE          NOT NULL,
  fecha_fin            DATE          NOT NULL,
  url_comprobante_pago TEXT,
  estatus              VARCHAR(20)   NOT NULL DEFAULT 'activa'
                         CHECK (estatus IN ('activa','vencida','cancelada')),
  notas                TEXT,
  fecha_registro       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_actualizacion  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pensiones_estatus   ON pensiones_estacionamiento (estatus);
CREATE INDEX IF NOT EXISTS idx_pensiones_fecha_fin ON pensiones_estacionamiento (fecha_fin);

-- 2. INGRESOS DIRECTOS (Flujo de efectivo inmediato) ───────────
CREATE TABLE IF NOT EXISTS ingresos_directos (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  unidad_negocio      VARCHAR(50)   NOT NULL
                        CHECK (unidad_negocio IN (
                          'estacionamiento_coches','estacionamiento_banos',
                          'estacionamiento_tiendita','cancha_futbol','ingreso_atipico'
                        )),
  monto_ingresado     NUMERIC(12,2) NOT NULL CHECK (monto_ingresado > 0),
  semana_corte        DATE          NOT NULL,
  metodo_pago         VARCHAR(30)   NOT NULL
                        CHECK (metodo_pago IN ('efectivo','transferencia','tarjeta')),
  cuenta_destino      VARCHAR(200),        -- nombre libre de la cuenta destino
  persona_nombre      VARCHAR(200),        -- persona involucrada (opcional)
  notas_explicativas  TEXT,
  url_comprobante     TEXT,
  registrado_por      UUID,
  fecha_registro      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_id_unidad       ON ingresos_directos (unidad_negocio);
CREATE INDEX IF NOT EXISTS idx_id_semana       ON ingresos_directos (semana_corte);
CREATE INDEX IF NOT EXISTS idx_id_metodo       ON ingresos_directos (metodo_pago);

-- 3. MÉTRICAS DE CANCHA (sub-registro por sesión) ──────────────
CREATE TABLE IF NOT EXISTS metricas_cancha (
  id                 UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  ingreso_directo_id UUID    NOT NULL REFERENCES ingresos_directos(id) ON DELETE CASCADE,
  cantidad_rentas    INTEGER NOT NULL DEFAULT 0 CHECK (cantidad_rentas >= 0),
  fecha_registro     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. MOVIMIENTOS EXTRAS DE PENSIÓN (cobros atípicos) ───────────
CREATE TABLE IF NOT EXISTS movimientos_extras_pension (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  pension_id     UUID          NOT NULL REFERENCES pensiones_estacionamiento(id) ON DELETE CASCADE,
  monto          NUMERIC(10,2) NOT NULL,
  concepto_extra VARCHAR(300)  NOT NULL,
  fecha          DATE          NOT NULL DEFAULT CURRENT_DATE,
  fecha_registro TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_extras_pension ON movimientos_extras_pension (pension_id);

-- Función: marcar pensiones vencidas automáticamente
CREATE OR REPLACE FUNCTION marcar_pensiones_vencidas()
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE cnt INTEGER;
BEGIN
  UPDATE pensiones_estacionamiento
    SET estatus = 'vencida', fecha_actualizacion = NOW()
  WHERE estatus = 'activa' AND fecha_fin < CURRENT_DATE;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  RETURN cnt;
END;
$$;
