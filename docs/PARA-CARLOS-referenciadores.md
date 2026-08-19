# Para Carlos — 3 preguntas que desbloquean el motor de comisiones

> Hoja para la junta. No es técnica: son tres decisiones de negocio.
> Sin ellas, cualquier cosa que programemos sería una regla **inventada** — y una
> regla inventada que corre sin error es el peor resultado posible: se descubre
> meses después, cuando alguien reclama su dinero.
>
> Las 3 respuestas desbloquean 9 tareas.

---

## ⛔ 1 · Cuando no alcanza en el mes, ¿quién cobra primero?

Llega menos dinero del que se debe repartir ese mes.

| Opción | Qué pasa |
|---|---|
| **A. Inversionista primero** | Se le paga completo al inversionista; al referenciador lo que sobre |
| **B. Prorrata** | Los dos cobran el mismo porcentaje de lo suyo |

**Ejemplo.** Se deben $10,000 al inversionista y $2,000 al referenciador.
Entraron $6,000.

- Con A: inversionista $6,000 · referenciador $0
- Con B: inversionista $5,000 · referenciador $1,000

**Lo que asumimos:** A (inversionista primero).
**Respuesta de Carlos:** ______________________

---

## ⛔ 2 · Cuando la oficina queda en rojo, ¿absorbe o devenga?

Las comisiones del mes salen más caras que lo que se cobró.

| Opción | Qué pasa |
|---|---|
| **A. Absorbe** | Se paga todo completo. La oficina pone la diferencia de su bolsa |
| **B. Devenga** | Se paga hasta donde alcanzó. El resto queda como deuda y se paga cuando entre dinero |

**Ejemplo.** Se cobraron $8,000. Entre rendimiento y comisiones se deben $9,500.

- Con A: se pagan los $9,500 y la oficina pierde $1,500 ese mes
- Con B: se pagan $8,000 y quedan $1,500 acumulados para el siguiente

**Lo que asumimos:** B (devenga), por coherencia con la regla de que lo que no se
cobró se acumula y se paga después.
**Respuesta de Carlos:** ______________________

---

## ⛔ 3 · El centavo del redondeo, ¿de quién es?

Al repartir, casi nunca cierra exacto. Alguien se queda con el centavo que sobra.

| Opción | Qué pasa |
|---|---|
| **A. La oficina** | El residuo siempre queda del lado de la oficina |
| **B. El inversionista** | El residuo se le da al inversionista |
| **C. Otro criterio** | ______________________ |

También hay que fijar **a cuántos decimales**: normalmente 2 (centavos).

**Por qué importa.** Sin un dueño fijo del residuo, la suma de las partes deja de
cuadrar con el total cobrado. El estado de cuenta diría $12,499.99 donde el
reparto dice $12,500.00 — y esa diferencia se acumula mes con mes.

**Lo que asumimos:** 2 decimales, residuo a la oficina.
**Respuesta de Carlos:** ______________________

---

## Después de la junta

1. Escribir las respuestas en `docs/modulos/comisiones-motor/REGLAS.md`,
   reemplazando las tres marcas sin definir por la regla ya decidida.
2. Cambiar el estado de M12–M20 de 🚫 a ⬜ en `docs/BACKLOG.md`.
3. Anotar la fecha y la decisión en `docs/ESTADO.md` › Decisiones de arquitectura.
