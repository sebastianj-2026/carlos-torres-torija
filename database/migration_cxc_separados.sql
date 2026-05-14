-- ================================================================
-- MIGRACIÓN: CxC separados — Préstamos e Inmuebles independientes
-- Ejecutar en Neon ANTES de reiniciar el backend.
-- ================================================================

-- ── 0. Agregar monto_mantenimiento a contratos existentes ────────
-- (permite que cxc_inmuebles exponga cuota de mantenimiento por contrato)
ALTER TABLE contratos_arrendamiento
  ADD COLUMN IF NOT EXISTS monto_mantenimiento NUMERIC(12,2) NOT NULL DEFAULT 0
    CHECK (monto_mantenimiento >= 0);

-- ── 1. VIEW cxc_prestamos ────────────────────────────────────────
-- Solo préstamos activos/atrasados. monto_interes calculado en tiempo real.
CREATE OR REPLACE VIEW cxc_prestamos AS
SELECT
  p.id,
  p.folio,
  p.cliente_id,
  CONCAT(
    c.nombres, ' ', c.apellido_paterno,
    CASE WHEN c.apellido_materno IS NOT NULL
         THEN ' ' || c.apellido_materno ELSE '' END
  )                                                             AS cliente_nombre,
  p.saldo_pendiente                                             AS monto_capital,
  ROUND(p.saldo_pendiente * p.tasa_interes_mensual / 100, 2)   AS monto_interes,
  EXTRACT(DAY FROM p.fecha_inicio)::SMALLINT                   AS dia_pago,
  p.tasa_interes_mensual,
  p.estatus
FROM prestamos p
JOIN clientes c ON c.id = p.cliente_id
WHERE p.estatus IN ('activo', 'atrasado');

-- ── 2. VIEW cxc_inmuebles ────────────────────────────────────────
-- Solo contratos activos. Expone renta + mantenimiento y dia_corte_pago.
CREATE OR REPLACE VIEW cxc_inmuebles AS
SELECT
  ca.id,
  ca.inmueble_id,
  ca.inquilino_id,
  CONCAT(iq.nombres, ' ', iq.apellidos)  AS inquilino_nombre,
  im.ubicacion_direccion                 AS inmueble_direccion,
  ca.monto_renta_mensual                 AS monto_renta,
  ca.monto_mantenimiento,
  ca.dia_corte_pago                      AS dia_pago,
  ca.estatus,
  ca.fecha_inicio,
  ca.fecha_fin
FROM contratos_arrendamiento ca
JOIN inquilinos iq ON iq.id = ca.inquilino_id
JOIN inmuebles  im ON im.id = ca.inmueble_id
WHERE ca.estatus = 'activo';

-- ── 3. TABLE historial_ingresos_central ─────────────────────────
-- Ledger unificado: solo recibe datos de CxC-Préstamos y CxC-Inmuebles.
-- Cancha/Estacionamiento/Otros siguen en historial_ingresos.
CREATE TABLE IF NOT EXISTS historial_ingresos_central (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Módulo de origen (exclusivo: solo estos dos módulos escriben aquí)
  origen                   VARCHAR(20) NOT NULL
                             CHECK (origen IN ('Prestamo', 'Inmueble')),

  -- FK al registro fuente (prestamo.id o contratos_arrendamiento.id)
  referencia_id            UUID        NOT NULL,

  -- Utilidad real: interés cobrado (préstamo) o renta cobrada (inmueble)
  monto_utilidad           NUMERIC(14,2) NOT NULL CHECK (monto_utilidad >= 0),

  -- Retorno de capital: SOLO para préstamos; siempre 0 para inmuebles
  monto_capital_recuperado NUMERIC(14,2) NOT NULL DEFAULT 0
                             CHECK (monto_capital_recuperado >= 0),

  periodo_mes              SMALLINT    NOT NULL CHECK (periodo_mes  BETWEEN 1 AND 12),
  periodo_anio             SMALLINT    NOT NULL CHECK (periodo_anio >= 2000),
  fecha_cobro              DATE        NOT NULL DEFAULT CURRENT_DATE,
  notas                    TEXT,
  registrado_por           UUID,
  fecha_registro           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hic_origen  ON historial_ingresos_central (origen);
CREATE INDEX IF NOT EXISTS idx_hic_periodo ON historial_ingresos_central (periodo_anio, periodo_mes);
CREATE INDEX IF NOT EXISTS idx_hic_ref     ON historial_ingresos_central (referencia_id);
