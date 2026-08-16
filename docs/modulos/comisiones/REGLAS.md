# Reglas de negocio — comisiones

## Estado: 🚫 BLOQUEADO — 3 reglas sin definir

## Reglas cerradas

| # | Regla |
|---|---|
| R1 | Referenciador cobra % **mensual** sobre **capital**, no sobre interés |
| R2 | Lo paga la **oficina**, de su margen. El inversionista recibe lo suyo íntegro |
| R3 | Base viva: baja conforme baja el capital de su referido |
| R4 | Cada referenciador sigue a **su persona**, no al crédito |
| R8 | **Moratorios = 100% oficina.** No entran al reparto |
| R9 | Vive lo que vive el contrato. Liquidación anticipada corta; renovación reinicia |
| R11 | Si no se cobró, **se devenga y acumula.** Se paga cuando entre el dinero |
| R12 | Lo acumulado se paga **FIFO** — lo más viejo primero |
| R13 | El referenciador **también** se devenga y acumula |
| R14 | Cuando no alcanza, **la oficina decide a quién paga.** Lo demás se acumula |
| R15 | **FIFO forzado dentro de la línea.** Carlos elige la persona, el sistema el periodo |
| R16 | **FIFO por origen, no por persona** |

### R16 en detalle — la que más fácil se implementa mal
Si un referenciador trajo dos préstamos y solo uno paga, cobra del que pagó.
El dinero del préstamo A **no** cubre lo que se debe por el préstamo B.

```
Juan · rendimiento · Aportación #12      → su propia línea, su propio FIFO
Juan · comisión    · Aportación de Ana   → independiente
Juan · comisión    · Aportación de Beto  → independiente
```

Cada línea se paga con el dinero que genera esa línea.

### R17 · Pagos separados
Al liquidar, un pago por concepto. No se junta rendimiento y comisión en un solo
movimiento — es más fácil de liquidar y de auditar.

### R18 · El devengo se congela
Al generarse guarda `base_capital` y `tasa` del momento. Si Carlos edita el
contrato en marzo, los devengos de enero **no se mueven**. Sin esto, cualquier
edición retroactiva reescribe la historia.

### R19 · Gobernanza
Todo pago registra `autorizado_por`, `fecha_autorizacion` y admite comprobante en
PDF que se puede abrir después.

### R20 · Idempotencia
Correr el corte del mismo periodo dos veces no duplica nada. Restricción a nivel
base de datos, no de código.

---

## Pendientes con Carlos

### ⛔ REGLA NO DEFINIDA · Orden dentro del mismo mes
Cuando no alcanza para cubrir el mes completo: ¿primero el inversionista y luego
el referenciador, o prorrata entre ambos?
**Se asumió inversionista primero en los casos. CONFIRMAR.**
Bloquea: aplicación de pagos.

### ⛔ REGLA NO DEFINIDA · Oficina en rojo
Cuando las comisiones exceden lo cobrado: ¿se paga completo y la oficina absorbe
de su bolsa, o se paga hasta lo cobrado y el resto se devenga?
**Se asumió (b) por coherencia con R11. CONFIRMAR.**
Bloquea: generación de devengos y aplicación de pagos.

### ⛔ REGLA NO DEFINIDA · Redondeo
¿A cuántos decimales y quién se queda con el centavo del residuo?
Bloquea: todo el motor. Sin esto la invarianza de suma no cierra.

---

## Prohibido inventar
Si una situación no está cubierta arriba: **para y pregunta.**
Una regla inventada que corre sin error es el peor resultado posible: se
descubre meses después, cuando alguien reclama su dinero.
