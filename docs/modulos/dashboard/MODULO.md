# Módulo: dashboard

## Qué resuelve
La radiografía financiera de la oficina: KPIs de supervivencia, centro de comando
gerencial y analítica del mes. Agrega ingresos, egresos y nómina en una sola vista.

## Entidades
Transversal — no tiene tabla propia. Lee de todas las demás (ver `DATOS.md`).

## Endpoints

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/api/dashboard/kpis` | KPIs de supervivencia (oficinista/admin) |
| GET | `/api/dashboard/boss-kpis` | Centro de comando gerencial, mes actual |
| GET | `/api/dashboard/analytics?mes=&anio=` | Radiografía financiera completa con selector de mes |

## Depende de
Ingresos (`historial_ingresos_central`), egresos (`cuentas_por_pagar`), nómina
(`nominas_pagadas`), CxC (`cuentas_por_cobrar`). No escribe: solo consulta y agrega.

## Qué NO hace este módulo
- No registra cobros ni pagos — solo los lee y los suma.
- No mezcla saldo total de deuda con flujo mensual de efectivo (ver `REGLAS.md` › R1).

> Esta sección es tan importante como las de arriba. Sin ella, Claude Code
> rellena el hueco con lo que le parece razonable.
