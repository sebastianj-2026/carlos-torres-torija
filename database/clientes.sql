-- ================================================================
-- OFICINA TS — Sistema Financiero
-- Módulo 2: Clientes
-- Migración: tablas clientes, documentos_cliente, referencias_cliente
-- ================================================================

-- ================================================================
-- TABLA: clientes
-- Expediente completo de persona física
-- ================================================================
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Datos personales
  nombres               VARCHAR(100) NOT NULL,
  apellido_paterno      VARCHAR(100) NOT NULL,
  apellido_materno      VARCHAR(100),
  fecha_nacimiento      DATE,
  rfc                   VARCHAR(13),
  curp                  VARCHAR(18),
  telefono_celular      VARCHAR(15),
  telefono_adicional    VARCHAR(15),
  correo                VARCHAR(100),

  -- Domicilio
  calle                 VARCHAR(150),
  numero_exterior       VARCHAR(20),
  numero_interior       VARCHAR(20),
  colonia               VARCHAR(100),
  municipio             VARCHAR(100),
  estado                VARCHAR(100),
  codigo_postal         VARCHAR(10),

  -- Trabajo
  ocupacion             VARCHAR(100),
  nombre_trabajo        VARCHAR(150),
  telefono_trabajo      VARCHAR(15),

  -- Estatus del cliente
  estatus VARCHAR(20) NOT NULL DEFAULT 'activo'
    CHECK (estatus IN ('activo', 'atrasado', 'negociado', 'en_juicio', 'inactivo')),

  -- Ubicación física del expediente en el archivo
  ubicacion_expediente  TEXT,

  -- Control de registro
  registrado_por        UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  fecha_registro        TIMESTAMP NOT NULL DEFAULT NOW(),
  fecha_actualizacion   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_clientes_nombres
  ON clientes (apellido_paterno, apellido_materno, nombres);

CREATE INDEX IF NOT EXISTS idx_clientes_rfc
  ON clientes (rfc);

CREATE INDEX IF NOT EXISTS idx_clientes_curp
  ON clientes (curp);

CREATE INDEX IF NOT EXISTS idx_clientes_estatus
  ON clientes (estatus);

CREATE INDEX IF NOT EXISTS idx_clientes_telefono
  ON clientes (telefono_celular);

-- ================================================================
-- TABLA: documentos_cliente
-- Checklist de documentos por expediente
-- ================================================================
CREATE TABLE IF NOT EXISTS documentos_cliente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,

  -- Tipo de documento
  tipo VARCHAR(50) NOT NULL
    CHECK (tipo IN (
      'ine',
      'escritura',
      'r20',
      'recibo_luz',
      'constancia_no_adeudo',
      'predial',
      'curp',
      'rfc'
    )),

  -- Estado del documento
  entregado     BOOLEAN NOT NULL DEFAULT false,
  digitalizado  BOOLEAN NOT NULL DEFAULT false,
  url_archivo   TEXT,   -- URL del archivo digitalizado (opcional)

  -- Control
  registrado_por  UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  fecha_registro  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índice para consultas por cliente
CREATE INDEX IF NOT EXISTS idx_documentos_cliente_id
  ON documentos_cliente (cliente_id);

-- Restricción: un tipo de documento por cliente
CREATE UNIQUE INDEX IF NOT EXISTS idx_documentos_cliente_tipo
  ON documentos_cliente (cliente_id, tipo);

-- ================================================================
-- TABLA: referencias_cliente
-- Referencias personales del cliente
-- ================================================================
CREATE TABLE IF NOT EXISTS referencias_cliente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  cliente_id      UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  nombre_completo VARCHAR(200) NOT NULL,
  telefono        VARCHAR(15),
  relacion        VARCHAR(50)
    CHECK (relacion IN ('familiar', 'amigo', 'trabajo', 'otro')),

  -- Control
  registrado_por  UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  fecha_registro  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índice para consultas por cliente
CREATE INDEX IF NOT EXISTS idx_referencias_cliente_id
  ON referencias_cliente (cliente_id);
