# Reglas de negocio — personas

> **Archivo sagrado.** Baja rotación. Solo se abre en tareas `logic` o `motor`.
> Para marcar un hueco usa la frase de bloqueo indicada en la plantilla.

## Nomenclatura — fijada, no negociable

| Término | Significa |
|---|---|
| **referenciador** | el que trae |
| **referido** | el que fue traído |

En schema, código y UI siempre `referenciador_id`. **Nunca** `referido_por` en
unas tablas y otra cosa en otras. Se confunden solos a las tres semanas.

---

## P1 · Persona única
Una fila por ser humano. Se identifica por nombre completo + teléfono.
No se crean dos personas para la misma persona con roles distintos.

## P2 · Roles simultáneos
Una persona puede tener los tres roles al mismo tiempo: inversionista, cliente,
referenciador. Ejemplo real: alguien invierte su dinero y además trae a un amigo
a invertir.

## P3 · Datos obligatorios
Nombre, apellidos, dirección, teléfono, correo, INE en PDF.
El INE es **un solo archivo PDF**, drag-and-drop. No se valida su autenticidad,
solo se guarda y se puede abrir después.

## P4 · Rol de inversionista
Se activa con una **aportación**: monto y fecha. Puede meter más aportaciones
después, cuantas quiera. Cada aportación es una fila independiente.

## P5 · Rol de referenciador — solo se conecta
Un referenciador **no se da de alta suelto**. Se conecta al momento de dar de
alta al cliente o al inversionista que trajo. La persona ya tiene que existir
en el sistema.

## P6 · La comisión se liga por aportación, y es opcional
Cada aportación puede llevar referenciador o no. **La oficina decide en cada
aportación.** No se hereda: si un inversionista referido mete más dinero por su
cuenta, el referenciador original no cobra sobre eso a menos que la oficina lo
ligue explícitamente.

Campo `referenciador_id` en `aportaciones`, **nullable**.

## P7 · Un solo nivel — sin cascada
Si A trae a B y B trae a C, la comisión por C es **de B**, no de A.
Cada quien cobra solo por la gente que trajo directamente.

**Nadie cobra por un referido de su referido.** Esto es un invariante
verificable, no una recomendación (ver `CASOS-RESUELTOS.md`).

## P8 · Nadie se borra
Personas y aportaciones se archivan con bandera, nunca `DELETE`. Un
referenciador que se retira cambia de estado; sus devengos históricos no se tocan.

## P9 · Sucesión — decisión de la oficina
Si un referenciador fallece o se retira, qué pasa con su comisión lo decide la
oficina y se captura como cambio de estado. **El sistema no tiene regla propia.**

---

## Prohibido inventar
Si una situación no está cubierta arriba: **para y pregunta.**
No elijas la interpretación razonable. En este dominio, una regla inventada que
corre sin error es el peor resultado posible: se descubre meses después, cuando
alguien reclama su dinero.
