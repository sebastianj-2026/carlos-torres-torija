# Reglas de cálculo — motor de comisiones

> ✅ **Módulo desbloqueado el 2026-09-09.** Las 3 reglas pendientes las resolvió
> **Sebastian** (R22–R24 abajo).
> ✅ **Validadas el 2026-09-10:** Sebastian confirmó que las 7 decisiones del
> release provienen de los requerimientos que él levantó con la oficina.
>
> **Archivo sagrado.** Baja rotación. Solo se abre en tareas `motor` o `logic`
> del Bloque B/C del backlog.
> La **estructura** (quién es referenciador, cómo se liga) no vive aquí:
> está en `docs/modulos/inversionistas/REGLAS.md`, y esa sí está completa.

---

## Cálculo

| # | Regla |
|---|---|
| R1 | Comisión **mensual** sobre **capital**, no sobre interés |
| R2 | La paga la **oficina**, de su margen. El inversionista cobra íntegro |
| R3 | **Base viva:** baja conforme baja el capital del referido |
| R4 | Cada referenciador sigue a **su origen**, no al crédito completo |
| R8 | **Moratorios = 100% oficina.** No entran al reparto |
| R9 | Vive lo que vive el contrato. Liquidación anticipada corta; renovación reinicia |
| R11 | Si no se cobró, **se devenga y acumula.** Se paga cuando entre el dinero |
| R12 | Lo acumulado se paga **FIFO** — lo más viejo primero |
| R13 | El referenciador **también** se devenga y acumula |
| R14 | Cuando no alcanza, **la oficina decide a quién paga.** El resto se acumula |
| R15 | **FIFO forzado dentro de la línea.** Carlos elige a quién; el sistema el periodo |
| R16 | **FIFO por origen, no por persona** |
| R17 | Al liquidar, **un pago por concepto**. No se juntan rendimiento y comisión |
| R18 | El devengo **se congela**: guarda base y tasa del momento |
| R19 | Todo pago registra forma, comprobante, cuenta y **quién autorizó** |
| R20 | Correr el corte dos veces **no duplica nada** |

### R16 en detalle — lo más fácil de implementar mal
Si un referenciador trajo dos préstamos y solo uno paga, cobra del que pagó.
El dinero del préstamo A **no** cubre lo que se debe por el préstamo B.

```
Juan · comisión · Préstamo de Ana   → línea propia, FIFO propio
Juan · comisión · Préstamo de Beto  → independiente
```

### R18 — por qué congelar
Si Carlos edita el contrato en marzo, los devengos de enero no se mueven. Sin
esto, cualquier edición retroactiva reescribe la historia y las conciliaciones
dejan de cuadrar.

### R21 · Solo la oficina paga
Los pagos no los genera ningún cálculo automático. Carlos da clic en pagar,
indica cómo entregó el dinero, sube el comprobante y queda registrado quién
autorizó.

---

## Reglas resueltas el 2026-09-09 (Sebastian) — validadas el 2026-09-10

### R22 · Sin orden automático entre beneficiarios
Cuando no alcanza en el mes, **el sistema no reparte ni prioriza**: muestra
todos los pendientes (inversionista y referenciador) y **la oficina decide cuál
liquidar y en qué orden**, pago por pago. No hay prelación programada — es la
extensión natural de R14/R21. Dentro de cada línea sigue aplicando R15 (FIFO
forzado de periodos).

### R23 · La oficina nunca absorbe automáticamente
No existe pago automático que obligue a la oficina a poner dinero. Lo que no se
paga **permanece devengado sin límite de tiempo** (R11, R13) hasta que la
oficina decida liquidarlo (R21). "Absorber" solo ocurre si la oficina
explícitamente registra pagos por encima de lo cobrado — decisión humana, no
regla del motor.

### R24 · Redondeo a 2 decimales; el residuo es de la oficina
Todo cálculo se redondea a **centavos (2 decimales)** y el residuo del reparto
queda **del lado de la oficina**. Invarianza dura: la suma de las partes más el
residuo debe cuadrar exacto con el total cobrado, cada mes.

