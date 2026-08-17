# Datos — personas

> Solo se abre en tareas de tipo `data`.

## Tablas

```sql
CREATE TABLE personas (
  id              BIGSERIAL PRIMARY KEY,
  nombre          TEXT NOT NULL,
  apellido_paterno TEXT NOT NULL,
  apellido_materno TEXT,
  telefono        TEXT NOT NULL,
  correo          TEXT,
  direccion       TEXT,
  activo          BOOLEAN NOT NULL DEFAULT TRUE,   -- P8: nunca DELETE
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- P1: una persona por nombre completo + teléfono
CREATE UNIQUE INDEX personas_identidad
  ON personas (lower(nombre), lower(apellido_paterno), telefono)
  WHERE activo;

-- P2: roles simultáneos
CREATE TABLE persona_roles (
  id          BIGSERIAL PRIMARY KEY,
  persona_id  BIGINT NOT NULL REFERENCES personas(id),
  rol         TEXT NOT NULL CHECK (rol IN ('inversionista','cliente','referenciador')),
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  activado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (persona_id, rol)
);

-- P3: INE en PDF
CREATE TABLE persona_documentos (
  id           BIGSERIAL PRIMARY KEY,
  persona_id   BIGINT NOT NULL REFERENCES personas(id),
  tipo         TEXT NOT NULL CHECK (tipo IN ('ine','comprobante_pago','otro')),
  nombre_archivo TEXT NOT NULL,
  mime         TEXT NOT NULL CHECK (mime = 'application/pdf'),
  bytes        INTEGER NOT NULL,
  storage_key  TEXT NOT NULL,        -- ver nota de almacenamiento
  subido_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- P4: aportaciones. P6: referenciador opcional POR APORTACIÓN
CREATE TABLE aportaciones (
  id                BIGSERIAL PRIMARY KEY,
  inversionista_id  BIGINT NOT NULL REFERENCES personas(id),
  monto             NUMERIC(14,2) NOT NULL CHECK (monto > 0),
  fecha             DATE NOT NULL,
  referenciador_id  BIGINT NULL REFERENCES personas(id),   -- P6: nullable
  tasa_inversionista NUMERIC(6,4) NOT NULL,                -- ej. 0.0200
  tasa_referenciador NUMERIC(6,4) NULL,                    -- ej. 0.0050
  contrato_id       BIGINT NULL,      -- R9: la comisión vive lo que vive el contrato
  estado            TEXT NOT NULL DEFAULT 'activa'
                    CHECK (estado IN ('activa','liquidada','archivada')),
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- P7: nadie se refiere a sí mismo
  CONSTRAINT no_auto_referencia CHECK (referenciador_id IS DISTINCT FROM inversionista_id),
  -- si hay referenciador, tiene que haber tasa
  CONSTRAINT tasa_ref_coherente CHECK (
    (referenciador_id IS NULL AND tasa_referenciador IS NULL) OR
    (referenciador_id IS NOT NULL AND tasa_referenciador IS NOT NULL)
  )
);
```

## Índices

```sql
CREATE INDEX aportaciones_inversionista ON aportaciones (inversionista_id) WHERE estado = 'activa';
CREATE INDEX aportaciones_referenciador ON aportaciones (referenciador_id) WHERE referenciador_id IS NOT NULL;
CREATE INDEX persona_roles_rol          ON persona_roles (rol) WHERE activo;
```

`aportaciones_referenciador` existe porque la pantalla de rentabilidad por
referenciador (mejora 8) barre por ahí.

## Dinero: `NUMERIC`, nunca float
`NUMERIC(14,2)` para montos, `NUMERIC(6,4)` para tasas. Check ejecutable:
`dinero-sin-float`. Un float en dinero es el bug que no se ve hasta que alguien
reclama centavos.

## Almacenamiento del PDF

⚠️ **Decisión pendiente de Sebastian.** El sistema base usa BYTEA para PDFs.
Para INE y comprobantes conviene más object storage (R2 / Supabase) con
`storage_key`, porque los PDFs inflan los backups de la base y complican las
restauraciones.

El schema de arriba asume `storage_key`. Si se queda BYTEA, cambia esa columna
antes de la primera migración — después es migración con datos vivos.

## Migraciones

| # | Qué hace | Reversa | Aplicada en prod |
|---|---|---|---|
| — | — | — | — |

Toda migración trae su `.down.sql`. Check: `migracion-reversible`.

## Seed
Datos que parezcan del negocio real, no "Cliente 1":
- Una persona con **los dos roles** (inversionista + referenciador) — es el caso
  que rompe si el modelo está mal
- Un inversionista con dos aportaciones, una con referenciador y otra sin
- Una cadena A→B→C para probar que P7 se cumple
