# Casos resueltos — comisiones

> ✅ Reglas cerradas (R21/R22/R23). Cada caso se convierte en test ANTES de
> escribir el motor. Los 7 casos numéricos están validados aritméticamente.

## Supuestos
Crédito $500,000 al 4% mensual · Inversionista $500,000 al 2.0% ·
Referenciador 0.5% · Moratorios 100% oficina

| Caso | Qué prueba | Resultado esperado |
|---|---|---|
| 1 | mes normal | inv 10,000 · ref 2,500 · oficina 7,500 = 20,000 ✓ |
| 2 | cliente amortiza 100k, base viva | cobrado 16,000 · oficina baja a 3,500 |
| 3 | mora total | cobrado 0 · devengado 12,500 · pagado 0 |
| 4 | FIFO tras 2 meses | de 20,000: m1 completo, m2 inv parcial 7,500, ref 0 |
| 5 | dos inversionistas, no alcanza | el sistema NO decide, presenta y Carlos elige |
| 6 | oficina en rojo | -4,500, se muestra en rojo, no se fuerza a cero |
| 7 | corte corrido dos veces | mismo estado. No duplica |

## Caso 8 · FIFO por origen (R16) — el que más fácil se implementa mal
```
ENTRADA
  Juan es referenciador de dos aportaciones:
    Aportación de Ana  → debe 2 meses = 5,000
    Aportación de Beto → debe 1 mes   = 2,500
  Entra pago SOLO del crédito ligado a Ana, alcanza para 5,000

SALIDA ESPERADA
  Se pagan los 2 meses de la línea de Ana:      5,000
  La línea de Beto NO se toca:                  2,500 sigue pendiente

POR QUÉ
  R16. El dinero de Ana no cubre lo de Beto. Si la implementación hace FIFO por
  persona cruzando orígenes, pagaría con dinero que no es de ahí.
```

## Invariantes
Valen para **cualquier** entrada:

1. `inversionistas + referenciadores + oficina == cobrado` — al centavo
2. `devengado − pagado == acumulado` — por persona y concepto, siempre
3. Correr el corte N veces produce el mismo estado que correrlo una vez
4. Ningún pago se aplica a un periodo más nuevo si hay uno viejo pendiente
   **de la misma línea** (persona + concepto + origen)
5. Los moratorios nunca aparecen en el reparto
6. `monto_pagado <= monto_devengado`, siempre
7. Ningún referenciador cobra por un referido de su referido

## Reglas de desempate (cerradas 2026-08-16)
1. Orden dentro del mismo mes → **inversionista primero**, resto del referenciador se devenga (R21)
2. Oficina en rojo → **paga hasta lo cobrado, el resto se devenga** (R22)
3. Redondeo → **2 decimales, residuo a la oficina** (R23)
