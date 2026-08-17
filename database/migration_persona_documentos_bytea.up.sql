-- ============================================================================
-- migration_persona_documentos_bytea.up.sql
-- Habilita comprobantes PDF en persona_documentos siguiendo el patrón del
-- legacy (bytes en BYTEA en la DB, no storage externo).
-- Añade `contenido BYTEA` y hace `storage_key` opcional.
-- Idempotente. Aplicación a Neon: MANUAL / via scripts/apply-migration.js.
-- ============================================================================

BEGIN;

ALTER TABLE persona_documentos ADD COLUMN IF NOT EXISTS contenido BYTEA;
ALTER TABLE persona_documentos ALTER COLUMN storage_key DROP NOT NULL;

COMMIT;
