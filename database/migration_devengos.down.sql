-- ================================================================
-- M12 · Reversa: tira la tabla `devengos` nueva y restaura el nombre
-- de la huérfana descartada (si existe).
-- Guarda: aborta si la tabla nueva ya tiene filas — en ese caso la
-- reversa es decisión humana, no automática.
-- ================================================================
BEGIN;

DO $$
DECLARE
  n BIGINT;
BEGIN
  -- Solo actuar si la devengos actual es la NUEVA (tiene inversionista_id)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'devengos'
      AND column_name = 'inversionista_id'
  ) THEN
    EXECUTE 'SELECT count(*) FROM devengos' INTO n;
    IF n > 0 THEN
      RAISE EXCEPTION 'devengos tiene % filas: la reversa borraría deuda devengada. Abortando.', n;
    END IF;
    DROP TABLE devengos;
  END IF;

  -- Restaurar la tabla del módulo descartado a su nombre original
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'devengos_descartado'
  ) THEN
    ALTER TABLE devengos_descartado RENAME TO devengos;
    ALTER INDEX IF EXISTS devengos_descartado_pkey RENAME TO devengos_pkey;
    ALTER INDEX IF EXISTS devengos_descartado_fifo RENAME TO devengos_fifo;
    ALTER INDEX IF EXISTS devengos_descartado_periodo RENAME TO devengos_periodo;
  END IF;
END $$;

COMMIT;
