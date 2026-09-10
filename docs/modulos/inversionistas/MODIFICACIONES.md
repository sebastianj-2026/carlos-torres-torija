# Lista de modificaciones — referenciadores

> **Corrección de alcance.** La versión anterior creaba módulos `personas` y
> `comisiones` paralelos. Eso estaba mal: el módulo de inversionistas ya existe
> y se **extiende**. Los docs de `personas/` se descartan.

## Lo que ya estaba hecho y no sabía

`inversiones` ya tiene `referenciador_id`, `tasa_referenciador`, el CHECK de
auto-referencia y el de coherencia de tasa — con su `.down.sql`. La mitad del
referenciador de inversión ya existe.

Lo que falta: referenciador de **préstamos**, referenciadores **sin capital**, y
todo el cálculo.

---

## Módulo inversionistas / referenciadores

| # | Qué | Tipo | Riesgo |
|---|---|---|---|
| **M1** | Tabla `referenciadores` — persona sin capital, con `inversionista_id` nullable para la forma 2 | data | bajo |
| **M2** | Tabla `referencias` — la relación. Unifica referido de inversión y de préstamo. Migra lo que hay en `inversiones.referenciador_id` | data | **medio, datos vivos** |
| **M3** | Alta y edición de referenciador (reusa el formulario de inversionista) | logic | bajo |
| **M4** | Ligar referenciador al crear inversión o préstamo. Buscador, opcional | logic | bajo |
| **M5** | Lista con filtro de **tres formas de ganar** | ui | bajo |
| **M6** | Columnas de deuda: se le debe, va al corriente | ui | bajo |
| **M7** | Detalle con desglose: a qué está ligado, %, fecha, devengado, pagado | ui | bajo |
| **M8** | Alerta de inversión activa sin préstamo ligado | ui | bajo |
| **M9** | `numero_cuenta` y `banco` opcionales en inversionistas | data | bajo |
| **M10** | Quitar `asignado_a` (es de otro sistema) | data | bajo |
| **M11** | Unificar escala de tasas a porcentaje con 2 decimales | data | **medio, convierte datos** |

## Motor de comisiones — 🚫 BLOQUEADO

| # | Qué | Tipo |
|---|---|---|
| **M12** | Tabla `devengos` con índice de idempotencia | data |
| **M13** | Generación mensual de devengos, idempotente | motor |
| **M14** | Cálculo de comisión sobre capital vigente (base viva) | motor |
| **M15** | Aplicación FIFO **por origen** | motor |
| **M16** | Lectura de montos con Decimal, sin `parseFloat` | logic |

## Cuentas por pagar inversionistas — 🚫 BLOQUEADO

| # | Qué | Tipo |
|---|---|---|
| **M17** | Aceptar concepto `comision` además de `rendimiento` | logic |
| **M18** | Pantalla de pendientes: Carlos selecciona, el sistema no decide | ui |
| **M19** | Registrar pago: forma, cuenta, comprobante, autorización | logic |
| **M20** | Filtro inversionistas / referenciadores (al final del módulo) | ui |

**M12–M20 no arrancan** hasta cerrar los 3 ⛔ con Carlos.

---

## Los 3 ⛔ pendientes

1. **Orden dentro del mismo mes** — ¿inversionista primero o prorrata?
2. **Oficina en rojo** — ¿absorbe o devenga?
3. **Redondeo** — ¿decimales y dueño del residuo?

Ver `docs/PARA-CARLOS-referenciadores.md`.

---

## Decisiones de diseño que vale la pena entender

### Nadie se muda de tabla
Si un referenciador puro aporta capital, **no se mueve** a `inversionistas`:
conserva su fila y gana una nueva. El campo `inversionista_id` las liga.

Mover la persona rompería el histórico —sus comisiones apuntarían a un id que ya
no existe— y copiarla haría que su teléfono divergiera entre las dos tablas.
El front la muestra en ambas listas; el filtro hace el trabajo.

### `referencias` reemplaza a `inversiones.referenciador_id`
La columna vieja solo cubre inversiones y exige que el referenciador tenga
capital. `referencias` cubre los dos tipos y admite referenciadores puros.
La columna vieja **no se borra en la misma migración**: se deprecia y se quita
cuando el código ya no la lea.

### `devengos` es tabla nueva, no extensión de `historial_inversiones`
`historial_inversiones` registra lo que **se pagó**. `devengos` registra lo que
**se generó aunque no se pagara**. Mezclarlos rompe lo que hoy funciona en
producción.

### Escalas de tasa unificadas
`tasa_interes_mensual` era `NUMERIC(5,2)` (2.00 = 2%) y `tasa_referenciador` era
`NUMERIC(6,4)` (0.0050 = 0.5%). **Dos escalas en la misma tabla** es un bug
esperando. Todo pasa a porcentaje con 2 decimales.

### Decimal en el motor
`parseFloat` sobre `NUMERIC` convierte un decimal exacto en float binario:
`0.1 + 0.2 = 0.30000000000000004`. En un saldo que se muestra da igual; en
comisiones que se acumulan mes a mes, los residuos se suman y la invarianza de
suma deja de cerrar. Los montos se leen como string y se operan con Decimal.
No hay que arreglar el sistema entero — sí lo nuevo.

---

## Orden sugerido

```
Desbloqueado hoy:  M1 → M2 → M9 → M10 → M11 → M3 → M4 → M5 → M6 → M7 → M8
Tras respuestas:   M12 → M13 → M14 → M15 → M16 → M17 → M19 → M18 → M20
```

M2 y M11 tocan datos vivos: respaldo antes, verificación de conteos después.
