# Correcciones — Carlos Torres Torija

> No es un diario. Es una banda transportadora con tres destinos.
> Una corrección que se queda en prosa se olvida. Una que se vuelve comando
> no vuelve a pasar nunca.

## Escalera de ascenso

| Veces | Destino | Símbolo |
|---|---|---|
| 1 | se anota, nada más | 👀 |
| 2 | sube a `REGLAS.md` / `DISENO.md` como prohibición explícita | 🔒 |
| 3 | se vuelve check ejecutable: lint rule, test, o `base/checks/` | ⚙️ |
| **en 2 proyectos distintos** | **sube a `metodologia/` — lo heredan todos** | 🌎 |

Ese último piso es el que convierte experiencia en activo. Sin él, descubres el
mismo patrón cuatro veces y lo pagas cuatro veces.

## Registro

| # | Fecha | Qué hizo mal | Veces | Estado | Dónde quedó |
|---|---|---|---|---|---|
| C-01 | 2026-08-19 | El check `reglas de negocio definidas` usaba `grep -r` crudo sobre `docs/`: matcheaba la **prosa** que describe el criterio, no solo la marca. `DEFINICION-DE-LISTO.md` —que la metodología entrega a todo proyecto— disparaba el check contra sí misma. Gate rojo desde el día uno, sin una sola regla pendiente. | 1 | 🌎 | `gate.base.sh` v0.1.1: el marcador solo cuenta como **encabezado** |
| C-02 | 2026-08-19 | El mismo check barría **todo** `docs/`, así que un módulo detenido por regla sin definir congelaba el repo entero — ninguna tarea de ningún otro módulo podía cerrar en verde. Contradice la propia metodología: *"un módulo bloqueado se detiene"*, no el proyecto. | 1 | 🌎 | `gate.base.sh` v0.1.1: si hay `GATE_MODULO`, el barrido se limita a ese módulo |

> Las dos subieron directo al piso 🌎 sin pasar por 🔒 ni ⚙️: no son un error de
> criterio de Claude, son defectos del check heredado. Se descubrieron intentando
> cerrar M1 con el Bloque B/C bloqueado. Cualquier proyecto que adopte la
> metodología los hereda, así que arreglarlos abajo era pagarlos una sola vez.
