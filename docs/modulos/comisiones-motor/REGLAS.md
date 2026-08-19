# Reglas de cálculo — motor de comisiones

> # 🚫 MÓDULO BLOQUEADO
>
> Este archivo tiene **3 reglas sin definir**. Ninguna tarea que lo lea puede
> arrancar. Ver `docs/PARA-CARLOS-referenciadores.md`.
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

## ⛔ REGLA NO DEFINIDA · Orden dentro del mismo mes
Cuando no alcanza para cubrir el mes completo: ¿primero el inversionista y luego
el referenciador, o prorrata entre ambos?
Se asumió inversionista primero. **CONFIRMAR con Carlos.**

## ⛔ REGLA NO DEFINIDA · Oficina en rojo
Cuando las comisiones exceden lo cobrado: ¿se paga completo y la oficina absorbe,
o se paga hasta lo cobrado y el resto se devenga?
Se asumió lo segundo, por coherencia con R11. **CONFIRMAR con Carlos.**

## ⛔ REGLA NO DEFINIDA · Redondeo
¿A cuántos decimales y quién se queda con el centavo del residuo?
Sin esto la invarianza de suma no cierra. **CONFIRMAR con Carlos.**

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