---

## Reglas definidas el 2026-09-16 (Sebastian)

### R25 · El pago depende del cobro
Lo generado (rendimiento o comisión) se sigue generando y acumulando cada mes
aunque el cliente no pague (R11, R13), pero **no se le paga** al inversionista
ni al referenciador hasta que el cliente pague. Cuando el cliente se pone al
corriente o termina el juicio, lo pendiente se paga **FIFO**, empezando por el
periodo más viejo (R12, R15). Si el cliente paga solo una parte, se liberan solo
los periodos más viejos que esa parte alcance.

**Ejemplo:** Juan trajo a Ana. Préstamo de Ana con `saldo_pendiente`
$200,000.00 y tasa de referenciador 0.50 → comisión de **$1,000.00/mes**
(200,000 × 0.50 / 100). Ana no paga julio, agosto ni septiembre → Juan tiene 3
periodos pendientes = **$3,000.00**, y la oficina no le paga nada. En octubre
Ana paga solo un mes → se libera **julio** ($1,000.00). Agosto y septiembre
siguen pendientes. En noviembre Ana se pone al corriente → se liberan agosto y
septiembre ($2,000.00).

> ⚠️ `POST /api/pagos-devengo` **hoy no valida R25** (no cruza el pago del
> devengo contra los cobros del cliente). Es inofensivo mientras el corte esté
> apagado; queda como deuda en `docs/ESTADO.md`.

### R26 · No se paga más de lo pendiente
Si el monto capturado excede lo pendiente de la línea (beneficiario + concepto +
origen, R16), el pago **se rechaza completo** con el sobrante exacto en el
mensaje. No se crea saldo a favor ni se aplica a otra línea. Si la persona deja
dinero de más, se registran **dos movimientos separados**: (1) el pago del
devengo por lo pendiente exacto y (2) una entrada de capital en
`movimientos_inversionistas`, solo si la persona es inversionista.

**Ejemplo:** a Juan se le deben $2,000.00 por el préstamo de Ana. Se captura
$2,500.00 → **400**, sobrante $500.00. Se corrige a $2,000.00 y se registra. Si
Juan quiere dejar los $500.00 invertidos y también es inversionista, se capturan
como entrada de capital en su perfil.

`POST /api/pagos-devengo` ya cumple R26 desde M19.

### Criterios derivados — confirmados
- **Préstamo `atrasado` o `en_juicio` sí genera comisión** (C12). Confirmado por
  Sebastian el 2026-09-16 (D4 del sprint de referencias).
- **Monto excedente al pagar se rechaza completo** — confirmado = **R26**.

---

## Preguntas abiertas — antes de conectar el corte

> ⛔ PENDIENTE (no bloqueante mientras el corte esté apagado)
>
> El corte mensual (`generarCorte`) está escrito y probado pero **apagado a
> propósito** (decisión D1, 2026-09-16). Estas dos preguntas solo importan el
> día que se conecte. **No se inventa respuesta.**
>
> 1. **R25 con rendimientos de inversión:** el capital de un inversionista
>    puede estar repartido en varios préstamos (`participantes_prestamo`).
>    ¿El pago de qué cliente libera su rendimiento?
> 2. **R25 si el juicio no recupera el capital:** ¿qué pasa con lo acumulado?
>
> *El día que se conecte el corte, estas preguntas pasan a encabezado
> `## ⛔ REGLA NO DEFINIDA · …` y bloquean el módulo hasta tener respuesta.*

---

## Referencia de implementación

El motor del módulo `comisiones` descartado **ya resolvió** el reparto y el FIFO
por origen: `backend/src/modules/comisiones/{reparto,fifo}.ts`, con 14 tests
verdes. Antes de escribir M13/M15 desde cero, léelos. No los borres.

---

## Prohibido inventar
Si una situación no está cubierta arriba: **para y pregunta.**
Una regla inventada que corre sin error es el peor resultado posible: se descubre
meses después, cuando alguien reclama su dinero.
