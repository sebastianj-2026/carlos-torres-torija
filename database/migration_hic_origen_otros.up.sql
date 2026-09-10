-- ================================================================
-- Deuda dashboard · `historial_ingresos_central` acepta origen 'Otros'
-- Los ingresos atípicos (pestaña Ingresos Extras) se espejan al ledger
-- central con origen 'Otros'; el CHECK viejo no lo listaba.
-- ================================================================
BEGIN;

ALTER TABLE historial_ingresos_central DROP CONSTRAINT IF EXISTS hic_origen_check;
ALTER TABLE historial_ingresos_central ADD CONSTRAINT hic_origen_check
  CHECK (origen IN ('Prestamo', 'Inmueble', 'Estacionamiento', 'Cancha', 'Otros'));

COMMIT;
