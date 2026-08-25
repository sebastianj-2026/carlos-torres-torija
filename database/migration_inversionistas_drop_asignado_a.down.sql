-- Reversa de M10. Restaura `asignado_a` con su CHECK original y recupera los
-- valores respaldados en `_respaldo_asignado_a`, luego suelta el respaldo.
BEGIN;

ALTER TABLE inversionistas
  ADD COLUMN IF NOT EXISTS asignado_a VARCHAR(20)
  CHECK (asignado_a IN ('sebastian', 'abril'));

UPDATE inversionistas i
   SET asignado_a = r.asignado_a
  FROM _respaldo_asignado_a r
 WHERE r.inversionista_id = i.id;

DROP TABLE IF EXISTS _respaldo_asignado_a;

COMMIT;
