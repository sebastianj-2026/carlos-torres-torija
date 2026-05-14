-- ================================================================
-- MIGRACIÓN v3: tipos de garantía + aval_nombre + archivos nuevos
-- Aplica en Neon — ejecutar UNA sola vez
-- ================================================================

-- 1. Nuevo campo: nombre del avalista en pagaré
ALTER TABLE prestamos
  ADD COLUMN IF NOT EXISTS aval_nombre VARCHAR(200);

-- 2. Ampliar constraint tipo_garantia (quitar 'aval', ya estaba 'pagare')
ALTER TABLE prestamos DROP CONSTRAINT IF EXISTS prestamos_tipo_garantia_check;
ALTER TABLE prestamos
  ADD CONSTRAINT prestamos_tipo_garantia_check
  CHECK (tipo_garantia IN ('hipotecaria', 'pagare', 'otra'));

-- Migrar registros con tipo 'aval' → 'pagare' (retrocompatibilidad)
UPDATE prestamos SET tipo_garantia = 'pagare' WHERE tipo_garantia = 'aval';

-- 3. Ampliar constraint de tipo en archivos_prestamo
ALTER TABLE archivos_prestamo DROP CONSTRAINT IF EXISTS archivos_prestamo_tipo_check;
ALTER TABLE archivos_prestamo
  ADD CONSTRAINT archivos_prestamo_tipo_check
  CHECK (tipo IN (
    'avaluo',
    'gastos_notariales',
    'escritura',
    'contrato_firmado',
    'pagare_firmado',
    'documento_propiedad',
    'contrato_terminos'
  ));
