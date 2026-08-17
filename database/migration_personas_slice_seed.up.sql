-- ============================================================================
-- migration_personas_slice_seed.up.sql   ·   P-002
-- Backfill del slice `personas` desde el legacy de inversionistas.
--   inversionistas → personas        (una persona por inversionista)
--   inversiones    → aportaciones     (una aportación por inversión)
--
-- Requiere P-001 aplicada. Idempotente por las columnas legacy_* (UNIQUE +
-- ON CONFLICT DO NOTHING): correr dos veces no duplica.
-- NO toca ni borra el legacy. El referenciador queda NULL (se captura por UI).
-- Aplicación a Neon: MANUAL (ver pasos al pie).
--
-- Mapeos:
--   personas.telefono      ← COALESCE(inversionistas.telefono, 'SIN-TELEFONO')
--                            (personas.telefono es NOT NULL; el legacy lo permite nulo)
--   aportaciones.monto      ← inversiones.monto_inicial  (la aportación original,
--                            siempre > 0; monto_actual puede ser 0 en liquidadas)
--   aportaciones.tasa_inversionista ← tasa_interes_mensual / 100
--                            (legacy guarda 2.00 = 2% ; el slice usa 0.0200)
--   aportaciones.estado     ← activo→activa · liquidado→liquidada · resto→archivada
-- ============================================================================

BEGIN;

-- 1. Personas desde inversionistas.
INSERT INTO personas (nombre, apellido_paterno, apellido_materno, telefono, correo, legacy_inversionista_id)
SELECT
  i.nombres,
  i.apellido_paterno,
  i.apellido_materno,
  COALESCE(i.telefono, 'SIN-TELEFONO'),
  i.correo,
  i.id
FROM inversionistas i
ON CONFLICT (legacy_inversionista_id) DO NOTHING;

-- 2. Aportaciones desde inversiones, ligadas por el UUID legacy.
INSERT INTO aportaciones (
  inversionista_id, monto, fecha, tasa_inversionista,
  referenciador_id, tasa_referenciador, contrato_id, estado, legacy_inversion_id
)
SELECT
  p.id,
  inv.monto_inicial,
  inv.fecha_inicio,
  ROUND(inv.tasa_interes_mensual / 100.0, 4),
  NULL,                       -- referenciador desconocido → se captura por UI (P-004)
  NULL,
  NULL,                       -- contrato_id: sin cruce con préstamos en el slice
  CASE inv.estatus
    WHEN 'activo'    THEN 'activa'
    WHEN 'liquidado' THEN 'liquidada'
    ELSE 'archivada'          -- pausado, vencido
  END,
  inv.id
FROM inversiones inv
JOIN personas p ON p.legacy_inversionista_id = inv.inversionista_id
ON CONFLICT (legacy_inversion_id) DO NOTHING;

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────
-- Conteo de verificación (correr aparte tras aplicar):
--   SELECT
--     (SELECT count(*) FROM inversionistas) AS legacy_inversionistas,
--     (SELECT count(*) FROM personas WHERE legacy_inversionista_id IS NOT NULL) AS personas_sembradas,
--     (SELECT count(*) FROM inversiones) AS legacy_inversiones,
--     (SELECT count(*) FROM aportaciones WHERE legacy_inversion_id IS NOT NULL) AS aportaciones_sembradas;
--   -- personas_sembradas debe igualar legacy_inversionistas (salvo colisiones de
--   -- identidad nombre+telefono, que fallarían el INSERT y hay que dedupear a mano).
--
-- Aplicación MANUAL a Neon:
--   psql "$DATABASE_URL" -f database/migration_personas_slice_seed.up.sql
-- Reversa:
--   psql "$DATABASE_URL" -f database/migration_personas_slice_seed.down.sql
-- ─────────────────────────────────────────────────────────────────────────
