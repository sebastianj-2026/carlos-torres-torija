-- Reversa. Quita constraints, índice y columnas del referidor.
BEGIN;
ALTER TABLE inversiones DROP CONSTRAINT IF EXISTS inv_tasa_ref_coherente;
ALTER TABLE inversiones DROP CONSTRAINT IF EXISTS inv_no_auto_referencia;
DROP INDEX IF EXISTS inversiones_referenciador;
ALTER TABLE inversiones DROP COLUMN IF EXISTS tasa_referenciador;
ALTER TABLE inversiones DROP COLUMN IF EXISTS referenciador_id;
COMMIT;
