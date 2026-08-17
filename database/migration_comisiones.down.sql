-- ============================================================================
-- migration_comisiones.down.sql   ·   reversa de T-004
-- Revierte migration_comisiones.up.sql. Orden hijo→padre (índices y vista
-- caen con/antes de sus tablas). Idempotente (IF EXISTS).
--
-- ⚠️ Destructivo: elimina devengos/pagos/pago_aplicaciones y sus datos.
-- No toca personas ni el legacy.
-- ============================================================================

BEGIN;

DROP VIEW  IF EXISTS saldo_por_persona;
DROP TABLE IF EXISTS pago_aplicaciones CASCADE;
DROP TABLE IF EXISTS pagos             CASCADE;
DROP TABLE IF EXISTS devengos          CASCADE;

COMMIT;
