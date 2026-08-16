# Flujos y pantallas — personas

> Se lee junto con `DISENO.md` en tareas de tipo `ui`.

## Pantalla: Lista de personas

- **Filtro principal (pestañas):** Todos · Inversionistas · Referenciadores · Clientes
- **Columnas:** Nombre completo · Roles (badges) · Teléfono · Capital colocado · Se le debe
- **Orden por defecto:** se le debe, descendente — lo urgente arriba
- **Búsqueda:** nombre o teléfono
- **Acciones por fila:** ver detalle
- **Estado vacío:** "Aún no hay personas registradas. Empieza dando de alta la primera."

Los badges de rol son lo que hace visible que alguien es dos cosas a la vez.

## Pantalla: Detalle de persona

```
JUAN PÉREZ                          [inversionista] [referenciador]

  Capital colocado                                   $500,000
  Se le debe                                          $12,500
  Ha ganado en total                                 $145,000

  MOVIMIENTOS
  Fecha    Concepto      De dónde viene        Se generó   Se pagó   Comprobante
  08/2026  Rendimiento   Su aportación #12      10,000        —          —
  08/2026  Comisión      Aportación de Ana       2,500        —          —
  07/2026  Rendimiento   Su aportación #12      10,000    10,000       [ver]
  07/2026  Comisión      Aportación de Ana       2,500     2,500       [ver]
```

- Cada pago pagado muestra **quién autorizó**, cuándo, y su **comprobante en PDF**
  que se puede abrir desde ahí
- Los tres totales de arriba son la respuesta a "¿cuánto le debo?" sin tener que
  reconstruir nada
- Pestañas secundarias: Aportaciones · A quién trajo · Documentos

## Pantalla: Alta de persona

| Campo | Tipo | Validación | Error (español) |
|---|---|---|---|
| Nombre | texto | requerido | "El nombre es obligatorio" |
| Apellido paterno | texto | requerido | "El apellido paterno es obligatorio" |
| Apellido materno | texto | opcional | — |
| Teléfono | texto | requerido, 10 dígitos | "El teléfono debe tener 10 dígitos" |
| Correo | email | formato | "El correo no tiene un formato válido" |
| Dirección | texto largo | requerido | "La dirección es obligatoria" |
| INE | PDF | requerido, solo PDF | "Solo se aceptan archivos PDF" |

**Drag-and-drop del INE:** zona visible con borde punteado, estado de arrastre,
barra de progreso, y una vez subido el nombre del archivo con opción de ver o
reemplazar. También clickeable — no todos arrastran.

Si el teléfono ya existe (P1), no da error: **ofrece abrir esa persona**.
Probablemente es la misma y solo hay que activarle un rol.

## Pantalla: Alta de aportación

- Monto, fecha, tasa del inversionista
- **"¿Alguien trajo esta aportación?"** — buscador de personas existentes, opcional
- Si se selecciona a alguien: aparece el campo de tasa del referenciador
- Si no: se guarda sin referenciador y se acabó

El texto de ese campo importa. No es "Referenciador" a secas: la pregunta deja
claro que es una decisión que se toma en cada aportación (P6), no algo heredado.

## Conectar referenciador
No hay pantalla propia. Vive dentro del alta de aportación y del alta de cliente.
El buscador solo muestra personas que ya existen (P5) y excluye a la persona misma
(P7).

## Navegación
Lista → Detalle → pestañas.
Alta de aportación se llega desde el detalle del inversionista.

## Responsive (375px)
- La tabla de movimientos se vuelve tarjetas apiladas
- Los tres totales pasan a una fila de tres columnas compactas
- La zona de drag-and-drop se vuelve botón de "Subir INE" — en móvil nadie arrastra
