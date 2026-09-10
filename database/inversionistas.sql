-- ================================================================
-- OFICINA TS — Módulo de Inversionistas
-- Tablas: inversionistas, inversiones, historial_inversiones
-- ================================================================

-- Tabla principal de inversionistas
CREATE TABLE inversionistas (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Datos personales
  nombres             VARCHAR(100) NOT NULL,
  apellido_paterno    VARCHAR(100) NOT NULL,
  apellido_materno    VARCHAR(100),
  telefono            VARCHAR(15),
  correo              VARCHAR(100),

  -- Documento de identidad (URL opcional, subida de archivo posterior)
  url_ine             TEXT,

  -- Control
  registrado_por      UUID REFERENCES usuarios(id),
  fecha_registro      TIMESTAMP DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP DEFAULT NOW()
);

-- Índice para búsqueda rápida por nombre
CREATE INDEX idx_inversionistas_nombre
  ON inversionistas (apellido_paterno, nombres);


-- ----------------------------------------------------------------
-- Inversiones: un inversionista puede tener varias
-- ----------------------------------------------------------------
CREATE TABLE inversiones (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inversionista_id       UUID NOT NULL REFERENCES inversionistas(id) ON DELETE CASCADE,

  -- Capital
  monto_inicial          NUMERIC(12,2) NOT NULL,
  monto_actual           NUMERIC(12,2) NOT NULL,

  -- Condiciones pactadas
  tasa_interes_mensual   NUMERIC(5,2)  NOT NULL,
  dia_pago               INTEGER       CHECK (dia_pago BETWEEN 1 AND 31),

  -- Forma en que ingresó el dinero
  forma_ingreso          VARCHAR(20)   CHECK (forma_ingreso IN ('efectivo', 'deposito')),
  cuenta_deposito        VARCHAR(100),   -- número de cuenta si fue por depósito

  -- Pagaré
  tiene_pagare           BOOLEAN       DEFAULT false,
  url_pagare             TEXT,           -- URL del PDF/imagen (subida posterior)

  -- Estatus de la inversión
  estatus                VARCHAR(20)   DEFAULT 'activo'
                         CHECK (estatus IN ('activo', 'pausado', 'liquidado', 'vencido')),

  -- Fechas
  fecha_inicio           DATE          NOT NULL,
  fecha_vencimiento      DATE,

  -- Observaciones internas
  notas                  TEXT,

  -- Control
  registrado_por         UUID REFERENCES usuarios(id),
  fecha_registro         TIMESTAMP DEFAULT NOW(),
  fecha_actualizacion    TIMESTAMP DEFAULT NOW()
);

-- Índice para consultar todas las inversiones de un inversionista
CREATE INDEX idx_inversiones_inversionista
  ON inversiones (inversionista_id);


-- ----------------------------------------------------------------
-- Historial de movimientos por inversión
-- Registra pagos de interés, aportes y retiros de capital
-- ----------------------------------------------------------------
CREATE TABLE historial_inversiones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inversion_id    UUID NOT NULL REFERENCES inversiones(id) ON DELETE CASCADE,

  -- Tipo de movimiento
  tipo            VARCHAR(30) NOT NULL
                  CHECK (tipo IN ('pago_interes', 'aporte_capital', 'retiro_capital')),

  monto           NUMERIC(12,2) NOT NULL,

  -- Forma de pago / recepción
  forma_pago      VARCHAR(20) CHECK (forma_pago IN ('efectivo', 'deposito')),

  -- Periodo que cubre (relevante para pagos de interés)
  periodo_mes     INTEGER,
  periodo_anio    INTEGER,

  -- Notas y evidencia
  notas           TEXT,
  url_evidencia   TEXT,           -- comprobante de pago (subida posterior)

  -- Control
  registrado_por  UUID REFERENCES usuarios(id),
  fecha_movimiento TIMESTAMP DEFAULT NOW()
);

-- Índice para consultar el historial de una inversión específica
CREATE INDEX idx_historial_inversion
  ON historial_inversiones (inversion_id, fecha_movimiento DESC);
