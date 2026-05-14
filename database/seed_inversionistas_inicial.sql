-- ================================================================
-- SEED: Importación inicial de Inversionistas + Bolsa de Capital
-- Fecha de registro base: 2026-01-01
-- Ejecutar en Neon SQL Editor (una sola vez)
-- ================================================================

-- 1. Ensure wallet + rate columns exist (idempotente)
ALTER TABLE inversionistas
  ADD COLUMN IF NOT EXISTS capital_aportado_total   NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE inversionistas
  ADD COLUMN IF NOT EXISTS capital_disponible        NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE inversionistas
  ADD COLUMN IF NOT EXISTS tasa_rendimiento_pactada  NUMERIC(5,2)  NOT NULL DEFAULT 0;

-- 2. Insert inversionistas (WHERE NOT EXISTS = no requiere índice único previo)
--    OSCAR VILLALOBOS: 2 registros de inversión → capital agregado (920,000 + 312,000 = 1,232,000)
INSERT INTO inversionistas
  (nombres, apellido_paterno, apellido_materno,
   capital_aportado_total, capital_disponible, tasa_rendimiento_pactada,
   fecha_registro, fecha_actualizacion)
SELECT v.nombres, v.apellido_paterno, v.apellido_materno,
       v.capital_aportado_total, v.capital_disponible, v.tasa_rendimiento_pactada,
       v.fecha_registro, v.fecha_actualizacion
FROM (VALUES
  ('FABIO',         'TORRESINI',       NULL::VARCHAR,   1010000.00, 1010000.00, 1.25, '2026-01-01'::TIMESTAMP, '2026-01-01'::TIMESTAMP),
  ('JOSE MANUEL',   'VERDUZCO',        NULL,            4000000.00, 4000000.00, 1.00, '2026-01-01', '2026-01-01'),
  ('SARA GEORGINA', 'CUE',             'PASCALIS',       150000.00,  150000.00, 0.00, '2026-01-01', '2026-01-01'),
  ('LOURDES',       'CUE',             'PASCALIS',      1565000.00, 1565000.00, 1.05, '2026-01-01', '2026-01-01'),
  ('OSCAR',         'VILLALOBOS',      NULL,            1232000.00, 1232000.00, 1.16, '2026-01-01', '2026-01-01'),
  ('JOSE ALBERTO',  'RODRIGUEZ',       'SERRANO',       1000000.00, 1000000.00, 1.50, '2026-01-01', '2026-01-01'),
  ('EUGENIA',       'AGUILAR',         NULL,            1500000.00, 1500000.00, 1.25, '2026-01-01', '2026-01-01'),
  ('MANUEL ANDRE',  'MIRANDA',         'CASTRO',          50000.00,   50000.00, 1.50, '2026-01-01', '2026-01-01'),
  ('ORLANDO',       'GARCIA',          NULL,             200000.00,  200000.00, 1.50, '2026-01-01', '2026-01-01'),
  ('SELENE',        'TORRES',          'PALACIO',        100000.00,  100000.00, 2.30, '2026-01-01', '2026-01-01'),
  ('REGINA',        'COSS',            NULL,              50000.00,   50000.00, 1.50, '2026-01-01', '2026-01-01'),
  ('AMIGA',         'SELENE',          NULL,             200000.00,  200000.00, 2.50, '2026-01-01', '2026-01-01'),
  ('JOSE',          'TORRES',          'PALACIO',        500000.00,  500000.00, 2.00, '2026-01-01', '2026-01-01'),
  ('MAX',           'TORRES',          'PALACIO',        500000.00,  500000.00, 2.00, '2026-01-01', '2026-01-01'),
  ('ROSA ALICIA',   'JIMENEZ DE ALBA', NULL,             150000.00,  150000.00, 1.50, '2026-01-01', '2026-01-01'),
  ('LUZ ELENA',     'AWERHOFF',        NULL,             200000.00,  200000.00, 1.25, '2026-01-01', '2026-01-01'),
  ('FERNANDO',      'GONZALEZ',        'LEAL',           500000.00,  500000.00, 1.50, '2026-01-01', '2026-01-01'),
  ('SEBASTIAN',     'JIMENEZ DE ALBA', NULL,              10000.00,   10000.00, 0.00, '2026-01-01', '2026-01-01'),
  ('LORENA',        'CABRERA',         NULL,              25000.00,   25000.00, 0.00, '2026-01-01', '2026-01-01')
) AS v(nombres, apellido_paterno, apellido_materno,
       capital_aportado_total, capital_disponible, tasa_rendimiento_pactada,
       fecha_registro, fecha_actualizacion)
