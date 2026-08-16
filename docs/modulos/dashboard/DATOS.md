# Datos — dashboard

> Solo se abre en tareas de tipo `data`.
> Movido verbatim desde el `CLAUDE.md` monolítico en la Fase 0.

## Tablas clave y sus relaciones

> Verificado 2026-08-16 contra `database/migration_remove_modules.sql` (base del
> commit 52b2117). Tablas eliminadas marcadas ~~tachadas~~. Confirmación en vivo
> contra Neon pendiente si se quiere certeza absoluta.

| Tabla | Descripción |
|---|---|
| `historial_ingresos_central` | Ledger de cobros. En la práctica **solo origen `'Prestamo'`**: las filas `Inmueble/Cancha/Estacionamiento` se borraron en `migration_remove_modules`. El `CHECK hic_origen_check` **todavía las lista** (residuo cosmético, no se encogió). |
| `cuentas_por_pagar` | Egresos. `centro_costo` IN ('Oficina','Abril','Inversionistas','Bancos','Renta Externa') |
| ~~`cuentas_por_cobrar`~~ | **ELIMINADA** (`DROP ... CASCADE` en migration_remove_modules). Era CxC inmobiliaria. |
| `nominas_pagadas` | Costo nómina. Filtrar por `fecha_pago` |
| `juicios` | **Viva.** Tiene `cliente_id` y `prestamo_id`. `activo=true` para casos vigentes. No se tocó en la eliminación. |
| ~~`inmuebles`~~ | **ELIMINADA** (`DROP ... CASCADE`). Era del módulo inmobiliaria. |
| ~~`contratos_arrendamiento`~~ | **ELIMINADA** (`DROP ... CASCADE`). Era del módulo inmobiliaria. |

## Fuente de verdad de ingresos
- `historial_ingresos_central` — tabla activa. El `CHECK` nominal acepta
  `'Prestamo'`, `'Inmueble'`, `'Cancha'`, `'Estacionamiento'`, pero tras
  `migration_remove_modules` **solo `'Prestamo'` tiene filas y escritores vivos**;
  el resto es residuo del CHECK (ver REGLAS.md › R3).
- `historial_ingresos` — tabla legacy. **NO existe en Neon** (migración nunca
  aplicada). No referenciarla en nuevas queries.

## Migraciones NO aplicadas en Neon (producción)
Las siguientes migraciones están en `/database/` pero **no están en la DB de
producción**:
- `migration_historial_ingresos.sql` — tabla `historial_ingresos` no existe
- `migration_ingresos_hub.sql` — tablas `pensiones_estacionamiento`,
  `ingresos_directos`, `metricas_cancha` no existen

En el analytics controller, estas ausencias están workaroundeadas:
- `otros` = `0::NUMERIC` (hardcoded)
- `pensiones_activas` = `Promise.resolve({ rows: [{ pensiones_activas: 0 }] })` (hardcoded)

## Migraciones
| # | Qué hace | Reversa | Aplicada en prod |
|---|---|---|---|
| — | Las migraciones viven en `database/*.sql` (naming plano, sin `.up/.down`) | ❌ no versionada | aplicación **manual** a Neon |

**Deuda:** el flujo de migraciones es manual y sin reversa. Ver `docs/ESTADO.md`.
La metodología pide `.down.sql` por migración (check `migracion-reversible`),
hoy no se cumple.

## Seed
`database/seed_datos_demo.sql`, `seed_inversionistas_inicial.sql`.
