-- ============================================================================
-- 2026-09-15_recalculo_half_up.up.sql
-- M44 · Recálculo retroactivo de montos derivados a half-up (docs/DINERO.md D3).
--
-- ⚠️ Válida SOLO pre-producción: la DB (Neon) es de desarrollo con seed demo.
--    Reabrir montos ya cobrados/pagados con dinero real exigiría re-especificar.
--
-- Qué hace: para cada columna que el backend calculaba con float + toFixed
-- (regla vieja) recalcula el valor con ROUND(…, 2) de Postgres (half-up para
-- montos positivos, la misma aritmética que lib/dinero.ts) y lo persiste.
-- Solo toca filas cuya diferencia es el drift de redondeo (≤ 1 centavo por
-- componente; ≤ 3 en el total de nómina, que suma 3 componentes): una
-- diferencia mayor es un override manual del usuario y NO se pisa.
-- Respaldo: cada valor sustituido queda en `_respaldo_recalculo_half_up`
-- (tabla, fila, columna, valor anterior, valor nuevo). La reversa lo restaura.
-- Idempotente: en una segunda corrida ninguna fila difiere → no hace nada.
--
-- Inventario del 2026-09-15 (antes de aplicar): 0 filas con drift en
-- prestamos (10), participantes_prestamo (10, 4 NULL de oficina con tasa 0 —
-- intencionales, fuera de alcance), nominas_pagadas (1), cuentas_por_pagar
-- rendimientos (0), moratorios_prestamo (0, y no recomputable: no persiste la
-- base). La migración queda como regla codificada, no como corrección de datos.
-- Aplicación: node scripts/migrar.js up
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS _respaldo_recalculo_half_up (
  tabla           TEXT          NOT NULL,
  fila_id         UUID          NOT NULL,
  columna         TEXT          NOT NULL,
  valor_anterior  NUMERIC(12,2),
  valor_nuevo     NUMERIC(12,2) NOT NULL,
  fecha           TIMESTAMP     NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tabla, fila_id, columna)
);

-- ── 1. prestamos.interes_anticipado = monto_prestado × tasa / 100 ─────────
INSERT INTO _respaldo_recalculo_half_up (tabla, fila_id, columna, valor_anterior, valor_nuevo)
SELECT 'prestamos', id, 'interes_anticipado', interes_anticipado,
       ROUND(monto_prestado * tasa_interes_mensual / 100, 2)
  FROM prestamos
 WHERE interes_anticipado IS NOT NULL
   AND interes_anticipado <> ROUND(monto_prestado * tasa_interes_mensual / 100, 2)
   AND ABS(interes_anticipado - ROUND(monto_prestado * tasa_interes_mensual / 100, 2)) <= 0.01
ON CONFLICT DO NOTHING;

UPDATE prestamos p
   SET interes_anticipado = r.valor_nuevo, fecha_actualizacion = NOW()
  FROM _respaldo_recalculo_half_up r
 WHERE r.tabla = 'prestamos' AND r.columna = 'interes_anticipado'
   AND r.fila_id = p.id AND p.interes_anticipado = r.valor_anterior;

-- ── 2. prestamos.cantidad_entregada = prestado − anticipado − apertura − avalúo − notariales
--       (usa el anticipado YA recalculado del paso 1)
INSERT INTO _respaldo_recalculo_half_up (tabla, fila_id, columna, valor_anterior, valor_nuevo)
SELECT 'prestamos', id, 'cantidad_entregada', cantidad_entregada,
       monto_prestado - interes_anticipado - COALESCE(apertura, 0) - COALESCE(avaluo, 0) - COALESCE(gastos_notariales, 0)
  FROM prestamos
 WHERE cantidad_entregada IS NOT NULL AND interes_anticipado IS NOT NULL
   AND cantidad_entregada <> monto_prestado - interes_anticipado - COALESCE(apertura, 0) - COALESCE(avaluo, 0) - COALESCE(gastos_notariales, 0)
   AND ABS(cantidad_entregada - (monto_prestado - interes_anticipado - COALESCE(apertura, 0) - COALESCE(avaluo, 0) - COALESCE(gastos_notariales, 0))) <= 0.01
ON CONFLICT DO NOTHING;

UPDATE prestamos p
   SET cantidad_entregada = r.valor_nuevo, fecha_actualizacion = NOW()
  FROM _respaldo_recalculo_half_up r
 WHERE r.tabla = 'prestamos' AND r.columna = 'cantidad_entregada'
   AND r.fila_id = p.id AND p.cantidad_entregada = r.valor_anterior;

-- ── 3. participantes_prestamo.interes_mensual = aportado × tasa_rendimiento / 100
--       (NULL con tasa 0 = participación de la oficina: intencional, no se toca)
INSERT INTO _respaldo_recalculo_half_up (tabla, fila_id, columna, valor_anterior, valor_nuevo)
SELECT 'participantes_prestamo', id, 'interes_mensual', interes_mensual,
       ROUND(monto_aportado * tasa_rendimiento / 100, 2)
  FROM participantes_prestamo
 WHERE interes_mensual IS NOT NULL
   AND interes_mensual <> ROUND(monto_aportado * tasa_rendimiento / 100, 2)
   AND ABS(interes_mensual - ROUND(monto_aportado * tasa_rendimiento / 100, 2)) <= 0.01
ON CONFLICT DO NOTHING;