WHERE NOT EXISTS (
  SELECT 1 FROM inversionistas i
  WHERE i.nombres = v.nombres AND i.apellido_paterno = v.apellido_paterno
);

-- 4. Log de movimientos — 21 entradas (Oscar genera 2 movimientos: 920k y 312k)
INSERT INTO movimientos_inversionistas
  (inversionista_id, tipo, monto, concepto, fecha_movimiento)

SELECT i.id, 'entrada', 1010000.00, 'Aportación Inicial de Capital', '2026-01-01 00:00:00'
  FROM inversionistas i WHERE i.nombres = 'FABIO'         AND i.apellido_paterno = 'TORRESINI'
UNION ALL
SELECT i.id, 'entrada', 4000000.00, 'Aportación Inicial de Capital', '2026-01-01 00:00:00'
  FROM inversionistas i WHERE i.nombres = 'JOSE MANUEL'   AND i.apellido_paterno = 'VERDUZCO'
UNION ALL
SELECT i.id, 'entrada',  150000.00, 'Aportación Inicial de Capital', '2026-01-01 00:00:00'
  FROM inversionistas i WHERE i.nombres = 'SARA GEORGINA' AND i.apellido_paterno = 'CUE'
UNION ALL
SELECT i.id, 'entrada', 1565000.00, 'Aportación Inicial de Capital', '2026-01-01 00:00:00'
  FROM inversionistas i WHERE i.nombres = 'LOURDES'       AND i.apellido_paterno = 'CUE'
UNION ALL
-- Oscar: primer registro de inversión
SELECT i.id, 'entrada',  920000.00, 'Aportación Inicial de Capital', '2026-01-01 00:00:00'
  FROM inversionistas i WHERE i.nombres = 'OSCAR'         AND i.apellido_paterno = 'VILLALOBOS'
UNION ALL
-- Oscar: segundo registro de inversión
SELECT i.id, 'entrada',  312000.00, 'Aportación Inicial de Capital', '2026-01-01 00:00:00'
  FROM inversionistas i WHERE i.nombres = 'OSCAR'         AND i.apellido_paterno = 'VILLALOBOS'
UNION ALL
SELECT i.id, 'entrada', 1000000.00, 'Aportación Inicial de Capital', '2026-01-01 00:00:00'
  FROM inversionistas i WHERE i.nombres = 'JOSE ALBERTO'  AND i.apellido_paterno = 'RODRIGUEZ'
UNION ALL
SELECT i.id, 'entrada', 1500000.00, 'Aportación Inicial de Capital', '2026-01-01 00:00:00'
  FROM inversionistas i WHERE i.nombres = 'EUGENIA'       AND i.apellido_paterno = 'AGUILAR'
UNION ALL
SELECT i.id, 'entrada',   50000.00, 'Aportación Inicial de Capital', '2026-01-01 00:00:00'
  FROM inversionistas i WHERE i.nombres = 'MANUEL ANDRE'  AND i.apellido_paterno = 'MIRANDA'
UNION ALL
SELECT i.id, 'entrada',  200000.00, 'Aportación Inicial de Capital', '2026-01-01 00:00:00'
  FROM inversionistas i WHERE i.nombres = 'ORLANDO'       AND i.apellido_paterno = 'GARCIA'
UNION ALL
SELECT i.id, 'entrada',  100000.00, 'Aportación Inicial de Capital', '2026-01-01 00:00:00'
  FROM inversionistas i WHERE i.nombres = 'SELENE'        AND i.apellido_paterno = 'TORRES'
UNION ALL
SELECT i.id, 'entrada',   50000.00, 'Aportación Inicial de Capital', '2026-01-01 00:00:00'
  FROM inversionistas i WHERE i.nombres = 'REGINA'        AND i.apellido_paterno = 'COSS'
UNION ALL
SELECT i.id, 'entrada',  200000.00, 'Aportación Inicial de Capital', '2026-01-01 00:00:00'
  FROM inversionistas i WHERE i.nombres = 'AMIGA'         AND i.apellido_paterno = 'SELENE'
