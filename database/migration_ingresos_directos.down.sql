-- ================================================================
-- Reversa: tira metricas_cancha e ingresos_directos, abortando si hay
-- filas — borrar ingresos reales es decisión humana.
-- ================================================================
BEGIN;

DO $$
DECLARE
  n BIGINT;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'ingresos_directos') THEN
    EXECUTE 'SELECT count(*) FROM ingresos_directos' INTO n;
    IF n > 0 THEN
      RAISE EXCEPTION 'ingresos_directos tiene % filas: la reversa borraría ingresos reales. Abortando.', n;
    END IF;
    DROP TABLE IF EXISTS metricas_cancha;
    DROP TABLE ingresos_directos;
  END IF;
END $$;

COMMIT;
