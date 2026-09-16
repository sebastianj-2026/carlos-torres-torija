-- ============================================================================
-- Reversa de M44. Restaura cada valor sustituido desde
-- `_respaldo_recalculo_half_up` (solo si la fila todavía tiene el valor nuevo:
-- un cambio posterior del usuario no se pisa) y suelta el respaldo.
-- Idempotente: sin tabla de respaldo no hace nada.
-- ============================================================================

BEGIN;

DO $$
BEGIN
  IF to_regclass('_respaldo_recalculo_half_up') IS NOT NULL THEN

    -- nóminas: total primero, luego componentes (orden inverso al up)
    UPDATE nominas_pagadas n SET monto_total_pagado = r.valor_anterior
      FROM _respaldo_recalculo_half_up r
     WHERE r.tabla = 'nominas_pagadas' AND r.columna = 'monto_total_pagado'
       AND r.fila_id = n.id AND n.monto_total_pagado = r.valor_nuevo;

    UPDATE nominas_pagadas n SET monto_faltas = r.valor_anterior
      FROM _respaldo_recalculo_half_up r
     WHERE r.tabla = 'nominas_pagadas' AND r.columna = 'monto_faltas'
       AND r.fila_id = n.id AND n.monto_faltas = r.valor_nuevo;

    UPDATE nominas_pagadas n SET monto_prima_vacacional = r.valor_anterior
      FROM _respaldo_recalculo_half_up r
     WHERE r.tabla = 'nominas_pagadas' AND r.columna = 'monto_prima_vacacional'
       AND r.fila_id = n.id AND n.monto_prima_vacacional = r.valor_nuevo;

    UPDATE nominas_pagadas n SET monto_horas_extras = r.valor_anterior
      FROM _respaldo_recalculo_half_up r
     WHERE r.tabla = 'nominas_pagadas' AND r.columna = 'monto_horas_extras'
       AND r.fila_id = n.id AND n.monto_horas_extras = r.valor_nuevo;

    -- participantes
    UPDATE participantes_prestamo pp SET interes_mensual = r.valor_anterior
      FROM _respaldo_recalculo_half_up r
     WHERE r.tabla = 'participantes_prestamo' AND r.columna = 'interes_mensual'
       AND r.fila_id = pp.id AND pp.interes_mensual = r.valor_nuevo;

    -- préstamos: entregado primero, luego anticipado (orden inverso al up)
    UPDATE prestamos p SET cantidad_entregada = r.valor_anterior, fecha_actualizacion = NOW()
      FROM _respaldo_recalculo_half_up r
     WHERE r.tabla = 'prestamos' AND r.columna = 'cantidad_entregada'
       AND r.fila_id = p.id AND p.cantidad_entregada = r.valor_nuevo;

    UPDATE prestamos p SET interes_anticipado = r.valor_anterior, fecha_actualizacion = NOW()
      FROM _respaldo_recalculo_half_up r
     WHERE r.tabla = 'prestamos' AND r.columna = 'interes_anticipado'
       AND r.fila_id = p.id AND p.interes_anticipado = r.valor_nuevo;

  END IF;
END $$;

DROP TABLE IF EXISTS _respaldo_recalculo_half_up;

COMMIT;
