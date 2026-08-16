# Datos — dashboard

> Solo se abre en tareas de tipo `data`.
> Movido verbatim desde el `CLAUDE.md` monolítico en la Fase 0.

## Tablas clave y sus relaciones

| Tabla | Descripción |
|---|---|
| `historial_ingresos_central` | Ledger unificado de cobros activos (Prestamo + Inmueble + Cancha + Estacionamiento) ⚠️ REVISAR: Inmueble/Cancha/Estacionamiento eliminados en 52b2117 |
| `cuentas_por_pagar` | Egresos. `centro_costo` IN ('Oficina','Abril','Inversionistas','Bancos','Renta Externa') |
| `cuentas_por_cobrar` | CxC inmobiliaria. Tiene `contrato_id` y `periodo_mes/anio` ⚠️ REVISAR: ¿sigue viva tras remover inmobiliaria? |
| `nominas_pagadas` | Costo nómina. Filtrar por `fecha_pago` |
| `juicios` | Tiene `cliente_id` y `prestamo_id`. `activo=true` para casos vigentes |
| `inmuebles` | Tiene `es_renta_externa BOOLEAN` para distinguir propias vs administradas ⚠️ REVISAR: ¿residuo del módulo inmobiliaria eliminado? |
| `contratos_arrendamiento` | Tiene `comision_oficina_pct` y `num_local` (migration_renta_externa) ⚠️ REVISAR: idem inmobiliaria |

## Fuente de verdad de ingresos
- `historial_ingresos_central` — tabla activa. Acepta orígenes: `'Prestamo'`,
  `'Inmueble'`, `'Cancha'`, `'Estacionamiento'` (CHECK expandido por migraciones
  de cortes). ⚠️ REVISAR contra Neon (ver REGLAS.md › R3).
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
