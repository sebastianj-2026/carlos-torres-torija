-- ============================================================================
-- migration_personas_slice_seed.down.sql   ·   reversa de P-002
-- Borra SOLO las filas sembradas (legacy_* IS NOT NULL). Las personas y
-- aportaciones creadas por UI (legacy_* NULL) se conservan.
--
-- Si una persona sembrada quedó referenciada por una aportación de UI, su
-- DELETE fallará por FK — es correcto: está en uso, no se borra a ciegas.
-- ============================================================================

BEGIN;

DELETE FROM aportaciones WHERE legacy_inversion_id IS NOT NULL;
DELETE FROM personas     WHERE legacy_inversionista_id IS NOT NULL;

COMMIT;
