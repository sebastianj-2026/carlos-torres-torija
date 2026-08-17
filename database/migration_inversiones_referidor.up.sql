-- ============================================================================
-- migration_inversiones_referidor.up.sql
-- Referidor sobre la inversión legacy: quién trajo al inversionista y a qué %.
-- El referidor es otro inversionista (UUID). Idempotente.
-- Aplicación a Neon: via scripts/apply-migration.js.
-- ============================================================================

BEGIN;

ALTER TABLE inversiones ADD COLUMN IF NOT EXISTS referenciador_id   UUID REFERENCES inversionistas(id);
ALTER TABLE inversiones ADD COLUMN IF NOT EXISTS tasa_referenciador NUMERIC(6,4);

-- Nadie se refiere a sí mismo.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inv_no_auto_referencia') THEN
    ALTER TABLE inversiones ADD CONSTRAINT inv_no_auto_referencia
      CHECK (referenciador_id IS DISTINCT FROM inversionista_id);
  END IF;
END $$;

-- Si hay referidor, hay tasa (y viceversa).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inv_tasa_ref_coherente') THEN
    ALTER TABLE inversiones ADD CONSTRAINT inv_tasa_ref_coherente CHECK (
      (referenciador_id IS NULL AND tasa_referenciador IS NULL) OR
      (referenciador_id IS NOT NULL AND tasa_referenciador IS NOT NULL)
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS inversiones_referenciador
  ON inversiones (referenciador_id) WHERE referenciador_id IS NOT NULL;

COMMIT;
