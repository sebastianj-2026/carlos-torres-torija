-- ================================================================
-- MIGRACIÓN: dia_pago_pactado en inversionistas
-- Ejecutar UNA sola vez en Neon
-- ================================================================

-- Campo de día pactado para generación de rendimientos mensuales.
-- Se usa como fallback cuando la inversión individual no tiene dia_pago.
ALTER TABLE inversionistas
  ADD COLUMN IF NOT EXISTS dia_pago_pactado INTEGER DEFAULT 30
    CHECK (dia_pago_pactado BETWEEN 1 AND 31);

-- Sincronizar registros existentes desde inversiones.dia_pago (primera inversión activa)
UPDATE inversionistas i
SET dia_pago_pactado = sub.dia_pago
FROM (
  SELECT DISTINCT ON (inversionista_id) inversionista_id, dia_pago
  FROM inversiones
  WHERE dia_pago IS NOT NULL AND estatus = 'activo'
  ORDER BY inversionista_id, fecha_registro ASC
) sub
WHERE sub.inversionista_id = i.id
  AND i.dia_pago_pactado IS NULL;
