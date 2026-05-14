-- ================================================================
-- MIGRACIÓN: Módulo de Tesorería y Gestión de Efectivo
-- Ejecutar UNA sola vez en Neon
-- ================================================================

-- Cuentas bancarias (operan exclusivamente en MXN)
CREATE TABLE IF NOT EXISTS cuentas_bancarias (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  alias               VARCHAR(100)  NOT NULL,
  titular             VARCHAR(200)  NOT NULL,
  banco               VARCHAR(100)  NOT NULL,
  clabe               VARCHAR(18),
  numero_cuenta       VARCHAR(30),
  saldo_inicial       DECIMAL(14,2) NOT NULL DEFAULT 0,
  saldo_actual        DECIMAL(14,2) NOT NULL DEFAULT 0,
  activa              BOOLEAN       NOT NULL DEFAULT true,
  notas               TEXT,
  registrado_por      TEXT,
  fecha_registro      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  fecha_actualizacion TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Categorías dinámicas para movimientos de caja chica
CREATE TABLE IF NOT EXISTS categorias_movimiento (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre         VARCHAR(100) NOT NULL UNIQUE,
  tipo           VARCHAR(10)  NOT NULL DEFAULT 'ambos'
                   CHECK (tipo IN ('entrada', 'salida', 'ambos')),
  activa         BOOLEAN      NOT NULL DEFAULT true,
  registrado_por TEXT,
  fecha_registro TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Seed de categorías por defecto
INSERT INTO categorias_movimiento (nombre, tipo) VALUES
  ('Papelería y útiles',              'salida'),
  ('Servicios (agua, luz, internet)', 'salida'),
  ('Mensajería y transporte',         'salida'),
  ('Honorarios',                      'salida'),
  ('Reposición de caja',              'entrada'),
  ('Varios',                          'ambos')
ON CONFLICT (nombre) DO NOTHING;

-- Movimientos de caja chica (entradas y salidas de efectivo)
CREATE TABLE IF NOT EXISTS movimientos_caja (
  id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo               VARCHAR(10)   NOT NULL CHECK (tipo IN ('entrada', 'salida')),
  concepto           VARCHAR(300)  NOT NULL,
  monto              DECIMAL(14,2) NOT NULL CHECK (monto > 0),
  fecha              DATE          NOT NULL DEFAULT CURRENT_DATE,
  encargado          VARCHAR(200)  NOT NULL,
  categoria_id       UUID          REFERENCES categorias_movimiento(id),
  voucher_nombre     VARCHAR(255),
  voucher_mime       VARCHAR(100),
  voucher_contenido  BYTEA,
  voucher_tamano     INTEGER,
  notas              TEXT,
  registrado_por     TEXT,
  fecha_registro     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Traspasos entre cuentas bancarias y/o caja chica
-- cuenta_origen_id  = NULL → el origen  es caja chica
-- cuenta_destino_id = NULL → el destino es caja chica
CREATE TABLE IF NOT EXISTS traspasos (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  cuenta_origen_id    UUID          REFERENCES cuentas_bancarias(id),
  cuenta_destino_id   UUID          REFERENCES cuentas_bancarias(id),
  monto               DECIMAL(14,2) NOT NULL CHECK (monto > 0),
  concepto            VARCHAR(300),
  fecha               DATE          NOT NULL DEFAULT CURRENT_DATE,
  voucher_nombre      VARCHAR(255),
  voucher_mime        VARCHAR(100),
  voucher_contenido   BYTEA,
  voucher_tamano      INTEGER,
  registrado_por      TEXT,
  fecha_registro      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Log de auditoría automático (aplica a todos los módulos)
CREATE TABLE IF NOT EXISTS logs_auditoria (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo         VARCHAR(50) NOT NULL,
  tabla          VARCHAR(60) NOT NULL,
  registro_id    TEXT,
  accion         VARCHAR(30) NOT NULL,
  detalle        JSONB,
  usuario_id     TEXT,
  usuario_nombre TEXT,
  usuario_correo TEXT,
  fecha_registro TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_modulo       ON logs_auditoria(modulo);
CREATE INDEX IF NOT EXISTS idx_logs_fecha        ON logs_auditoria(fecha_registro DESC);
CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON movimientos_caja(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_traspasos_fecha   ON traspasos(fecha DESC);
