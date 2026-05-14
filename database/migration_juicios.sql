-- ================================================================
-- MIGRACIÓN: Módulo de Juicios (Recuperación Legal)
-- Ejecutar UNA sola vez en Neon
-- ================================================================

CREATE TABLE IF NOT EXISTS juicios (
  id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  prestamo_id               UUID          NOT NULL UNIQUE REFERENCES prestamos(id) ON DELETE CASCADE,
  cliente_id                UUID          NOT NULL REFERENCES clientes(id),
  abogado_nombre            VARCHAR(200),
  abogado_telefono          VARCHAR(50),
  abogado_email             VARCHAR(200),
  fecha_asignacion_abogado  DATE,
  fecha_inicio              DATE          NOT NULL DEFAULT CURRENT_DATE,
  etapa_procesal            VARCHAR(20)   NOT NULL DEFAULT 'demanda'
                              CHECK (etapa_procesal IN ('demanda','emplazamiento','pruebas','sentencia')),
  proxima_fecha_critica     DATE,
  descripcion_fecha_critica VARCHAR(300),
  notas                     TEXT,
  activo                    BOOLEAN       NOT NULL DEFAULT true,
  registrado_por            TEXT,
  fecha_registro            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  fecha_actualizacion       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gastos_legales (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  juicio_id      UUID          NOT NULL REFERENCES juicios(id) ON DELETE CASCADE,
  concepto       VARCHAR(300)  NOT NULL,
  monto          DECIMAL(14,2) NOT NULL CHECK (monto > 0),
  fecha          DATE          NOT NULL DEFAULT CURRENT_DATE,
  notas          TEXT,
  registrado_por TEXT,
  fecha_registro TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documentos_juicio (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  juicio_id        UUID          NOT NULL REFERENCES juicios(id) ON DELETE CASCADE,
  nombre_documento VARCHAR(200)  NOT NULL,
  nombre_original  VARCHAR(255),
  mime_type        VARCHAR(100),
  contenido        BYTEA,
  tamano_bytes     INTEGER,
  registrado_por   TEXT,
  fecha_registro   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bitacora_legal (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  juicio_id      UUID          NOT NULL REFERENCES juicios(id) ON DELETE CASCADE,
  descripcion    TEXT          NOT NULL,
  etapa          VARCHAR(20),
  registrado_por TEXT,
  fecha_registro TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_juicios_prestamo   ON juicios(prestamo_id);
CREATE INDEX IF NOT EXISTS idx_juicios_cliente    ON juicios(cliente_id);
CREATE INDEX IF NOT EXISTS idx_juicios_activo     ON juicios(activo);
CREATE INDEX IF NOT EXISTS idx_juicios_fecha_crit ON juicios(proxima_fecha_critica);
CREATE INDEX IF NOT EXISTS idx_gastos_juicio      ON gastos_legales(juicio_id);
CREATE INDEX IF NOT EXISTS idx_docs_juicio        ON documentos_juicio(juicio_id);
CREATE INDEX IF NOT EXISTS idx_bitacora_juicio    ON bitacora_legal(juicio_id);

-- ----------------------------------------------------------------
-- Trigger: al cambiar estatus del préstamo a 'en_juicio',
-- crear automáticamente un registro en juicios
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION crear_juicio_automatico()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.estatus = 'en_juicio' THEN
    IF TG_OP = 'INSERT' OR (OLD.estatus IS DISTINCT FROM 'en_juicio') THEN
      INSERT INTO juicios (prestamo_id, cliente_id, fecha_inicio, registrado_por)
      VALUES (NEW.id, NEW.cliente_id, CURRENT_DATE, NEW.registrado_por)
      ON CONFLICT (prestamo_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crear_juicio_update ON prestamos;
DROP TRIGGER IF EXISTS trg_crear_juicio_insert ON prestamos;

CREATE TRIGGER trg_crear_juicio_update
AFTER UPDATE ON prestamos
FOR EACH ROW EXECUTE FUNCTION crear_juicio_automatico();

CREATE TRIGGER trg_crear_juicio_insert
AFTER INSERT ON prestamos
FOR EACH ROW EXECUTE FUNCTION crear_juicio_automatico();
