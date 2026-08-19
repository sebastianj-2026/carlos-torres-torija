-- ============================================================================
-- migration_inversionistas_datos_bancarios.up.sql
-- M9 · Datos bancarios en inversionistas: numero_cuenta y banco.
-- Ambos OPCIONALES — a la mano al momento de pagar, nada los vuelve obligatorios.
-- Idempotente. Aplicación a Neon: node scripts/apply-migration.js <archivo>.
-- ============================================================================

BEGIN;

ALTER TABLE inversionistas ADD COLUMN IF NOT EXISTS numero_cuenta VARCHAR(30);
ALTER TABLE inversionistas ADD COLUMN IF NOT EXISTS banco         VARCHAR(60);

COMMIT;
