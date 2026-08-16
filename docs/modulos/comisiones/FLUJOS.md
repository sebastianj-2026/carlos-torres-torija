# Flujos y pantallas — comisiones

## Pantalla: Corte del mes
- Selector de periodo · botón "Generar devengos"
- Antes de generar: previsualización de a quién y cuánto
- Si el periodo ya se corrió: aviso claro, botón deshabilitado (R20)
- Resultado: tabla de devengos generados con totales

## Pantalla: Pagos pendientes — la que Carlos usa cada mes
```
PENDIENTES                          Disponible: $8,000

☐ Ana Ruiz      rendimiento   Aportación #8    $6,000   [2 meses]
☐ Ana Ruiz      comisión      Apt. de Beto     $1,500   [2 meses]
☐ Luis Mora     rendimiento   Aportación #11   $4,000   [1 mes]
                                              ────────
                              Seleccionado:        $0
                              Quedaría:        $8,000
```
- Carlos selecciona (R14). El sistema no decide.
- Dentro de cada línea, FIFO automático: no elige el periodo (R15)
- Al confirmar: pide **autorizado por** y permite subir comprobante PDF (R19)
- Un pago por concepto, no combinados (R17)

## Pantalla: Estado de cuenta por persona
Vive en el detalle de persona. Ver `personas/FLUJOS.md`.

## Pantalla: Rojo de la oficina (mejora 6-7)
- Lista de créditos con margen negativo o comprimido
- Alerta antes de que pase, no al cierre
- Es la señal para recolocar el dinero del inversionista

## Pantalla: Rentabilidad por referenciador (mejora 8)
Cuánto capital trajo cada uno, cuánto ha cobrado, cuánto generó.
Es la que le dice a Carlos si el 0.5% le sale rentable.

## Responsive 375px
La lista de pendientes se vuelve tarjetas con checkbox. El total seleccionado
queda fijo abajo — es el dato que Carlos mira mientras elige.
