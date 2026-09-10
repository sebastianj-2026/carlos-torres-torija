# Flujos — inversionistas y referenciadores

> Pantallas: columnas, filtros y acciones **enumeradas**.
> Se abre en tareas `ui`, junto con `docs/DISENO.md`. **No** abrir `REGLAS.md`
> ni `DATOS.md` en una tarea de UI. Las R que se citan (R14, R15, R16, R19) son
> del módulo `comisiones-motor`, que está 🚫 — aquí solo explican por qué la
> pantalla se ve así.
> Breakpoints verificados: 375 / 768 / 1440. Cero scroll horizontal, cero error
> en consola, en las tres.

---

## 1 · Lista de referenciadores (M5, M6)

**Filtro principal — las tres formas de ganar.** Es lo primero que se ve, no un
filtro escondido en un menú.

```
[ Todos ] [ Solo inversionista ] [ Inversionista y referenciador ] [ Solo referenciador ]
```

Se resuelve con `referenciadores.inversionista_id`: NULL → forma 3, lleno →
forma 2. Los de forma 1 salen de `inversionistas` sin fila en `referenciadores`.

**Columnas**

| Columna | De dónde |
|---|---|
| Nombre | `nombres + apellido_paterno + apellido_materno` |
| Forma | badge derivado del filtro de arriba |
| Teléfono | `telefono` |
| Referidos activos | conteo de `referencias` con `estado='activa'` |
| Se le debe | Σ `devengado − pagado` (M6) |
| Al corriente | ✅ / ⚠️ según haya devengos pendientes (M6) |
| Estado | activo / inactivo (P6) |

**Orden por defecto:** *se le debe* descendente. Lo que urge, arriba.

**Acciones:** nuevo referenciador · abrir detalle · dar de baja (cambia estado,
nunca `DELETE`).

**Mientras M12 esté bloqueada:** las dos columnas de dinero muestran `—` con
tooltip *"pendiente de habilitar el motor de comisiones"*. No ceros falsos.

**En 375px:** la tabla se vuelve tarjetas. Nombre + badge de forma arriba, *se le
debe* como cifra grande, el resto en dos líneas. Cero scroll horizontal.

---

## 2 · Alta y edición de referenciador (M3)

Reusa el formulario de inversionista. **No se duplica el componente.**

**Campos** (P5): nombres · apellido paterno · apellido materno · dirección ·
teléfono · correo · INE en PDF (drag-and-drop, `FileDropZone`) ·
**número de cuenta y banco — opcionales**.

**Validaciones**

- Nombres y apellido paterno obligatorios.
- INE: solo PDF. Se rechaza antes de subir, no después.
- Número de cuenta y banco nunca bloquean el guardado.

**En 375px:** la zona de arrastre se vuelve botón.

---

## 3 · Ligar referenciador (M4)

Vive **dentro** del alta/edición de una inversión y de un préstamo. No es
pantalla propia.

- Buscador con autocompletar sobre `referenciadores` activos.
- Campo **tasa** obligatorio si se eligió referenciador; deshabilitado si no
  (constraint `ref_tasa_coherente`).
- Tasa en **porcentaje con 2 decimales** — `0.50` se lee como 0.5%. La etiqueta
  del campo dice `%` para que nadie capture `0.005`.
- **Es opcional y no se hereda** (P4): si el mismo inversionista mete otra
  inversión, el campo llega vacío. No se precarga con el referenciador anterior.
- No se puede elegir a la misma persona que el referido (`no_auto_referencia`) —
  se filtra del buscador, no se deja fallar en el servidor.

---

## 4 · Detalle de referenciador (M7)

**Encabezado:** nombre · badge de forma · estado · teléfono · cuenta y banco si
los tiene (para tenerlos a la mano al pagar).

**Tres totales arriba:** devengado · pagado · se le debe.

**Desglose — una fila por origen, nunca agregado por persona** (R16):

| A qué está ligado | Tipo | % | Desde | Devengado | Pagado | Se le debe |
|---|---|---|---|---|---|---|
| Inversión de Ana G. | inversión | 0.50 | 2026-03-01 | … | … | … |
| Préstamo de Beto R. | préstamo | 0.75 | 2026-05-14 | … | … | … |

Cada fila es su propia línea de FIFO. Se ve por qué el dinero de un origen no
cubre lo de otro.

**Acciones:** editar · dar de baja · abrir la inversión/préstamo ligado.

**No hay botón de pagar aquí.** El pago vive en cuentas por pagar.

---

## 5 · Alerta de inversión sin préstamo ligado (M8) — ❌ descartada

**Descartada el 2026-09-09 (Sebastian).** La liga se hace desde **préstamos** al
crear el préstamo (`participantes_prestamo`, por inversionista); no existe liga
por inversión en el schema y no hay inversiones "no ligadas" que detectar. No se
implementa.

---

## 6 · Pendientes de pago (M18) — 🚫 bloqueada

Vive en **cuentas por pagar inversionistas**, no aquí. Se documenta el criterio
para que no se implemente mal cuando se desbloquee:

- **Carlos selecciona, el sistema no decide** (R14). Checkbox por línea.
- Dentro de la línea el periodo **no se elige**: FIFO forzado, más viejo primero
  (R15).
- Total seleccionado y *quedaría* se recalculan en vivo, en centavos enteros —
  sin float en la UI.
- Pide forma de pago, cuenta, comprobante y **quién autorizó** antes de permitir
  guardar (R19).
- En 375px: tarjetas con la barra de total fija abajo.

---

## Prohibiciones de UI

- ❌ Componente nuevo sin buscar antes en `components/shared/`.
- ❌ Tocar `components/shared/` dentro de una tarea de módulo — es tarea propia.
- ❌ Mostrar un número de dinero que el backend no calculó. Si el motor no existe,
  se muestra `—`, no `0.00`.
- ❌ Iconos fuera de `lucide-react`.
