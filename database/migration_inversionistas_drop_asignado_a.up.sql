-- ============================================================================
-- migration_inversionistas_drop_asignado_a.up.sql
-- M10 · Quita `asignado_a` de inversionistas. Es de otro sistema, no aplica aquí.
-- Depende de M10a (backend dejó de leerla) y M10b (frontend dejó de leerla):
-- el grep de `asignado_a` en código ya vuelve limpio.
-- Respaldo: antes del DROP, los valores vivos se copian a
-- `_respaldo_asignado_a` para que la reversa restaure estructura Y datos.
-- Idempotente. Aplicación a Neon: node scripts/apply-migration.js <archivo>.
-- ============================================================================

BEGIN;

-- Respaldo de los valores no nulos antes de dropear (P: nada se borra sin reversa).
CREATE TABLE IF NOT EXISTS _respaldo_asignado_a (
  inversionista_id UUID PRIMARY KEY,
  asignado_a       VARCHAR(20)
);

INSERT INTO _respaldo_asignado_a (inversionista_id, asignado_a)
SELECT id, asignado_a
  FROM inversionistas
 WHERE asignado_a IS NOT NULL
ON CONFLICT (inversionista_id) DO NOTHING;

ALTER TABLE inversionistas DROP COLUMN IF EXISTS asignado_a;

COMMIT;