UPDATE participantes_prestamo pp
   SET interes_mensual = r.valor_nuevo
  FROM _respaldo_recalculo_half_up r
 WHERE r.tabla = 'participantes_prestamo' AND r.columna = 'interes_mensual'
   AND r.fila_id = pp.id AND pp.interes_mensual = r.valor_anterior;

-- ── 4. nominas_pagadas: componentes con un solo redondeo (D2) ─────────────
--   horas extra : sueldo × horas × mult / 48
--   prima       : sueldo × días × 25 / 600
--   faltas      : sueldo × faltas / 6
INSERT INTO _respaldo_recalculo_half_up (tabla, fila_id, columna, valor_anterior, valor_nuevo)
SELECT 'nominas_pagadas', id, 'monto_horas_extras', monto_horas_extras,
       ROUND(sueldo_base * horas_extras_cantidad * (CASE tipo_hora_extra WHEN 'Normal' THEN 1 WHEN 'Doble' THEN 2 ELSE 3 END) / 48, 2)
  FROM nominas_pagadas
 WHERE horas_extras_cantidad > 0 AND tipo_hora_extra IS NOT NULL
   AND monto_horas_extras <> ROUND(sueldo_base * horas_extras_cantidad * (CASE tipo_hora_extra WHEN 'Normal' THEN 1 WHEN 'Doble' THEN 2 ELSE 3 END) / 48, 2)
   AND ABS(monto_horas_extras - ROUND(sueldo_base * horas_extras_cantidad * (CASE tipo_hora_extra WHEN 'Normal' THEN 1 WHEN 'Doble' THEN 2 ELSE 3 END) / 48, 2)) <= 0.01
ON CONFLICT DO NOTHING;

INSERT INTO _respaldo_recalculo_half_up (tabla, fila_id, columna, valor_anterior, valor_nuevo)
SELECT 'nominas_pagadas', id, 'monto_prima_vacacional', monto_prima_vacacional,
       ROUND(sueldo_base * dias_vacaciones_periodo * 25 / 600, 2)
  FROM nominas_pagadas
 WHERE dias_vacaciones_periodo > 0
   AND monto_prima_vacacional <> ROUND(sueldo_base * dias_vacaciones_periodo * 25 / 600, 2)
   AND ABS(monto_prima_vacacional - ROUND(sueldo_base * dias_vacaciones_periodo * 25 / 600, 2)) <= 0.01
ON CONFLICT DO NOTHING;

INSERT INTO _respaldo_recalculo_half_up (tabla, fila_id, columna, valor_anterior, valor_nuevo)
SELECT 'nominas_pagadas', id, 'monto_faltas', monto_faltas,
       ROUND(sueldo_base * faltas_cantidad / 6, 2)
  FROM nominas_pagadas
 WHERE faltas_cantidad > 0
   AND monto_faltas <> ROUND(sueldo_base * faltas_cantidad / 6, 2)
   AND ABS(monto_faltas - ROUND(sueldo_base * faltas_cantidad / 6, 2)) <= 0.01
ON CONFLICT DO NOTHING;

UPDATE nominas_pagadas n SET monto_horas_extras = r.valor_nuevo
  FROM _respaldo_recalculo_half_up r
 WHERE r.tabla = 'nominas_pagadas' AND r.columna = 'monto_horas_extras'
   AND r.fila_id = n.id AND n.monto_horas_extras = r.valor_anterior;

UPDATE nominas_pagadas n SET monto_prima_vacacional = r.valor_nuevo
  FROM _respaldo_recalculo_half_up r
 WHERE r.tabla = 'nominas_pagadas' AND r.columna = 'monto_prima_vacacional'
   AND r.fila_id = n.id AND n.monto_prima_vacacional = r.valor_anterior;

UPDATE nominas_pagadas n SET monto_faltas = r.valor_nuevo
  FROM _respaldo_recalculo_half_up r
 WHERE r.tabla = 'nominas_pagadas' AND r.columna = 'monto_faltas'
   AND r.fila_id = n.id AND n.monto_faltas = r.valor_anterior;

-- Total neto con los componentes YA recalculados (hasta 3 centavos de drift acumulado)
INSERT INTO _respaldo_recalculo_half_up (tabla, fila_id, columna, valor_anterior, valor_nuevo)
SELECT 'nominas_pagadas', id, 'monto_total_pagado', monto_total_pagado,
       GREATEST(0, sueldo_base + monto_horas_extras + monto_prima_vacacional + bonos + ajuste_monto - monto_faltas - descuento_prestamo)
  FROM nominas_pagadas
 WHERE monto_total_pagado <> GREATEST(0, sueldo_base + monto_horas_extras + monto_prima_vacacional + bonos + ajuste_monto - monto_faltas - descuento_prestamo)
   AND ABS(monto_total_pagado - GREATEST(0, sueldo_base + monto_horas_extras + monto_prima_vacacional + bonos + ajuste_monto - monto_faltas - descuento_prestamo)) <= 0.03
ON CONFLICT DO NOTHING;

UPDATE nominas_pagadas n SET monto_total_pagado = r.valor_nuevo
  FROM _respaldo_recalculo_half_up r
 WHERE r.tabla = 'nominas_pagadas' AND r.columna = 'monto_total_pagado'
   AND r.fila_id = n.id AND n.monto_total_pagado = r.valor_anterior;

COMMIT;
