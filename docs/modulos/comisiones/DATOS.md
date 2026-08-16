# Datos — comisiones

> ✅ Reglas cerradas (R21/R22/R23). Redondeo definido: 2 decimales, residuo a la
> oficina (R23) — el schema ya usa `NUMERIC(14,2)`, no cambia.
> Dependencia: FKs a `personas`/`persona_documentos` — requiere `personas` implementado.

```sql
-- El corazón del módulo. R11-R13: se devenga siempre, se paga cuando hay.
CREATE TABLE devengos (
  id              BIGSERIAL PRIMARY KEY,
  persona_id      BIGINT NOT NULL REFERENCES personas(id),
  concepto        TEXT NOT NULL CHECK (concepto IN ('rendimiento','comision')),
  origen_tipo     TEXT NOT NULL CHECK (origen_tipo IN ('aportacion','credito')),
  origen_id       BIGINT NOT NULL,          -- R16: el FIFO corre POR ORIGEN
  periodo         DATE NOT NULL,            -- primer día del mes

  -- R18: congelados al generarse. NO se recalculan nunca.
  base_capital    NUMERIC(14,2) NOT NULL,
  tasa            NUMERIC(6,4)  NOT NULL,
  monto_devengado NUMERIC(14,2) NOT NULL,
  monto_pagado    NUMERIC(14,2) NOT NULL DEFAULT 0,

  estado          TEXT NOT NULL DEFAULT 'pendiente'
                  CHECK (estado IN ('pendiente','parcial','pagado')),
  generado_en     TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT no_sobrepago CHECK (monto_pagado <= monto_devengado),
  -- R20: idempotencia A NIVEL BASE DE DATOS, no de código.
  -- Correr el corte dos veces por error duplicaría la deuda de todos.
  CONSTRAINT corte_idempotente UNIQUE (persona_id, concepto, origen_tipo, origen_id, periodo)
);

-- R17: un pago por concepto. R19: gobernanza.
CREATE TABLE pagos (
  id                  BIGSERIAL PRIMARY KEY,
  persona_id          BIGINT NOT NULL REFERENCES personas(id),
  concepto            TEXT NOT NULL CHECK (concepto IN ('rendimiento','comision')),
  monto               NUMERIC(14,2) NOT NULL CHECK (monto > 0),
  fecha               DATE NOT NULL,
  autorizado_por      TEXT NOT NULL,                    -- R19
  fecha_autorizacion  TIMESTAMPTZ NOT NULL DEFAULT now(),
  comprobante_doc_id  BIGINT NULL REFERENCES persona_documentos(id),
  nota                TEXT,
  creado_en           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Qué devengo cubrió qué pago. Es la trazabilidad del FIFO.
CREATE TABLE pago_aplicaciones (
  id          BIGSERIAL PRIMARY KEY,
  pago_id     BIGINT NOT NULL REFERENCES pagos(id),
  devengo_id  BIGINT NOT NULL REFERENCES devengos(id),
  monto       NUMERIC(14,2) NOT NULL CHECK (monto > 0),
  UNIQUE (pago_id, devengo_id)
);
```

## Índices

```sql
-- R15/R16: el FIFO barre por línea (persona+concepto+origen), periodo ascendente
CREATE INDEX devengos_fifo
  ON devengos (persona_id, concepto, origen_tipo, origen_id, periodo)
  WHERE estado <> 'pagado';

CREATE INDEX devengos_periodo ON devengos (periodo);
```

## Vistas de apoyo

```sql
-- "¿cuánto le debo?" es una suma, no una reconstrucción
CREATE VIEW saldo_por_persona AS
SELECT persona_id, concepto,
       SUM(monto_devengado) AS devengado,
       SUM(monto_pagado)    AS pagado,
       SUM(monto_devengado - monto_pagado) AS acumulado
FROM devengos GROUP BY persona_id, concepto;
```

## Notas
- `NUMERIC`, nunca float. Check: `dinero-sin-float`.
- Nada se borra. Un devengo mal generado se cancela con estado, no con DELETE.
- `monto_devengado` a 2 decimales; el residuo del reparto lo absorbe la oficina (R23).
