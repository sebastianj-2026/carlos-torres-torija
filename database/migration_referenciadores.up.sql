-- ============================================================================
-- migration_referenciadores.up.sql
-- M1 · Tabla `referenciadores`: la persona que trae inversiones o préstamos.
-- Puede o no ser inversionista (inversionista_id nullable = forma 3, sin capital).
-- Idempotente. Aplicación a Neon: node scripts/apply-migration.js <archivo>.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS referenciadores (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Datos personales
  nombres             VARCHAR(100) NOT NULL,
  apellido_paterno    VARCHAR(100) NOT NULL,
  apellido_materno    VARCHAR(100),
  telefono            VARCHAR(15),
  correo              VARCHAR(100),
  direccion           TEXT,
  url_ine             TEXT,

  -- M4: datos bancarios para tener a la mano al pagar. NO obligatorios.
  numero_cuenta       VARCHAR(30),
  banco               VARCHAR(60),

  -- Si esta persona además aportó capital, aquí queda ligada su fila de
  -- inversionista. NULL = solo referenciador (forma 3). Nunca se muda de tabla.
  inversionista_id    UUID REFERENCES inversionistas(id),

  -- Baja por bandera, nunca DELETE (P6)
  activo              BOOLEAN NOT NULL DEFAULT TRUE,

  -- Control
  registrado_por      UUID REFERENCES usuarios(id),
  fecha_registro      TIMESTAMP DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referenciadores_nombre
  ON referenciadores (apellido_paterno, nombres);

CREATE INDEX IF NOT EXISTS idx_referenciadores_inversionista
  ON referenciadores (inversionista_id) WHERE inversionista_id IS NOT NULL;

COMMIT;
