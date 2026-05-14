## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)

## Style Guidelines

1. **Modo Minimalista Técnico:** Respuestas directas, sin saludos ni conclusiones. Ve al grano.
2. **Prioridad de Código:** Entrega solo el código o el diff si la solución es evidente.
3. **Excepción de Comandos Manuales:** Si la solución requiere una acción manual (comandos de consola, terminal, configuraciones de OS, migraciones o instalaciones), DEBES dar las instrucciones paso a paso de forma obligatoria y clara. No omitas pasos críticos de terminal.
4. **Validación por Grafo:** Consulta siempre `graphify-out/graph.json` antes de sugerir cambios para evitar efectos colaterales en el Nodo Dios (`useAuth`).
5. **Idioma:** Explicaciones técnicas breves en español, código y comentarios en inglés.

## Arquitectura del Dashboard

### Endpoints
- `GET /api/dashboard/kpis` — KPIs de supervivencia (oficinista/admin)
- `GET /api/dashboard/boss-kpis` — Centro de comando gerencial, mes actual
- `GET /api/dashboard/analytics?mes=&anio=` — Radiografía financiera completa con selector de mes

### Fuente de verdad de ingresos
- `historial_ingresos_central` — tabla activa. Acepta orígenes: `'Prestamo'`, `'Inmueble'`, `'Cancha'`, `'Estacionamiento'` (CHECK expandido por migraciones de cortes).
- `historial_ingresos` — tabla legacy. **NO existe en Neon** (migración nunca aplicada). No referenciarla en nuevas queries.

### Migraciones NO aplicadas en Neon (producción)
Las siguientes migraciones están en `/database/` pero **no están en la DB de producción**:
- `migration_historial_ingresos.sql` — tabla `historial_ingresos` no existe
- `migration_ingresos_hub.sql` — tablas `pensiones_estacionamiento`, `ingresos_directos`, `metricas_cancha` no existen

En el analytics controller, estas ausencias están workaroundeadas:
- `otros` = `0::NUMERIC` (hardcoded)
- `pensiones_activas` = `Promise.resolve({ rows: [{ pensiones_activas: 0 }] })` (hardcoded)

### Regla de oro de flujo
**Nunca mezclar saldo total de deuda con flujo mensual de efectivo.**
- `pago_creditos_mes` = pagos reales del mes a `cuentas_por_pagar WHERE centro_costo='Bancos'`
- Nunca usar `SUM(creditos_bancarios.saldo_actual)` en contexto de flujo mensual

### Top Deudores
Filtrado por `periodo_mes` y `periodo_anio` de `cuentas_por_cobrar`. No acumula meses anteriores.

## Tablas clave y sus relaciones

| Tabla | Descripción |
|---|---|
| `historial_ingresos_central` | Ledger unificado de cobros activos (Prestamo + Inmueble + Cancha + Estacionamiento) |
| `cuentas_por_pagar` | Egresos. `centro_costo` IN ('Oficina','Abril','Inversionistas','Bancos','Renta Externa') |
| `cuentas_por_cobrar` | CxC inmobiliaria. Tiene `contrato_id` y `periodo_mes/anio` |
| `nominas_pagadas` | Costo nómina. Filtrar por `fecha_pago` |
| `juicios` | Tiene `cliente_id` y `prestamo_id`. `activo=true` para casos vigentes |
| `inmuebles` | Tiene `es_renta_externa BOOLEAN` para distinguir propias vs administradas |
| `contratos_arrendamiento` | Tiene `comision_oficina_pct` y `num_local` (migration_renta_externa) |
