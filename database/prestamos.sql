-- ================================================================
-- OFICINA TS — Módulo de Préstamos
-- Script SQL para PostgreSQL (Neon)
-- ================================================================

-- Tabla principal de préstamos
CREATE TABLE IF NOT EXISTS prestamos (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relaciones
  cliente_id              UUID REFERENCES clientes(id) NOT NULL,

  -- Identificación
  folio                   VARCHAR(20) UNIQUE,

  -- Tipo de garantía
  tipo_garantia           VARCHAR(20) DEFAULT 'hipotecaria' CHECK (tipo_garantia IN (
    'hipotecaria', 'aval', 'pagare', 'otra'
  )),

  -- Montos
  monto_prestado          NUMERIC(12,2) NOT NULL,
  saldo_pendiente         NUMERIC(12,2) NOT NULL,
  valor_propiedad         NUMERIC(12,2),

  -- Condiciones
  tasa_interes_mensual    NUMERIC(5,2) NOT NULL,
  tasa_moratoria_mensual  NUMERIC(5,2) DEFAULT 0,
  plazo_meses             INTEGER NOT NULL,

  -- Cálculos financieros de apertura
  interes_anticipado      NUMERIC(12,2),
  cantidad_entregada      NUMERIC(12,2),
  apertura                NUMERIC(12,2) DEFAULT 0,
  avaluo                  NUMERIC(12,2) DEFAULT 0,
  gastos_notariales       NUMERIC(12,2) DEFAULT 0,

  -- Fechas
  fecha_inicio            DATE NOT NULL,
  fecha_vencimiento       DATE NOT NULL,

  -- Notaría y contrato (solo garantía hipotecaria)
  notaria                 VARCHAR(200),
  url_contrato            TEXT,

  -- Garantía alternativa (aval, pagaré, otra)
  descripcion_garantia    TEXT,
  url_evidencia_garantia  TEXT,

  -- Estatus
  estatus                 VARCHAR(20) DEFAULT 'activo' CHECK (estatus IN (
    'activo', 'atrasado', 'en_juicio', 'liquidado', 'cancelado'
  )),

  -- Renovación
  renovado                BOOLEAN DEFAULT false,
  prestamo_anterior_id    UUID REFERENCES prestamos(id),
  url_contrato_renovacion TEXT,

  -- Notas
  notas                   TEXT,

  -- Control
  registrado_por          UUID REFERENCES usuarios(id),
  fecha_registro          TIMESTAMP DEFAULT NOW(),
  fecha_actualizacion     TIMESTAMP DEFAULT NOW()
);

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_prestamos_cliente    ON prestamos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_prestamos_estatus    ON prestamos(estatus);
CREATE INDEX IF NOT EXISTS idx_prestamos_folio      ON prestamos(folio);

-- ----------------------------------------------------------------
-- Documentos del expediente hipotecario
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documentos_prestamo (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestamo_id     UUID REFERENCES prestamos(id) ON DELETE CASCADE,

  tipo            VARCHAR(50) CHECK (tipo IN (
    'constancia_no_adeudo',
    'predial',
    'titulo_propiedad',
    'escrituras',
    'ine',
    'comprobante_domicilio',
    'curp',
    'constancia_fiscal',
    'acta_nacimiento',
    'acta_matrimonio',
    'contrato'
  )),

  entregado       BOOLEAN DEFAULT false,
  digitalizado    BOOLEAN DEFAULT false,
  url_archivo     TEXT,

  registrado_por  UUID REFERENCES usuarios(id),
  fecha_registro  TIMESTAMP DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- Historial de pagos del préstamo
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS historial_pagos_prestamo (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestamo_id         UUID REFERENCES prestamos(id) ON DELETE CASCADE,

  tipo_pago           VARCHAR(30) CHECK (tipo_pago IN (
    'interes',
    'capital',
    'moratorio',
    'interes_anticipado'
  )),

  monto               NUMERIC(12,2) NOT NULL,
  moratorio_perdonado NUMERIC(12,2) DEFAULT 0,

  forma_pago          VARCHAR(20) CHECK (forma_pago IN (
    'efectivo', 'deposito', 'transferencia'
  )),

  -- Periodo que cubre el pago
  periodo_mes         INTEGER,
  periodo_anio        INTEGER,

  -- Evidencia
  notas               TEXT,
  url_evidencia       TEXT,

  -- Control
  registrado_por      UUID REFERENCES usuarios(id),
  perdonado_por       UUID REFERENCES usuarios(id),
  fecha_pago          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pagos_prestamo ON historial_pagos_prestamo(prestamo_id);

-- ----------------------------------------------------------------
-- Moratorios calculados por mes de atraso
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS moratorios_prestamo (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestamo_id      UUID REFERENCES prestamos(id) ON DELETE CASCADE,

  monto_calculado  NUMERIC(12,2) NOT NULL,
  monto_perdonado  NUMERIC(12,2) DEFAULT 0,
  monto_cobrado    NUMERIC(12,2) DEFAULT 0,

  mes_atraso       INTEGER,
  anio_atraso      INTEGER,

  perdonado        BOOLEAN DEFAULT false,
  perdonado_por    UUID REFERENCES usuarios(id),
  fecha_perdon     TIMESTAMP,

  fecha_calculo    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_moratorios_prestamo ON moratorios_prestamo(prestamo_id);

-- Restricción única para el upsert de documentos
ALTER TABLE documentos_prestamo
  ADD CONSTRAINT uq_documento_prestamo_tipo UNIQUE (prestamo_id, tipo);

-- ----------------------------------------------------------------
-- Participantes del préstamo (inversionistas + Oficina TS)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS participantes_prestamo (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  prestamo_id       UUID        NOT NULL REFERENCES prestamos(id) ON DELETE CASCADE,
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
-- Archivos binarios PDF del expediente hipotecario
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
