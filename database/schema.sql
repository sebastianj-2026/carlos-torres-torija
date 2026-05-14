-- ================================================================
-- OFICINA TS — Sistema Financiero
-- Script de creación de base de datos
-- PostgreSQL / Supabase
-- ================================================================

-- Extensión para UUIDs (ya disponible en Supabase por defecto)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================================
-- TABLA: usuarios
-- Almacena los usuarios del sistema (se insertan directamente,
-- no existe pantalla de registro en la app)
-- ================================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_completo  VARCHAR(100) NOT NULL,
  correo           VARCHAR(100) UNIQUE NOT NULL,
  password_hash    VARCHAR(255) NOT NULL,
  rol              VARCHAR(20)  NOT NULL CHECK (rol IN ('administrador', 'oficinista')),
  activo           BOOLEAN      NOT NULL DEFAULT true,
  fecha_creacion   TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Índice para acelerar búsquedas por correo (login)
CREATE INDEX IF NOT EXISTS idx_usuarios_correo ON usuarios (correo);

-- ================================================================
-- TABLA: bitacora_accesos
-- Registra cada login y logout del sistema
-- ================================================================
CREATE TABLE IF NOT EXISTS bitacora_accesos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  UUID        REFERENCES usuarios(id) ON DELETE SET NULL,
  accion      VARCHAR(50) NOT NULL,   -- 'LOGIN' | 'LOGOUT'
  ip_address  VARCHAR(45),            -- soporta IPv4 e IPv6
  fecha_hora  TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- Índice para consultas de bitácora por usuario
CREATE INDEX IF NOT EXISTS idx_bitacora_usuario ON bitacora_accesos (usuario_id);
CREATE INDEX IF NOT EXISTS idx_bitacora_fecha   ON bitacora_accesos (fecha_hora DESC);

-- ================================================================
-- USUARIOS INICIALES
-- IMPORTANTE: reemplazar HASH_AQUI con los hashes generados por
-- el script scripts/generate-passwords.js antes de ejecutar
-- ================================================================

-- Administrador 1 — Sebastian
INSERT INTO usuarios (nombre_completo, correo, password_hash, rol)
VALUES (
  'Sebastian',
  'sebastianjat49@gmail.com',
  'HASH_AQUI',
  'administrador'
)
ON CONFLICT (correo) DO NOTHING;

-- Administrador 2 — Abril
INSERT INTO usuarios (nombre_completo, correo, password_hash, rol)
VALUES (
  'Abril',
  'abriltorres441@gmail.com',
  'HASH_AQUI',
  'administrador'
)
ON CONFLICT (correo) DO NOTHING;

-- Oficinista 1 — Lorena
INSERT INTO usuarios (nombre_completo, correo, password_hash, rol)
VALUES (
  'Lorena',
  'torres_simoni@hotmail.com',
  'HASH_AQUI',
  'oficinista'
)
ON CONFLICT (correo) DO NOTHING;

-- Oficinista 2 — Marvin (actualizar correo cuando esté disponible)
INSERT INTO usuarios (nombre_completo, correo, password_hash, rol)
VALUES (
  'Marvin',
  'correo_pendiente@gmail.com',
  'HASH_AQUI',
  'oficinista'
)
ON CONFLICT (correo) DO NOTHING;
