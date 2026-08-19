# Reglas de negocio — inversionistas y referenciadores

> **Archivo sagrado.** Baja rotación. Solo se abre en tareas `logic` o `motor`.
> **Alcance: estructura.** Quién es quién, cómo se ligan, qué datos lleva cada uno.
> El **cálculo** de comisiones NO vive aquí: está en
> `docs/modulos/comisiones-motor/REGLAS.md`, y ese módulo está 🚫 bloqueado.
>
> ✅ Este archivo está **completo**. No tiene reglas sin definir.

## Nomenclatura — fijada
**referenciador** = el que trae · **referido** = el que fue traído.
En schema, código y UI siempre `referenciador_id`. Nunca otra variante.

---

## Estructura

### P1 · Tres formas de ganar
```
1. Solo inversionista            → capital, sin referir
2. Inversionista y referenciador → capital + refiere
3. Solo referenciador            → refiere sin capital
```
El front las filtra. **Nadie se muda de tabla.** Un referenciador que aporta
capital conserva su fila en `referenciadores` y gana una en `inversionistas`.

### P2 · Dos tipos de referido
| Trae a | Base de su comisión |
|---|---|
| un inversionista | el capital de la inversión que trajo |
| un cliente | el monto vigente del préstamo que trajo |

### P3 · Un solo nivel — sin cascada
Si A trae a B y B trae a C, la comisión por C es **de B**. A no cobra nada.
Una inversión o préstamo tiene **un** referenciador (UNIQUE en `referencias`).

Sin esta regla el esquema se vuelve piramidal.

### P4 · La comisión se liga por origen, y es opcional
Cada inversión o préstamo puede llevar referenciador o no. **La oficina decide
en cada uno.** No se hereda: si un inversionista referido mete otra inversión
por su cuenta, el referenciador no cobra sobre esa a menos que se ligue.

### P5 · Datos de la persona
Nombre, apellidos, dirección, teléfono, correo, INE en PDF (drag-and-drop).
**Número de cuenta y banco: opcionales**, para tenerlos a la mano al pagar.

### P6 · Nadie se borra
Bandera de estado, nunca `DELETE`. Un referenciador que se retira cambia estado;
sus devengos históricos no se tocan.

### P7 · Sucesión
Si un referenciador fallece o se retira, qué pasa con su comisión lo decide la
oficina y se captura como cambio de estado. El sistema no tiene regla propia.

---

## Separación de módulos

| Módulo | Qué hace |
|---|---|
| **inversionistas / referenciadores** (este) | registro y consulta. Ve cuánto se le debe, si va al corriente, cuánto se le ha pagado. **Solo lectura de esos números** |
| **comisiones-motor** 🚫 | genera los devengos y los reparte. Bloqueado |
| **cuentas por pagar inversionistas** 🚫 | ejecuta el pago: selección, forma, comprobante, autorización |
| **préstamos** | de ahí se jala el monto para la comisión de referenciador de cliente. Es puro ingreso |

Separado por cuentas que se pagan y cuentas que se cobran.

> Mientras `comisiones-motor` esté bloqueado, este módulo **no muestra números de
> dinero calculados**: muestra `—`. No los inventa ni los pone en cero.

---

## Prohibido inventar
Si una situación no está cubierta arriba: **para y pregunta.**
Una regla inventada que corre sin error es el peor resultado posible: se descubre
meses después, cuando alguien reclama su dinero.
