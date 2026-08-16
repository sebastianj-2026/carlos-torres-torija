-- ============================================================================
-- migration_personas_slice.up.sql   ·   P-001
-- Slice mínimo del módulo `personas` para desbloquear `comisiones`.
-- Crea: personas, persona_documentos, aportaciones.
-- DIFIERE a propósito: persona_roles (roles simultáneos) y la fusión con
-- `clientes`/`inversionistas` legacy. Ver docs/modulos/personas/DATOS.md.
--
-- Idempotente (IF NOT EXISTS). Reversa: migration_personas_slice.down.sql.
-- Aplicación a Neon: MANUAL (el proyecto no tiene runner). Ver pasos al pie.
-- ============================================================================

BEGIN;

-- Persona única. P8: nunca DELETE, se archiva con `activo=false`.
CREATE TABLE IF NOT EXISTS personas (
  id               BIGSERIAL PRIMARY KEY,
  nombre           TEXT NOT NULL,
  apellido_paterno TEXT NOT NULL,
  apellido_materno TEXT,
  telefono         TEXT NOT NULL,
  correo           TEXT,
  direccion        TEXT,
  activo           BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en        TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Rastreo del backfill (P-002). NULL para personas creadas por UI.
  -- El legacy usa UUID; esto mapea UUID→BIGINT y hace el seed idempotente.
  legacy_inversionista_id UUID UNIQUE
);

-- P1: una persona por nombre completo + teléfono (solo entre activas).
CREATE UNIQUE INDEX IF NOT EXISTS personas_identidad
  ON personas (lower(nombre), lower(apellido_paterno), telefono)
  WHERE activo;

-- P3: documentos (INE, comprobantes). comisiones lo referencia para el
-- comprobante de pago (R19).
CREATE TABLE IF NOT EXISTS persona_documentos (
  id             BIGSERIAL PRIMARY KEY,
  persona_id     BIGINT NOT NULL REFERENCES personas(id),
  tipo           TEXT NOT NULL CHECK (tipo IN ('ine','comprobante_pago','otro')),
  nombre_archivo TEXT NOT NULL,
  mime           TEXT NOT NULL CHECK (mime = 'application/pdf'),
  bytes          INTEGER NOT NULL,
  storage_key    TEXT NOT NULL,
  subido_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- P4: aportaciones. P6: referenciador opcional POR APORTACIÓN.
-- Es la tabla que `comisiones` necesita (referenciador_id + tasas).
CREATE TABLE IF NOT EXISTS aportaciones (
  id                 BIGSERIAL PRIMARY KEY,
  inversionista_id   BIGINT NOT NULL REFERENCES personas(id),
  monto              NUMERIC(14,2) NOT NULL CHECK (monto > 0),
  fecha              DATE NOT NULL,
  referenciador_id   BIGINT NULL REFERENCES personas(id),   -- P6: nullable
  tasa_inversionista NUMERIC(6,4) NOT NULL,                 -- ej. 0.0200
  tasa_referenciador NUMERIC(6,4) NULL,                     -- ej. 0.0050
  contrato_id        BIGINT NULL,      -- R9: la comisión vive lo que vive el contrato
  estado             TEXT NOT NULL DEFAULT 'activa'
                     CHECK (estado IN ('activa','liquidada','archivada')),
  creado_en          TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Rastreo del backfill (P-002). NULL para aportaciones creadas por UI.
  legacy_inversion_id UUID UNIQUE,

  -- P7: nadie se refiere a sí mismo.
  CONSTRAINT no_auto_referencia CHECK (referenciador_id IS DISTINCT FROM inversionista_id),
  -- Si hay referenciador, tiene que haber tasa (y viceversa).
  CONSTRAINT tasa_ref_coherente CHECK (
    (referenciador_id IS NULL AND tasa_referenciador IS NULL) OR
    (referenciador_id IS NOT NULL AND tasa_referenciador IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS aportaciones_inversionista
  ON aportaciones (inversionista_id) WHERE estado = 'activa';
CREATE INDEX IF NOT EXISTS aportaciones_referenciador
  ON aportaciones (referenciador_id) WHERE referenciador_id IS NOT NULL;

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────
-- Aplicación MANUAL a Neon (no hay runner en el proyecto):
--   psql "$DATABASE_URL" -f database/migration_personas_slice.up.sql
-- Reversa:
--   psql "$DATABASE_URL" -f database/migration_personas_slice.down.sql
-- (usa la connection string de Neon del backend/.env)
-- ─────────────────────────────────────────────────────────────────────────
