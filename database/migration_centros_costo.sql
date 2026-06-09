-- ================================================================
-- MIGRACIÓN: Centros de Costo en módulo Egresos
-- Ejecutar UNA sola vez en Neon
-- ================================================================

-- 1. categorias_egresos: columna es_fijo derivada de tipo_frecuencia
ALTER TABLE categorias_egresos
  ADD COLUMN IF NOT EXISTS es_fijo BOOLEAN
    GENERATED ALWAYS AS (tipo_frecuencia = 'fijo') STORED;

-- Categorías base adicionales (idempotente)
INSERT INTO categorias_egresos (nombre, tipo_frecuencia) VALUES
  ('Luz',               'fijo'),
  ('Agua',              'fijo'),
  ('Internet',          'fijo'),
  ('Notaría',           'variable'),
  ('Avalúo',            'variable'),
  ('Rendimientos',      'variable'),
  ('Pago deuda banco',  'fijo')
ON CONFLICT (nombre) DO NOTHING;

-- 2. cuentas_por_pagar: columna centro_costo
ALTER TABLE cuentas_por_pagar
  ADD COLUMN IF NOT EXISTS centro_costo VARCHAR(20) NOT NULL DEFAULT 'Oficina'
    CHECK (centro_costo IN ('Oficina', 'Abril', 'Inversionistas', 'Bancos'));

CREATE INDEX IF NOT EXISTS idx_cpp_centro_costo
  ON cuentas_por_pagar (centro_costo);

CREATE INDEX IF NOT EXISTS idx_cpp_mes
  ON cuentas_por_pagar (fecha_limite_pago);
