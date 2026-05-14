-- ================================================================
-- OFICINA TS — Migración: índices para calendario de cobros
-- Ejecutar en consola Neon
-- ================================================================

-- Índice compuesto para consultas de período en historial de pagos
CREATE INDEX IF NOT EXISTS idx_pagos_periodo
  ON historial_pagos_prestamo(prestamo_id, tipo_pago, periodo_mes, periodo_anio);

-- Índice para listado de préstamos activos por día de pago
CREATE INDEX IF NOT EXISTS idx_prestamos_activos_dia
  ON prestamos(estatus, fecha_inicio)
  WHERE estatus IN ('activo', 'atrasado');
