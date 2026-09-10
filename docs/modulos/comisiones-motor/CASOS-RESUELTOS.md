# Casos resueltos — motor de comisiones

> Se escriben **antes** que el código y se convierten en tests
> (`backend/src/modules/motor/*.test.ts`). Si un caso no está aquí, el motor
> no lo decide solo: **para y pregunta** (regla de oro de REGLAS.md).
> Dinero exacto: centavos enteros (BigInt), redondeo half-up a 2 decimales (R24).

## Corte mensual — generación de devengos (M13)

El corte de un `(mes, año)` genera un devengo por cada fuente viva. **Solo
genera; nunca paga** (R21). La idempotencia dura vive en la DB
(`devengos_idempotente` + `ON CONFLICT DO NOTHING`): correr el corte dos veces
deja el mismo estado (R20).

**Alcance M13:** devengos de `rendimiento` (inversionista, por inversión
activa). Los de `comision` (referenciador, base viva del origen, R3) entran en
**M14** — el corte ya deja el hueco, no los inventa antes.

### C1 · Devengo de rendimiento simple
- Inversión activa: `monto_actual = 250000.00`, `tasa_interes_mensual = 2.50`
- Corte 9/2026 → devengo: concepto `rendimiento`, origen `inversion`,
  `base_capital = 250000.00`, `tasa = 2.50` (congeladas, R18),
  `monto_devengado = 6250.00` (= 250000 × 2.50 / 100)

### C2 · Redondeo half-up a centavos (R24)
- `monto_actual = 33333.33`, `tasa = 2.75`
- 33333.33 × 2.75 / 100 = 916.666575 → `monto_devengado = 916.67`

### C3 · Medio centavo exacto sube (half-up)
- `monto_actual = 1000.00`, `tasa = 0.0…` no aplica: la tasa mínima con 2
  decimales es `0.01`. Caso frontera real: `monto_actual = 50.00`,
  `tasa = 0.01` → 0.005 → `monto_devengado = 0.01` (half-up, el medio centavo
  sube; el residuo del reparto global es de la oficina, R24)

### C4 · Devengo que redondea a cero no se genera
- `monto_actual = 20.00`, `tasa = 0.01` → 0.002 → 0.00
- Un devengo de $0.00 no representa deuda: **no se inserta**. (No confundir con
  R11: lo que sí devengó > 0 se acumula siempre.)

### C5 · Solo inversiones con estatus `activo` generan
- Estatus `pausado`, `liquidado`, `vencido` → fuera del corte (R9: vive lo que
  vive el contrato). Mismo mes, cuatro inversiones, una por estatus → 1 devengo.

### C6 · El corte es determinista y no paga
- Mismo input → mismos candidatos, en el mismo orden (inversión por `id`).
- `monto_pagado` nace en 0 y `estado` en `pendiente`; el corte jamás los toca
  (R21: pagar es humano).

### C7 · Idempotencia (integración, DB)
- Corte 9/2026 corrido dos veces → la segunda inserta **0** filas
  (`devengos_idempotente`, R20). El estado de la tabla es idéntico.
