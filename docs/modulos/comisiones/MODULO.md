# Módulo: comisiones

## Qué resuelve
Calcular, acumular y pagar lo que la oficina le debe a inversionistas
(rendimiento) y a referenciadores (comisión), mes a mes.

## 🚫 ESTADO: BLOQUEADO
Tres reglas de negocio sin definir. Ver `REGLAS.md`.
**Ninguna tarea de este módulo se ejecuta hasta cerrarlas con Carlos.**

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
