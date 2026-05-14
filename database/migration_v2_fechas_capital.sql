-- ================================================================
-- MIGRACIÓN v2: fechas, comision_gestion_pct, archivos binarios
-- Aplica sobre BD existente en Neon — ejecutar UNA sola vez
-- ================================================================

-- 1. Ampliar constraint de estatus para incluir 'documentos_incompletos'
ALTER TABLE prestamos DROP CONSTRAINT IF EXISTS prestamos_estatus_check;
ALTER TABLE prestamos
  ADD CONSTRAINT prestamos_estatus_check CHECK (estatus IN (
    'activo', 'atrasado', 'en_juicio', 'liquidado', 'cancelado', 'documentos_incompletos'
  ));

-- Cambiar DEFAULT a documentos_incompletos (préstamos nuevos sin documentos)
ALTER TABLE prestamos ALTER COLUMN estatus SET DEFAULT 'documentos_incompletos';

-- 2. Columna de comisión de gestión sobre inversionistas
ALTER TABLE prestamos
  ADD COLUMN IF NOT EXISTS comision_gestion_pct NUMERIC(5,2) DEFAULT 0;

-- 3. Tabla de archivos binarios PDF (BYTEA) — idempotente
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

CREATE INDEX IF NOT EXISTS idx_archivos_prestamo ON archivos_prestamo(prestamo_id);

-- 4. Tabla de participantes — idempotente
CREATE TABLE IF NOT EXISTS participantes_prestamo (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  prestamo_id       UUID          NOT NULL REFERENCES prestamos(id) ON DELETE CASCADE,
  inversionista_id  UUID          REFERENCES inversionistas(id),
  es_oficina        BOOLEAN       NOT NULL DEFAULT false,
  monto_aportado    NUMERIC(12,2) NOT NULL,
  tasa_rendimiento  NUMERIC(5,2)  NOT NULL DEFAULT 0,
  interes_mensual   NUMERIC(12,2),
  registrado_por    UUID          REFERENCES usuarios(id),
  fecha_registro    TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_participantes_prestamo ON participantes_prestamo(prestamo_id);

-- 5. Registrar Oficina TS en préstamos existentes sin participante de oficina
INSERT INTO participantes_prestamo
  (prestamo_id, inversionista_id, es_oficina, monto_aportado, tasa_rendimiento)
SELECT
  p.id,
  NULL,
  true,
  p.monto_prestado,
  p.tasa_interes_mensual
FROM prestamos p
WHERE NOT EXISTS (
  SELECT 1 FROM participantes_prestamo pp
  WHERE pp.prestamo_id = p.id AND pp.es_oficina = true
)
ON CONFLICT DO NOTHING;
