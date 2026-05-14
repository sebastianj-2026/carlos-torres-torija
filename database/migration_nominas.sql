-- ================================================================
-- MIGRACIÓN: Módulo Capital Humano — Empleados y Nóminas
-- Ejecutar en Neon ANTES de reiniciar el backend.
-- ================================================================

-- 1. Tabla maestra de empleados
CREATE TABLE IF NOT EXISTS empleados (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre                  VARCHAR(200)  NOT NULL,
  puesto                  VARCHAR(100)  NOT NULL,
  sueldo_semanal          NUMERIC(12,2) NOT NULL CHECK (sueldo_semanal > 0),
  estatus                 VARCHAR(20)   NOT NULL DEFAULT 'Activo'
                            CHECK (estatus IN ('Activo', 'Inactivo', 'Vacaciones')),
  dias_vacaciones_totales INTEGER       NOT NULL DEFAULT 6,
  dias_vacaciones_tomados INTEGER       NOT NULL DEFAULT 0,
  -- Enlace opcional al módulo de clientes/préstamos (para descuento semanal)
  cliente_id              UUID          REFERENCES clientes(id) ON DELETE SET NULL,
  fecha_ingreso           DATE,
  notas                   TEXT,
  registrado_por          UUID,
  fecha_registro          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  fecha_actualizacion     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emp_estatus    ON empleados (estatus);
CREATE INDEX IF NOT EXISTS idx_emp_cliente    ON empleados (cliente_id);

-- 2. Historial de nóminas pagadas
CREATE TABLE IF NOT EXISTS nominas_pagadas (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id             UUID          NOT NULL REFERENCES empleados(id) ON DELETE RESTRICT,
  semana_inicio           DATE          NOT NULL,
  semana_fin              DATE          NOT NULL,
  sueldo_base             NUMERIC(12,2) NOT NULL CHECK (sueldo_base >= 0),

  -- Horas extras
  horas_extras_cantidad   NUMERIC(5,2)  NOT NULL DEFAULT 0 CHECK (horas_extras_cantidad >= 0),
  tipo_hora_extra         VARCHAR(10)             CHECK (tipo_hora_extra IN ('Normal', 'Doble', 'Triple')),
  monto_horas_extras      NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (monto_horas_extras >= 0),

  -- Vacaciones y prima
  dias_vacaciones_periodo INTEGER       NOT NULL DEFAULT 0 CHECK (dias_vacaciones_periodo >= 0),
  monto_prima_vacacional  NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (monto_prima_vacacional >= 0),

  -- Descuentos
  descuento_prestamo      NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (descuento_prestamo >= 0),

  -- Total neto
  monto_total_pagado      NUMERIC(12,2) NOT NULL CHECK (monto_total_pagado >= 0),

  forma_pago              VARCHAR(30)   NOT NULL DEFAULT 'efectivo',
  notas                   TEXT,
  registrado_por          UUID,
  fecha_pago              DATE          NOT NULL DEFAULT CURRENT_DATE,
  fecha_registro          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nom_empleado ON nominas_pagadas (empleado_id);
CREATE INDEX IF NOT EXISTS idx_nom_periodo  ON nominas_pagadas (semana_inicio DESC);
CREATE INDEX IF NOT EXISTS idx_nom_fecha    ON nominas_pagadas (fecha_pago DESC);
