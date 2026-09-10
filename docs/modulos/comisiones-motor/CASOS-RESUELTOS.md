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

## Comisiones sobre capital vigente — base viva (M14)

Devengos de `comision` para el referenciador, uno por **referencia activa**
(R16: una línea por origen). Base = capital vigente del origen **al momento del
corte** (R3), congelada al generarse (R18). La tasa sale de `referencias.tasa`.

### C8 · Comisión sobre inversión referida
- Referencia activa a inversión con `monto_actual = 250000.00`, `tasa = 0.50`
- → devengo: concepto `comision`, origen `inversion`, `base_capital = 250000.00`,
  `tasa = 0.50`, `monto_devengado = 1250.00`

### C9 · Comisión sobre préstamo referido
- Referencia activa a préstamo con `saldo_pendiente = 100000.00`, `tasa = 0.75`
- → devengo: origen `prestamo`, `base_capital = 100000.00`,
  `monto_devengado = 750.00`
- **El monto vigente del préstamo es `saldo_pendiente`** (capital, no interés).

### C10 · Base viva (R3): el corte usa el capital del momento
- Mismo préstamo, el mes siguiente `saldo_pendiente = 80000.00`
- → `monto_devengado = 600.00`. El devengo del mes anterior no se recalcula
  (R18: congelado).

### C11 · Referencia no activa no genera
- `estado = terminada` o `cancelada` → fuera del corte (R9: liquidación
  anticipada corta la comisión).

### C12 · El origen debe estar vivo
- Inversión referida: genera solo con `estatus = activo` (mismo criterio que C5).
- Préstamo referido: genera con `activo`, `atrasado` y `en_juicio` — el contrato
  sigue vivo y R11 manda: lo que no se cobra **se devenga y acumula** igual.
  `liquidado` y `cancelado` no generan (R9).

### C13 · Moratorios fuera (R8)
- La base es **capital vigente** (`monto_actual` / `saldo_pendiente`), nunca
  incluye moratorios ni intereses. Los moratorios son 100% de la oficina y no
  generan comisión.

## Aplicación FIFO por origen (M15)

Un pago se aplica sobre **una sola línea**: (beneficiario, concepto, origen).
Dentro de la línea el periodo no se elige: FIFO forzado, lo más viejo primero
(R12, R15). El dinero **nunca cruza de línea** (R16). La función es pura: el
registro del pago (comprobante, autorización, R19) llega en M17/M19.

### C14 · FIFO dentro de la línea
- Línea con devengos jul $750, ago $750, sep $750 (pendientes). Pago $1,600.
- → jul $750 (queda `pagado`), ago $750 (`pagado`), sep $100 (`parcial`).
  Sobrante $0.

### C15 · R16: dos préstamos del mismo referenciador, uno pagando
- Juan refiere préstamo A y préstamo B; entra dinero del préstamo A.
- El pago se aplica **solo** a la línea de A. La deuda de B queda intacta.
- La función **rechaza** (error) recibir slots de líneas mezcladas — la
  separación no es disciplina del caller, es imposible por diseño.

### C16 · El pago no sobrepaga la línea
- Línea con pendiente total $500. Pago $800.
- → se aplican $500; **sobrante $300** regresa al caller (la oficina decide qué
  hacer con él — R22; jamás brinca solo a otra línea).

### C17 · Slots ya pagados se saltan
- jul `pagado`, ago pendiente $750. Pago $200 → todo a ago (`parcial`).

### C18 · Pago parcial previo cuenta
- Devengo $750 con `monto_pagado = 700`. Pago $100 → aplica $50 (`pagado`),
  sobrante $50.

### C19 · Exactitud a centavo
- Devengo $0.03 pendiente. Pago $0.01 → aplica $0.01 (`parcial`), sin drift.
