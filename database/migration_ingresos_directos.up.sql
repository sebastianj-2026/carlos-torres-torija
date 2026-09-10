-- ================================================================
-- Deuda dashboard/ingresos · Tablas `ingresos_directos` + `metricas_cancha`
-- Extraídas de la obsoleta migration_ingresos_hub.sql (2026-09-09): de ese
-- hub, SOLO estas dos tienen consumidor vivo (ingresos.controller.ts —
-- pestaña Ingresos Extras y su sub-registro de cancha).
-- `pensiones_estacionamiento` NO se crea: módulo eliminado del negocio;
-- sus lecturas quedan en el fallback safeQuery (vacío) a propósito.
-- ================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS ingresos_directos (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  unidad_negocio      VARCHAR(50)   NOT NULL
                        CHECK (unidad_negocio IN (
                          'estacionamiento_coches','estacionamiento_banos',
                          'estacionamiento_tiendita','cancha_futbol','ingreso_atipico'
                        )),
  monto_ingresado     NUMERIC(12,2) NOT NULL CHECK (monto_ingresado > 0),
  semana_corte        DATE          NOT NULL,
  metodo_pago         VARCHAR(30)   NOT NULL
                        CHECK (metodo_pago IN ('efectivo','transferencia','tarjeta')),
  cuenta_destino      VARCHAR(200),
  persona_nombre      VARCHAR(200),
  notas_explicativas  TEXT,
  url_comprobante     TEXT,
  registrado_por      UUID,
  fecha_registro      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_id_unidad ON ingresos_directos (unidad_negocio);
CREATE INDEX IF NOT EXISTS idx_id_semana ON ingresos_directos (semana_corte);
CREATE INDEX IF NOT EXISTS idx_id_metodo ON ingresos_directos (metodo_pago);

CREATE TABLE IF NOT EXISTS metricas_cancha (
  id                 UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  ingreso_directo_id UUID    NOT NULL REFERENCES ingresos_directos(id) ON DELETE CASCADE,
  cantidad_rentas    INTEGER NOT NULL DEFAULT 0 CHECK (cantidad_rentas >= 0),
  fecha_registro     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mc_ingreso ON metricas_cancha (ingreso_directo_id);

COMMIT;
