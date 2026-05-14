-- ================================================================
-- MIGRACIÓN: Renta Externa
-- Ejecutar en Neon UNA sola vez.
-- ================================================================

-- 1. Columnas en inmuebles (propietario externo)
ALTER TABLE inmuebles
  ADD COLUMN IF NOT EXISTS es_renta_externa   BOOLEAN      NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS propietario_nombre VARCHAR(200);

-- 2. Comisión + local en el contrato
ALTER TABLE contratos_arrendamiento
  ADD COLUMN IF NOT EXISTS comision_oficina_pct NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS num_local            SMALLINT;

-- 3. Inmuebles tipo plaza (múltiples locales)
ALTER TABLE inmuebles
  ADD COLUMN IF NOT EXISTS total_locales SMALLINT;

-- 4. Categoría de egreso para pagos a propietarios externos
INSERT INTO categorias_egresos (nombre, tipo_frecuencia)
VALUES ('Renta Externa', 'fijo')
ON CONFLICT (nombre) DO NOTHING;
