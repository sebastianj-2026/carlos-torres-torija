-- ============================================================================
-- migration_tasa_referenciador_escala.up.sql
-- M11 · Unifica la escala de inversiones.tasa_referenciador.
-- NUMERIC(6,4) (0.0050 = 0.5%)  ->  NUMERIC(5,2) (0.50 = 0.5%), valores * 100.
-- Tras esto TODO el sistema usa % con 2 decimales: monto = base * tasa / 100.
-- Respaldo: los valores no nulos se copian a `_respaldo_tasa_referenciador`
-- antes de convertir, para verificar fila por fila y para la reversa.
-- Idempotente: solo convierte si la escala sigue en (6,4).
-- Aplicación a Neon: node scripts/apply-migration.js <archivo>.
-- ============================================================================

BEGIN;

DO $$
BEGIN
  -- Solo actúa si la columna todavía está en la escala vieja NUMERIC(6,4).
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'inversiones'
       AND column_name = 'tasa_referenciador'
       AND numeric_scale = 4
  ) THEN

    -- Respaldo del valor original antes de convertir (P: nada se convierte sin reversa).
    CREATE TABLE IF NOT EXISTS _respaldo_tasa_referenciador (
      inversion_id        UUID PRIMARY KEY,
      tasa_referenciador  NUMERIC(6,4)
    );

    INSERT INTO _respaldo_tasa_referenciador (inversion_id, tasa_referenciador)
    SELECT id, tasa_referenciador
      FROM inversiones
     WHERE tasa_referenciador IS NOT NULL
    ON CONFLICT (inversion_id) DO NOTHING;

    -- Conversión de escala: 0.0050 -> 0.50. El CHECK inv_tasa_ref_coherente
    -- solo mira NULL/NOT NULL, no la escala; el cambio de tipo no lo rompe.
    ALTER TABLE inversiones
      ALTER COLUMN tasa_referenciador TYPE NUMERIC(5,2)
      USING (tasa_referenciador * 100);

  END IF;
END $$;

COMMIT;
