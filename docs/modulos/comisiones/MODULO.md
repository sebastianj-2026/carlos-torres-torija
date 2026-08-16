# Módulo: comisiones

## Qué resuelve
Calcular, acumular y pagar lo que la oficina le debe a inversionistas
(rendimiento) y a referenciadores (comisión), mes a mes.

## ✅ ESTADO: spec completa
Las 3 reglas se cerraron con Carlos el 2026-08-16 (R21/R22/R23 en `REGLAS.md`).
**Dependencia dura:** el schema referencia tablas de `personas` (aún NO
implementado). Las tareas `data`/`logic` esperan a `personas`; el motor de
cálculo (tests + reparto) no depende de la DB y puede arrancar ya.

## Entidades

| Entidad | Qué representa | Tabla |
|---|---|---|
| Devengo | lo que se generó a favor de alguien en un periodo | `devengos` |
| Pago | dinero que efectivamente salió, con autorización | `pagos` |
| Aplicación | qué devengo cubrió qué pago | `pago_aplicaciones` |

## Por qué existe `devengos`
Sin ella "lo acumulado" sería un cálculo al vuelo y el FIFO sería imposible de
auditar. Con ella, "¿cuánto le debo?" es una suma, no una reconstrucción.

## Endpoints

| Método | Ruta | Qué hace |
|---|---|---|
| POST | `/cortes/:periodo` | genera devengos del periodo (idempotente) |
| GET | `/devengos?persona_id=` | estado de cuenta |
| GET | `/pagos/pendientes` | qué se debe y cuánto hay disponible |
| POST | `/pagos` | registra pago con autorización y comprobante |

## Depende de
`personas` (aportaciones, tasas, referenciadores) y `prestamos` (lo cobrado).

## Qué NO hace

- **No decide a quién pagar cuando no alcanza.** Presenta y Carlos elige (R14).
- **No reparte moratorios.** Son 100% oficina (R8).
- **No fuerza el margen a cero.** Si la oficina sale en rojo, lo muestra (mejora 6).
- **No cruza orígenes.** Lo que entra de un préstamo solo paga lo de ese préstamo (R16).