UNION ALL
SELECT i.id, 'entrada',  500000.00, 'Aportación Inicial de Capital', '2026-01-01 00:00:00'
  FROM inversionistas i WHERE i.nombres = 'JOSE'          AND i.apellido_paterno = 'TORRES'
UNION ALL
SELECT i.id, 'entrada',  500000.00, 'Aportación Inicial de Capital', '2026-01-01 00:00:00'
  FROM inversionistas i WHERE i.nombres = 'MAX'           AND i.apellido_paterno = 'TORRES'
UNION ALL
SELECT i.id, 'entrada',  150000.00, 'Aportación Inicial de Capital', '2026-01-01 00:00:00'
  FROM inversionistas i WHERE i.nombres = 'ROSA ALICIA'   AND i.apellido_paterno = 'JIMENEZ DE ALBA'
UNION ALL
SELECT i.id, 'entrada',  200000.00, 'Aportación Inicial de Capital', '2026-01-01 00:00:00'
  FROM inversionistas i WHERE i.nombres = 'LUZ ELENA'     AND i.apellido_paterno = 'AWERHOFF'
UNION ALL
SELECT i.id, 'entrada',  500000.00, 'Aportación Inicial de Capital', '2026-01-01 00:00:00'
  FROM inversionistas i WHERE i.nombres = 'FERNANDO'      AND i.apellido_paterno = 'GONZALEZ'
UNION ALL
SELECT i.id, 'entrada',   10000.00, 'Aportación Inicial de Capital', '2026-01-01 00:00:00'
  FROM inversionistas i WHERE i.nombres = 'SEBASTIAN'     AND i.apellido_paterno = 'JIMENEZ DE ALBA'
UNION ALL
SELECT i.id, 'entrada',   25000.00, 'Aportación Inicial de Capital', '2026-01-01 00:00:00'
  FROM inversionistas i WHERE i.nombres = 'LORENA'        AND i.apellido_paterno = 'CABRERA';

-- 5. Insert inversiones (fuente de total_invertido e inversiones_activas en el listado)
--    Oscar: 2 filas (920k y 312k como entradas separadas de capital)
INSERT INTO inversiones
  (inversionista_id, monto_inicial, monto_actual, tasa_interes_mensual,
   dia_pago, estatus, fecha_inicio)
SELECT inv.id, v.monto, v.monto, v.tasa, 1, 'activo', '2026-01-01'
FROM (VALUES
  ('FABIO',         'TORRESINI',       1010000.00::NUMERIC, 1.25::NUMERIC),
  ('JOSE MANUEL',   'VERDUZCO',        4000000.00,          1.00),
  ('SARA GEORGINA', 'CUE',              150000.00,           0.00),
  ('LOURDES',       'CUE',            1565000.00,            1.05),
  ('OSCAR',         'VILLALOBOS',       920000.00,           1.16),
  ('OSCAR',         'VILLALOBOS',       312000.00,           1.16),
  ('JOSE ALBERTO',  'RODRIGUEZ',       1000000.00,           1.50),
  ('EUGENIA',       'AGUILAR',         1500000.00,           1.25),
  ('MANUEL ANDRE',  'MIRANDA',           50000.00,           1.50),
  ('ORLANDO',       'GARCIA',           200000.00,           1.50),
  ('SELENE',        'TORRES',           100000.00,           2.30),
  ('REGINA',        'COSS',              50000.00,           1.50),
  ('AMIGA',         'SELENE',           200000.00,           2.50),
  ('JOSE',          'TORRES',           500000.00,           2.00),
  ('MAX',           'TORRES',           500000.00,           2.00),
  ('ROSA ALICIA',   'JIMENEZ DE ALBA',  150000.00,           1.50),
  ('LUZ ELENA',     'AWERHOFF',         200000.00,           1.25),
  ('FERNANDO',      'GONZALEZ',         500000.00,           1.50),
  ('SEBASTIAN',     'JIMENEZ DE ALBA',   10000.00,           0.00),
  ('LORENA',        'CABRERA',           25000.00,           0.00)
) AS v(nombres, apellido_paterno, monto, tasa)
JOIN inversionistas inv
  ON inv.nombres = v.nombres AND inv.apellido_paterno = v.apellido_paterno
WHERE NOT EXISTS (
  SELECT 1 FROM inversiones
  WHERE inversionista_id = inv.id
    AND monto_inicial = v.monto
    AND fecha_inicio  = '2026-01-01'
);

