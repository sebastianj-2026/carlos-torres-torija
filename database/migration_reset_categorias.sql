-- ================================================================
-- MIGRACIÓN: Hard reset de categorías + campo modulo
-- Ejecutar UNA sola vez en Neon
-- ADVERTENCIA: reasigna todas las cuentas a la categoría fallback
--              del módulo correspondiente antes de borrar las viejas.
-- ================================================================

BEGIN;

-- 1. Agregar columna modulo (nullable temporalmente para poder marcar las viejas)
ALTER TABLE categorias_egresos
  ADD COLUMN IF NOT EXISTS modulo VARCHAR(20);

-- 2. Marcar todas las categorías existentes como 'OLD'
UPDATE categorias_egresos SET modulo = 'OLD' WHERE modulo IS NULL;

-- 3. Convertir a NOT NULL con default
ALTER TABLE categorias_egresos ALTER COLUMN modulo SET NOT NULL;
ALTER TABLE categorias_egresos ALTER COLUMN modulo SET DEFAULT 'Oficina';

-- 4. Eliminar el constraint único en sólo la columna nombre
--    (busca dinámicamente el nombre del constraint para evitar fallos)
DO $$
DECLARE cname TEXT;
BEGIN
  SELECT c.conname INTO cname
  FROM pg_constraint c
  WHERE c.conrelid = 'categorias_egresos'::regclass
    AND c.contype  = 'u'
    AND array_length(c.conkey, 1) = 1
    AND EXISTS (
      SELECT 1 FROM pg_attribute a
      WHERE a.attrelid = c.conrelid
        AND a.attnum   = c.conkey[1]
        AND a.attname  = 'nombre'
    )
  LIMIT 1;

  IF cname IS NOT NULL THEN
    EXECUTE 'ALTER TABLE categorias_egresos DROP CONSTRAINT ' || quote_ident(cname);
  END IF;
END $$;

-- 5. Crear constraint único en (nombre, modulo) si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname    = 'categorias_egresos_nombre_modulo_key'
      AND conrelid   = 'categorias_egresos'::regclass
  ) THEN
    ALTER TABLE categorias_egresos
      ADD CONSTRAINT categorias_egresos_nombre_modulo_key UNIQUE (nombre, modulo);
  END IF;
END $$;

-- 6. Insertar categorías de Gastos Oficina
INSERT INTO categorias_egresos (nombre, tipo_frecuencia, color, modulo) VALUES
  ('Oficina',         'variable', '#3b82f6', 'Oficina'),
  ('Mantenimiento',   'variable', '#f59e0b', 'Oficina'),
  ('Notaría',         'variable', '#6366f1', 'Oficina'),
  ('Abogados',        'variable', '#8b5cf6', 'Oficina'),
  ('Servicios',       'variable', '#06b6d4', 'Oficina'),
  ('Estacionamiento', 'variable', '#64748b', 'Oficina'),
  ('Cancha',          'variable', '#10b981', 'Oficina'),
  ('Prediales',       'fijo',     '#ef4444', 'Oficina'),
  ('Impuestos',       'fijo',     '#f97316', 'Oficina'),
  ('Nóminas',         'fijo',     '#0ea5e9', 'Oficina')
ON CONFLICT (nombre, modulo) DO UPDATE SET color = EXCLUDED.color, activo = true;

-- 7. Insertar categorías de Gastos Abril
INSERT INTO categorias_egresos (nombre, tipo_frecuencia, color, modulo) VALUES
  ('Fabricio', 'variable', '#a855f7', 'Abril'),
  ('Coco',     'variable', '#22c55e', 'Abril'),
  ('Nómina',   'fijo',     '#3b82f6', 'Abril'),
  ('Tarjetas', 'fijo',     '#ef4444', 'Abril'),
  ('Abril',    'variable', '#94a3b8', 'Abril'),
  ('Servicios','variable', '#06b6d4', 'Abril'),
  ('Casa',     'fijo',     '#f59e0b', 'Abril')
ON CONFLICT (nombre, modulo) DO UPDATE SET color = EXCLUDED.color, activo = true;

-- 8. Reasignar cuentas Oficina/Bancos/Inversionistas que apuntaban a categorías OLD
UPDATE cuentas_por_pagar
SET categoria_id = (
  SELECT id FROM categorias_egresos
  WHERE nombre = 'Oficina' AND modulo = 'Oficina'
  LIMIT 1
)
WHERE centro_costo IN ('Oficina', 'Bancos', 'Inversionistas')
  AND categoria_id IN (SELECT id FROM categorias_egresos WHERE modulo = 'OLD');

-- 9. Reasignar cuentas Abril que apuntaban a categorías OLD
UPDATE cuentas_por_pagar
SET categoria_id = (
  SELECT id FROM categorias_egresos
  WHERE nombre = 'Abril' AND modulo = 'Abril'
  LIMIT 1
)
WHERE centro_costo = 'Abril'
  AND categoria_id IN (SELECT id FROM categorias_egresos WHERE modulo = 'OLD');

-- 10. Eliminar categorías antiguas
DELETE FROM categorias_egresos WHERE modulo = 'OLD';

COMMIT;

-- Verificar resultado:
-- SELECT modulo, nombre, color FROM categorias_egresos ORDER BY modulo, nombre;
