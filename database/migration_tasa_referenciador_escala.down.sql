-- ============================================================================
-- Reversa de M11. Devuelve inversiones.tasa_referenciador a la escala vieja
-- NUMERIC(6,4) (0.50 -> 0.0050, / 100) y suelta el respaldo.
-- La división simétrica reconstruye el valor original sin pérdida para todo
-- valor que quepa en (6,4); cubre también filas creadas tras la migración.
-- Idempotente: solo revierte si la escala está en (5,2).
-- ============================================================================

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'inversiones'
       AND column_name = 'tasa_referenciador'
       AND numeric_scale = 2
  ) THEN

    ALTER TABLE inversiones
      ALTER COLUMN tasa_referenciador TYPE NUMERIC(6,4)
      USING (tasa_referenciador / 100);

  END IF;
END $$;

DROP TABLE IF EXISTS _respaldo_tasa_referenciador;

COMMIT;
