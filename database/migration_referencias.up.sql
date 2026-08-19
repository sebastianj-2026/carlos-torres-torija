-- ============================================================================
-- migration_referencias.up.sql
-- M2 · Tabla `referencias`: qué trajo cada referenciador (inversión o préstamo).
-- Reemplaza a inversiones.referenciador_id, que se DEPRECA (no se borra aún).
-- Depende de M1 (referenciadores). Idempotente.
-- Aplicación a Neon: node scripts/apply-migration.js <archivo>.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS referencias (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referenciador_id  UUID NOT NULL REFERENCES referenciadores(id),

  -- Unifica los dos tipos de referido en una sola tabla
  tipo_referido     VARCHAR(20) NOT NULL
                    CHECK (tipo_referido IN ('inversion', 'prestamo')),
  inversion_id      UUID REFERENCES inversiones(id),
  prestamo_id       UUID REFERENCES prestamos(id),

  -- Tasa mensual en PORCENTAJE, 2 decimales: 0.50 = 0.5%
  -- Misma escala que inversiones.tasa_interes_mensual (unificación en M11).
  tasa              NUMERIC(5,2) NOT NULL CHECK (tasa > 0),

  -- R9: la referencia vive lo que vive el contrato
  estado            VARCHAR(20) NOT NULL DEFAULT 'activa'
                    CHECK (estado IN ('activa', 'terminada', 'cancelada')),
  fecha_inicio      DATE NOT NULL,
  fecha_fin         DATE,

  notas             TEXT,
  registrado_por    UUID REFERENCES usuarios(id),
  fecha_registro    TIMESTAMP DEFAULT NOW(),

  -- Exactamente uno de los dos orígenes, según el tipo
  CONSTRAINT ref_origen_coherente CHECK (
    (tipo_referido = 'inversion' AND inversion_id IS NOT NULL AND prestamo_id IS NULL) OR
    (tipo_referido = 'prestamo'  AND prestamo_id IS NOT NULL AND inversion_id IS NULL)
  ),
  -- P7: un solo nivel. Una inversión o un préstamo tiene UN referenciador.
  CONSTRAINT ref_unica_inversion UNIQUE (inversion_id),
  CONSTRAINT ref_unica_prestamo  UNIQUE (prestamo_id)
);

CREATE INDEX IF NOT EXISTS idx_referencias_referenciador
  ON referencias (referenciador_id) WHERE estado = 'activa';

-- La columna vieja se DEPRECA, no se borra: se elimina cuando el código ya no
-- la lea. Apunta a inversionistas(id); referencias.referenciador_id apunta a
-- referenciadores(id). El puente entre ambas no está definido (ver guarda).
COMMENT ON COLUMN inversiones.referenciador_id IS
  'DEPRECATED (M2): usar tabla referencias. No leer en código nuevo. Se elimina cuando nada la lea.';

-- Copia de datos vivos. HOY hay 0 filas con referenciador_id (verificado contra
-- Neon), así que no hay nada que migrar. NO se escribe el INSERT porque el
-- copiado real exige dos decisiones aún sin especificar:
--   (a) puente inversionista(id) -> referenciadores(id) por cada referidor;
--   (b) escala de tasa_referenciador NUMERIC(6,4) -> tasa NUMERIC(5,2) (M11).
-- Guarda: si algún día hay filas al aplicar esto, falla en vez de perderlas.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM inversiones WHERE referenciador_id IS NOT NULL;
  IF n > 0 THEN
    RAISE EXCEPTION
      'M2: % inversiones con referenciador_id. El copiado a referencias no está definido (puente inversionista->referenciador + escala de tasa). Resolver antes de aplicar.', n;
  END IF;
END $$;

COMMIT;
