# Reglas de negocio — dashboard

> **Archivo sagrado.** Baja rotación. Cambia dos veces al año, no dos veces
> por semana. Solo se abre en tareas de tipo `logic` o `motor`.
>
> Movido verbatim desde el `CLAUDE.md` monolítico en la Fase 0 de la metodología.

## R1 · Regla de oro de flujo
**Regla:** Nunca mezclar saldo total de deuda con flujo mensual de efectivo.
- `pago_creditos_mes` = pagos reales del mes a `cuentas_por_pagar WHERE centro_costo='Bancos'`
- Nunca usar `SUM(creditos_bancarios.saldo_actual)` en contexto de flujo mensual

**Por qué:** el saldo es un stock; el flujo es lo que entró/salió en el mes.
Sumar el saldo total como si fuera flujo infla el egreso del mes.

## R2 · Top Deudores
**Regla:** Filtrado por `periodo_mes` y `periodo_anio` de `cuentas_por_cobrar`.
No acumula meses anteriores.

## R3 · Fuente de verdad de ingresos
**Regla:** `historial_ingresos_central` es la tabla activa de cobros.
- **Solo el origen `'Prestamo'` está vivo.** `migration_remove_modules` (commit
  52b2117) borró las filas de `'Inmueble'`, `'Cancha'` y `'Estacionamiento'` y
  eliminó sus módulos. El `CHECK hic_origen_check` **no se encogió** y todavía
  los lista — es residuo cosmético; ningún módulo escribe esos orígenes. No
  construir features nuevas sobre ellos.
- `historial_ingresos` — tabla legacy. **NO existe en Neon** (migración nunca
  aplicada). No referenciarla en nuevas queries.

---

## Prohibido inventar
Si una situación no está cubierta arriba: **para y pregunta.**
No elijas la interpretación razonable. En este dominio, una regla inventada
que corre sin error es el peor resultado posible — se descubre meses después,
cuando alguien reclama su dinero.
