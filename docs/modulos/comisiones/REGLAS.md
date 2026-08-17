# Reglas de negocio — comisiones

## Estado: ✅ reglas cerradas — listo para derivar backlog (motor)

> Las 3 reglas pendientes se cerraron con Carlos el 2026-08-16 (R21, R22, R23).

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

## Reglas cerradas con Carlos (2026-08-16)

### R21 · Orden dentro del mismo mes
**Regla:** Cuando el dinero cobrado no alcanza para cubrir el mes completo, se
paga **primero el rendimiento del inversionista, completo**; lo que sobre va al
referenciador; el faltante del referenciador se devenga (R11/R13).
**Base:** el cobrado del periodo por esa línea.
**Por qué:** el inversionista recibe lo suyo íntegro (R2); la comisión de oficina
es lo que se ajusta cuando falta. Confirma el supuesto usado en `CASOS-RESUELTOS.md`.

### R22 · Oficina en rojo
**Regla:** Cuando comisiones + rendimientos del periodo exceden lo efectivamente
cobrado, **se paga solo hasta lo cobrado; el faltante se devenga y acumula** (no
se paga de la bolsa de la oficina). Se liquida cuando entre más dinero, FIFO.
**Por qué:** coherente con R11 (si no se cobró, se devenga) y R14 (cuando no
alcanza, lo demás se acumula). El motor nunca paga dinero que no entró.

### R23 · Redondeo
**Regla:** Todo monto se redondea a **2 decimales** (centavos MXN).
**Dueño del residuo:** el centavo sobrante del reparto **se lo queda la oficina**.
**Dónde:** al cerrar cada línea de reparto, después de calcular cada concepto.
**Por qué:** el residuo necesita dueño explícito o la invarianza de suma
(`sum(repartido) === cobrado`) no cierra. La oficina absorbe/gana el centavo,
nunca el inversionista ni el referenciador.

---

## Prohibido inventar
Si una situación no está cubierta arriba: **para y pregunta.**
Una regla inventada que corre sin error es el peor resultado posible: se
descubre meses después, cuando alguien reclama su dinero.
