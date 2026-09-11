-- Reverse of migration_tablas_huerfanas_descartadas: restore original names.
BEGIN;

DO $$
BEGIN
  IF to_regclass('public.personas_descartado') IS NULL THEN
    RAISE EXCEPTION 'personas_descartado no existe — nada que revertir';
  END IF;
  IF to_regclass('public.personas') IS NOT NULL THEN
    RAISE EXCEPTION 'personas ya existe — el nombre está ocupado, revisa a mano';
  END IF;
END $$;

ALTER TABLE personas_descartado           RENAME TO personas;
ALTER TABLE persona_documentos_descartado RENAME TO persona_documentos;
ALTER TABLE aportaciones_descartado       RENAME TO aportaciones;
ALTER TABLE pagos_descartado              RENAME TO pagos;

ALTER INDEX personas_descartado_pkey                          RENAME TO personas_pkey;
ALTER INDEX personas_descartado_identidad                     RENAME TO personas_identidad;
ALTER INDEX personas_descartado_legacy_inversionista_id_key   RENAME TO personas_legacy_inversionista_id_key;
ALTER INDEX persona_documentos_descartado_pkey                RENAME TO persona_documentos_pkey;
ALTER INDEX aportaciones_descartado_pkey                      RENAME TO aportaciones_pkey;
ALTER INDEX aportaciones_descartado_inversionista             RENAME TO aportaciones_inversionista;
ALTER INDEX aportaciones_descartado_referenciador             RENAME TO aportaciones_referenciador;
ALTER INDEX aportaciones_descartado_legacy_inversion_id_key   RENAME TO aportaciones_legacy_inversion_id_key;
ALTER INDEX pagos_descartado_pkey                             RENAME TO pagos_pkey;

ALTER SEQUENCE personas_descartado_id_seq           RENAME TO personas_id_seq;
ALTER SEQUENCE persona_documentos_descartado_id_seq RENAME TO persona_documentos_id_seq;
ALTER SEQUENCE aportaciones_descartado_id_seq       RENAME TO aportaciones_id_seq;
ALTER SEQUENCE pagos_descartado_id_seq              RENAME TO pagos_id_seq;

COMMIT;
