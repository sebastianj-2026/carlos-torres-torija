-- Reversa de M2. Quita índice, tabla `referencias` y la marca de deprecación.
-- Segura mientras nada aún referencie `referencias` (devengos/pagos no existen).
BEGIN;
DROP INDEX IF EXISTS idx_referencias_referenciador;
DROP TABLE IF EXISTS referencias;
-- Quitar la marca de deprecación de la columna vieja
COMMENT ON COLUMN inversiones.referenciador_id IS NULL;
COMMIT;
