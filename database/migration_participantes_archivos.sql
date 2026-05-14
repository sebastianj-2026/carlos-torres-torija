-- ================================================================
-- MIGRACIÓN: Participantes y archivos binarios
-- Aplica en base de datos existente (Neon / PostgreSQL)
-- Ejecutar UNA sola vez
-- ================================================================

-- ----------------------------------------------------------------
-- 1. Nuevas columnas en la tabla prestamos
-- ----------------------------------------------------------------
ALTER TABLE prestamos
  ADD COLUMN IF NOT EXISTS tipo_garantia         VARCHAR(20)   DEFAULT 'hipotecaria'
    CHECK (tipo_garantia IN ('hipotecaria','aval','pagare','otra')),
  ADD COLUMN IF NOT EXISTS cantidad_entregada    NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS apertura              NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avaluo                NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gastos_notariales     NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS descripcion_garantia  TEXT,
  ADD COLUMN IF NOT EXISTS url_evidencia_garantia TEXT;

-- ----------------------------------------------------------------
-- 2. Tabla de participantes del préstamo
--    (sustituye la relación directa con inversionista_id)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS participantes_prestamo (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  prestamo_id       UUID        NOT NULL REFERENCES prestamos(id) ON DELETE CASCADE,

  -- NULL cuando es la propia oficina (es_oficina = true)
  inversionista_id  UUID        REFERENCES inversionistas(id),

  es_oficina        BOOLEAN     NOT NULL DEFAULT false,

  monto_aportado    NUMERIC(12,2) NOT NULL,
  tasa_rendimiento  NUMERIC(5,2)  NOT NULL DEFAULT 0,
  interes_mensual   NUMERIC(12,2),

  registrado_por    UUID        REFERENCES usuarios(id),
  fecha_registro    TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_participantes_prestamo
  ON participantes_prestamo(prestamo_id);

-- ----------------------------------------------------------------
-- 3. Tabla de archivos binarios PDF (BYTEA)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS archivos_prestamo (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  prestamo_id      UUID         NOT NULL REFERENCES prestamos(id) ON DELETE CASCADE,

  tipo             VARCHAR(30)  NOT NULL CHECK (tipo IN (
    'avaluo', 'gastos_notariales', 'escritura', 'contrato_firmado'
  )),

  nombre_original  VARCHAR(255),
  mime_type        VARCHAR(100) DEFAULT 'application/pdf',
  contenido        BYTEA        NOT NULL,
  tamano_bytes     INTEGER,

  registrado_por   UUID         REFERENCES usuarios(id),
  fecha_registro   TIMESTAMP    NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_archivo_prestamo_tipo UNIQUE (prestamo_id, tipo)
);

CREATE INDEX IF NOT EXISTS idx_archivos_prestamo
  ON archivos_prestamo(prestamo_id);

-- ----------------------------------------------------------------
-- 4. Migrar inversionista_id existente → participantes_prestamo
--    Solo para préstamos que ya tenían inversionista asignado
-- ----------------------------------------------------------------
INSERT INTO participantes_prestamo
  (prestamo_id, inversionista_id, es_oficina, monto_aportado, tasa_rendimiento)
SELECT
  p.id,
  p.inversionista_id,
  false,
  p.monto_prestado,
  p.tasa_interes_mensual
FROM prestamos p
WHERE p.inversionista_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------
-- 5. Registrar la oficina como participante en préstamos sin
--    inversionistas migrados (o como co-participante si los hay)
--    NOTA: solo si NO existe ya un participante de oficina
-- ----------------------------------------------------------------
INSERT INTO participantes_prestamo
  (prestamo_id, inversionista_id, es_oficina, monto_aportado, tasa_rendimiento)
SELECT
  p.id,
  NULL,
  true,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM participantes_prestamo pp
      WHERE pp.prestamo_id = p.id AND pp.es_oficina = false
    ) THEN 0
    ELSE p.monto_prestado
  END,
  p.tasa_interes_mensual
FROM prestamos p
WHERE NOT EXISTS (
  SELECT 1 FROM participantes_prestamo pp
  WHERE pp.prestamo_id = p.id AND pp.es_oficina = true
)
ON CONFLICT DO NOTHING;
