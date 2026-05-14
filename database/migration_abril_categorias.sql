-- ================================================================
-- MIGRACIÓN: Categorías específicas para Gastos Abril
-- Ejecutar UNA sola vez en Neon
-- ================================================================

INSERT INTO categorias_egresos (nombre, tipo_frecuencia, color)
VALUES
  ('Coco',     'variable', '#10b981'),
  ('Tarjetas', 'fijo',     '#ef4444'),
  ('Casa',     'fijo',     '#f59e0b'),
  ('Fabricio', 'variable', '#6366f1'),
  ('Abril',    'variable', '#94a3b8')
ON CONFLICT (nombre) DO NOTHING;
