-- M34 · Retire the orphan tables of the discarded personas/comisiones modules.
-- Nothing is deleted (project rule): tables are RENAMED to *_descartado, same
-- as devengos (M12) and pago_aplicaciones (M30). The rename preserves every
-- row (4 in personas, 4 in aportaciones — demo seed) and every FK follows the
-- table, so no _respaldo_* copy is needed. Indexes and sequences are renamed
-- too because their names are global and would block a future table.
--
-- Guard: abort if the tables are already renamed (idempotency) or if the code
-- ever re-created them with real use — the guard only checks existence here
-- because no controller references them (verified 2026-09-11, M32 removed the
-- last readers).
BEGIN;

DO $$
BEGIN
  IF to_regclass('public.personas') IS NULL THEN
    RAISE EXCEPTION 'personas no existe — ¿migración ya aplicada?';
  END IF;
  IF to_regclass('public.personas_descartado') IS NOT NULL THEN
    RAISE EXCEPTION 'personas_descartado ya existe — migración ya aplicada';
  END IF;
END $$;

-- Tables (children first is not required for RENAME, order is cosmetic)
ALTER TABLE personas           RENAME TO personas_descartado;
ALTER TABLE persona_documentos RENAME TO persona_documentos_descartado;
ALTER TABLE aportaciones       RENAME TO aportaciones_descartado;
ALTER TABLE pagos              RENAME TO pagos_descartado;

-- Indexes (global namespace)
ALTER INDEX personas_pkey                          RENAME TO personas_descartado_pkey;
ALTER INDEX personas_identidad                     RENAME TO personas_descartado_identidad;
ALTER INDEX personas_legacy_inversionista_id_key   RENAME TO personas_descartado_legacy_inversionista_id_key;
ALTER INDEX persona_documentos_pkey                RENAME TO persona_documentos_descartado_pkey;
ALTER INDEX aportaciones_pkey                      RENAME TO aportaciones_descartado_pkey;
ALTER INDEX aportaciones_inversionista             RENAME TO aportaciones_descartado_inversionista;
ALTER INDEX aportaciones_referenciador             RENAME TO aportaciones_descartado_referenciador;
ALTER INDEX aportaciones_legacy_inversion_id_key   RENAME TO aportaciones_descartado_legacy_inversion_id_key;
ALTER INDEX pagos_pkey                             RENAME TO pagos_descartado_pkey;

-- Sequences (global namespace)
ALTER SEQUENCE personas_id_seq           RENAME TO personas_descartado_id_seq;
ALTER SEQUENCE persona_documentos_id_seq RENAME TO persona_documentos_descartado_id_seq;
ALTER SEQUENCE aportaciones_id_seq       RENAME TO aportaciones_descartado_id_seq;
ALTER SEQUENCE pagos_id_seq              RENAME TO pagos_descartado_id_seq;

COMMIT;
