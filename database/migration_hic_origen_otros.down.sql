-- ================================================================
-- Reversa: quita 'Otros' del CHECK. Aborta si ya hay filas con ese
-- origen — quedarían fuera del constraint.
-- ================================================================
BEGIN;

DO $$
DECLARE
  n BIGINT;
BEGIN
  SELECT count(*) INTO n FROM historial_ingresos_central WHERE origen = 'Otros';
  IF n > 0 THEN
    RAISE EXCEPTION 'Hay % filas con origen Otros: la reversa las dejaría fuera del CHECK. Abortando.', n;
  END IF;
END $$;

ALTER TABLE historial_ingresos_central DROP CONSTRAINT IF EXISTS hic_origen_check;
ALTER TABLE historial_ingresos_central ADD CONSTRAINT hic_origen_check
  CHECK (origen IN ('Prestamo', 'Inmueble', 'Estacionamiento', 'Cancha'));

COMMIT;
