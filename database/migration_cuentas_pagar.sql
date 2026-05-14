-- ================================================================
-- MIGRACIÓN: Cuentas por Pagar, Rendimientos y Flujo de Caja
-- Ejecutar UNA sola vez en Neon
-- ================================================================

-- Lista maestra de obligaciones de pago (manual + auto-generadas)
CREATE TABLE IF NOT EXISTS cuentas_pagar (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  concepto            VARCHAR(300)  NOT NULL,
  monto_estimado      DECIMAL(14,2) NOT NULL CHECK (monto_estimado > 0),
  monto_pagado        DECIMAL(14,2) NOT NULL DEFAULT 0 CHECK (monto_pagado >= 0),
  fecha_vencimiento   DATE          NOT NULL,
  tipo                VARCHAR(30)   NOT NULL DEFAULT 'manual'
                        CHECK (tipo IN ('manual', 'avaluo', 'gastos_notariales',
                                        'rendimiento_inversionista', 'apertura', 'otro_prestamo')),
  estatus             VARCHAR(20)   NOT NULL DEFAULT 'pendiente'
                        CHECK (estatus IN ('pendiente', 'pagado', 'parcial', 'atrasado')),
  -- referencias a registros fuente
  prestamo_id         UUID          REFERENCES prestamos(id) ON DELETE SET NULL,
  participante_id     UUID,
  periodo_mes         INTEGER,
  periodo_anio        INTEGER,
  auto_generado       BOOLEAN       NOT NULL DEFAULT false,
  notas               TEXT,
  registrado_por      TEXT,
  fecha_registro      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  fecha_actualizacion TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Pagos aplicados a cada cuenta por pagar
CREATE TABLE IF NOT EXISTS pagos_cuentas_pagar (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  cuenta_pagar_id     UUID          NOT NULL REFERENCES cuentas_pagar(id) ON DELETE CASCADE,
  monto_real          DECIMAL(14,2) NOT NULL CHECK (monto_real > 0),
  quien_pago          VARCHAR(200)  NOT NULL,
  fuente_fondos       VARCHAR(20)   NOT NULL
                        CHECK (fuente_fondos IN ('caja_chica', 'cuenta_bancaria')),
  cuenta_bancaria_id  UUID          REFERENCES cuentas_bancarias(id),
  voucher_nombre      VARCHAR(255),
  voucher_mime        VARCHAR(100),
  voucher_contenido   BYTEA,
  voucher_tamano      INTEGER,
  notas               TEXT,
  registrado_por      TEXT,
  fecha_pago          DATE          NOT NULL DEFAULT CURRENT_DATE,
  fecha_registro      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_cuentas_pagar_vencimiento ON cuentas_pagar(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_cuentas_pagar_estatus     ON cuentas_pagar(estatus);
CREATE INDEX IF NOT EXISTS idx_cuentas_pagar_prestamo    ON cuentas_pagar(prestamo_id);
CREATE INDEX IF NOT EXISTS idx_cuentas_pagar_periodo     ON cuentas_pagar(periodo_anio, periodo_mes);
CREATE INDEX IF NOT EXISTS idx_pagos_cp_cuenta           ON pagos_cuentas_pagar(cuenta_pagar_id);

-- Función que actualiza estatus + monto_pagado tras cada pago
CREATE OR REPLACE FUNCTION actualizar_estatus_cuenta_pagar()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  total_pagado DECIMAL(14,2);
  estimado     DECIMAL(14,2);
BEGIN
  SELECT COALESCE(SUM(monto_real), 0) INTO total_pagado
  FROM pagos_cuentas_pagar WHERE cuenta_pagar_id = NEW.cuenta_pagar_id;

  SELECT monto_estimado INTO estimado
  FROM cuentas_pagar WHERE id = NEW.cuenta_pagar_id;

  UPDATE cuentas_pagar SET
    monto_pagado        = total_pagado,
    estatus             = CASE
                            WHEN total_pagado = 0 THEN
                              CASE WHEN fecha_vencimiento < CURRENT_DATE THEN 'atrasado' ELSE 'pendiente' END
                            WHEN total_pagado >= estimado THEN 'pagado'
                            ELSE 'parcial'
                          END,
    fecha_actualizacion = NOW()
  WHERE id = NEW.cuenta_pagar_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_actualizar_cuenta_pagar ON pagos_cuentas_pagar;
CREATE TRIGGER trg_actualizar_cuenta_pagar
AFTER INSERT ON pagos_cuentas_pagar
FOR EACH ROW EXECUTE FUNCTION actualizar_estatus_cuenta_pagar();

-- Función cron-like: actualizar estatus atrasado diariamente
-- (se puede llamar desde un job o manualmente)
CREATE OR REPLACE FUNCTION marcar_cuentas_atrasadas()
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
  cnt INTEGER;
BEGIN
  UPDATE cuentas_pagar
    SET estatus = 'atrasado', fecha_actualizacion = NOW()
  WHERE estatus = 'pendiente'
    AND fecha_vencimiento < CURRENT_DATE;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  RETURN cnt;
END;
$$;
