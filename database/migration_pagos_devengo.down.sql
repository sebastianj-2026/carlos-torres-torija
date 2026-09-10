-- ================================================================
-- M30 · Reversa: tira las tablas nuevas (abortando si tienen filas —
-- borrar pagos reales es decisión humana) y restaura el nombre de la
-- huérfana descartada.
-- ================================================================
BEGIN;

DO $$
DECLARE
  n BIGINT;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'pago_aplicaciones'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pago_aplicaciones'
      AND column_name = 'id' AND data_type = 'uuid'
  ) THEN
    EXECUTE 'SELECT count(*) FROM pago_aplicaciones' INTO n;
    IF n > 0 THEN
      RAISE EXCEPTION 'pago_aplicaciones tiene % filas: la reversa borraría trazabilidad de pagos. Abortando.', n;
    END IF;
    DROP TABLE pago_aplicaciones;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'pagos_devengo'
  ) THEN
    EXECUTE 'SELECT count(*) FROM pagos_devengo' INTO n;
    IF n > 0 THEN
      RAISE EXCEPTION 'pagos_devengo tiene % filas: la reversa borraría pagos reales. Abortando.', n;
    END IF;
    DROP TABLE pagos_devengo;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'pago_aplicaciones_descartado'
  ) THEN
    ALTER TABLE pago_aplicaciones_descartado RENAME TO pago_aplicaciones;
    ALTER INDEX IF EXISTS pago_aplicaciones_descartado_pkey
      RENAME TO pago_aplicaciones_pkey;
    ALTER INDEX IF EXISTS pago_aplicaciones_descartado_pago_id_devengo_id_key
      RENAME TO pago_aplicaciones_pago_id_devengo_id_key;
  END IF;
END $$;

COMMIT;
