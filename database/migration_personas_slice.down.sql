-- ============================================================================
-- migration_personas_slice.down.sql   ·   reversa de P-001
-- Revierte migration_personas_slice.up.sql. Orden hijo→padre.
-- Idempotente (IF EXISTS). Los índices caen con sus tablas.
--
-- ⚠️ Destructivo: elimina aportaciones/persona_documentos/personas y sus datos.
-- NO correr en prod con datos reales salvo rollback intencional.
-- Nada de esto toca el legacy (clientes/inversionistas/inversiones).
-- ============================================================================

BEGIN;

DROP TABLE IF EXISTS aportaciones        CASCADE;
DROP TABLE IF EXISTS persona_documentos  CASCADE;
DROP TABLE IF EXISTS personas            CASCADE;

COMMIT;
