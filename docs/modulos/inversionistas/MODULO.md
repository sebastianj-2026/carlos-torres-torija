# Módulo — inversionistas y referenciadores

> Qué hace y qué NO hace. Se abre en tareas `logic`.
> Estructura: `REGLAS.md` (P1–P7, completa). Schema: `DATOS.md`.
> Pantallas: `FLUJOS.md`. Cálculo: `../comisiones-motor/REGLAS.md` (🚫 bloqueado).
> Las R que se citan abajo viven en el archivo del motor — se mencionan como
> contexto, **no se implementan en este módulo**.

## Una línea

Registro y consulta de quién puso capital y de quién trajo a quién, con lo que se
le debe a cada uno. **No paga.** El pago vive en cuentas por pagar.

## Alcance

| Entra | No entra |
|---|---|
| Alta/edición de inversionista | Ejecutar el pago (forma, comprobante, autorización) → cuentas por pagar |
| Alta/edición de referenciador | Cálculo del rendimiento del préstamo → módulo préstamos |
| Ligar referenciador a una inversión o a un préstamo | Cascada multinivel (P3: un solo nivel, nunca) |
| Consultar devengado / pagado / se le debe | Mover una persona de tabla cuando cambia de forma de ganar |
| Alerta de inversión activa sin préstamo ligado | Decidir a quién pagar cuando no alcanza (R14: lo decide la oficina) |

## Entidades que toca

| Tabla | Rol | Estado |
|---|---|---|
| `inversionistas` | persona con capital + wallet | existe, se extiende (M9, M10) |
| `inversiones` | contrato de capital | existe, ya trae `referenciador_id` (se depreca en M2) |
| `referenciadores` | persona que trae, con o sin capital | **nueva** (M1) |
| `referencias` | qué trajo cada quién | **nueva** (M2) |
| `devengos` | lo que se generó aunque no se pagara | **nueva** (M12, bloqueada) |
| `pagos_devengo` + `pago_aplicaciones` | trazabilidad del FIFO | **nuevas** (bloqueadas) |

## Las tres formas de ganar

Es el eje del módulo. Ver P1 en `REGLAS.md`.

```
1. Solo inversionista            → fila en inversionistas
2. Inversionista y referenciador → fila en inversionistas + fila en referenciadores
3. Solo referenciador            → fila en referenciadores (inversionista_id NULL)
```

**Nadie se muda de tabla.** El campo `referenciadores.inversionista_id` liga las
dos filas de la misma persona. El filtro de la lista hace el trabajo.

## Números que expone (solo lectura)

Por persona y **por origen** (R16 — nunca agregados a nivel persona para el FIFO):

- **devengado** — lo que se generó
- **pagado** — lo que ya se cubrió
- **se le debe** — devengado − pagado
- **va al corriente** — sí/no, derivado de si hay devengos `pendiente`/`parcial`

Mientras `devengos` no exista (M12 bloqueada), estas columnas se muestran en cero
con la leyenda *"pendiente de habilitar el motor de comisiones"*. **No se
inventan.**

## Contratos de API

```
GET    /api/referenciadores                 lista con filtro de forma (1|2|3)
POST   /api/referenciadores                 alta
GET    /api/referenciadores/:id             detalle + sus referencias
PATCH  /api/referenciadores/:id             edición (incluye baja por estado, P6)
POST   /api/referencias                     liga referenciador ↔ inversión|préstamo
PATCH  /api/referencias/:id                 cambia estado/tasa (R9)
```

Respuesta `{ success, data, error }`. Errores en español para el usuario final.
Montos como **string** en el JSON — el motor los opera con `Decimal`, nunca
`parseFloat` (M7 de `DATOS.md`).

## Dependencias

- `préstamos` — de ahí sale el monto vigente que sirve de base al referenciador de
  cliente (P2). Solo lectura.
- `cuentas por pagar inversionistas` — consume los devengos pendientes. Es quien
  ejecuta el pago.

## Lo que lo bloquea

M12–M20 no arrancan hasta cerrar los 3 ⛔ de `../comisiones-motor/REGLAS.md` con Carlos.
Ver `docs/PARA-CARLOS-referenciadores.md`.
