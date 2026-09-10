# Carlos Torres Torija — CLAUDE.md

> Este archivo es un **router**, no un manual. ~150 líneas, máximo.
> Si crece, es que algo que debía vivir en `docs/` se metió aquí.
> Metodología: v0.1.0 · Perfil: frontback-drizzle (con overrides — ver `gate.sh`)

## Qué es esto en una línea
Sistema de gestión financiera (préstamos, inversionistas, ingresos/egresos,
tesorería, nómina, juicios) para la oficina de Carlos Torres Torija.
**Aún en desarrollo — no hay producción.** La DB (Neon) es de desarrollo, con
datos demo del seed; se puede crear dato de prueba sin miedo. El rigor de las
reglas se mantiene: el destino del sistema es manejar dinero de gente real.

## Release en curso
**Referenciadores** — rama `rediseno-referidor-inversionista`.
20 modificaciones en `docs/BACKLOG.md` (M1–M20). Bloque A arranca ya; Bloques B y
C están bloqueados por 3 reglas que faltan de Carlos.

## Stack
- **Frontend:** React 19 + CRA/CRACO + TypeScript 4.9 + Tailwind + react-router 7 + recharts. Deploy: Vercel.
- **Backend:** Express 5 + ts-node + `pg` (SQL crudo, sin ORM) + JWT/bcrypt. Deploy: Railway.
- **DB:** PostgreSQL (Neon). Migraciones SQL planas en `database/`, aplicadas **a mano** vía `scripts/apply-migration.js`.

---

## 🚀 Cómo arrancar una sesión

1. Lee `docs/ESTADO.md` — dónde está el proyecto y qué está bloqueado.
2. Lee `docs/BACKLOG.md` — toma **la primera tarea ⬜** del Bloque A, en orden.
3. Abre **solo** los archivos que la tarea dice en su campo `Lee:`.
4. Trabaja esa tarea. Corre `./gate.sh`. Para. Espera a Sebastian.

**No leas nada más para empezar.** Si crees que necesitas otro archivo,
pregunta antes: casi siempre significa que la tarea está mal clasificada.

---

## 📍 Qué leer según la tarea

| Si la tarea es… | Lee | NO abras |
|---|---|---|
| UI, componente, pantalla | `docs/DISENO.md` + `docs/modulos/<X>/FLUJOS.md` | REGLAS, DATOS |
| Lógica de negocio | `docs/modulos/<X>/REGLAS.md` + `MODULO.md` | DISENO |
| Motor de cálculo | `docs/modulos/comisiones-motor/REGLAS.md` + `CASOS-RESUELTOS.md` | DISENO, FLUJOS |
| Migración, schema | `docs/modulos/<X>/DATOS.md` | DISENO, FLUJOS |
| Verificar | `docs/DEFINICION-DE-HECHO.md` | todo lo demás |
| Arrancar el día | `docs/ESTADO.md` + `docs/BACKLOG.md` | todo lo demás |
| Entender **por qué** de una M | `docs/modulos/inversionistas/MODIFICACIONES.md` | — |

**Regla dura:** si un archivo no está en tu fila, no lo abras.

---

## 🚫 Prohibiciones

1. **Una tarea = una sesión.** No encadenes tareas en la misma conversación.
2. **No toques `components/shared/` dentro de una tarea de módulo.** Cambiar un
   componente compartido es tarea propia — afecta a todos los módulos.
3. **No inventes reglas de negocio.** Si `REGLAS.md` no lo dice, **para y
   pregunta**. Una regla inventada que corre sin error es el peor resultado
   posible: se descubre meses después, cuando alguien reclama su dinero.
4. **No arranques una tarea 🚫.** Están bloqueadas a propósito.
5. **No corras deploy.** Nunca. El gate llega a "listo para deploy" y ahí para.
6. **No cierres una tarea con el gate rojo.**
7. **No apliques migraciones a Neon.** Las escribes con su `.down.sql` y
   documentas el comando; **las aplica Sebastian, a mano**.
8. **No borres nada de `_to_delete/`.** Es la carpeta de descarte, la vacía
   Sebastian.

---

## Módulos

`docs/ESTADO.md` es la fuente de verdad del estado, no este archivo.

| Módulo | Estado | Docs |
|---|---|---|
| **inversionistas / referenciadores** | 🟡 activo — Bloque A | `docs/modulos/inversionistas/` |
| **comisiones-motor** | 🚫 bloqueado — 3 reglas sin definir | `docs/modulos/comisiones-motor/` |
| dashboard | ✅ legacy documentado | `docs/modulos/dashboard/` |

**Las reglas están partidas a propósito.** `inversionistas/REGLAS.md` tiene la
**estructura** (P1–P7) y está completa. `comisiones-motor/REGLAS.md` tiene el
**cálculo** (R1–R21) y sus 3 ⛔. El Bloque A no depende de ninguna R: si estás en
una tarea del Bloque A y sientes que necesitas abrir el archivo del motor,
**para y pregunta** — la tarea está mal clasificada.

⚠️ **`personas` y `comisiones` fueron descartados el 2026-08-19.** Sus docs viven
en `_to_delete/`. Queda código huérfano de esos módulos en el backend — está
inventariado en `docs/ESTADO.md` › Código huérfano. **No lo borres**: `reparto.ts`
y `fifo.ts` son la referencia viva del algoritmo para M13–M15.

---

## Convenciones

- Código y comentarios en **inglés**; UI y explicaciones en **español**.
- Dinero: `NUMERIC` en DB. **Deuda activa:** el backend usa `parseFloat` en todos
  los controllers. En **código nuevo**, montos como string + `Decimal`.
- **Tasas: porcentaje con 2 decimales.** `0.50` = 0.5%, `monto = base * tasa / 100`.
  ⚠️ Hasta que corra M11, `tasa_referenciador` todavía está en la escala vieja
  (`NUMERIC(6,4)`). Ojo al leerla.
- Fechas las genera el servidor (`now()` / `current_date`), nunca el cliente.
- **Nada se borra.** Archivado con bandera de estado.
- Toda migración trae su `.down.sql`.
- API: `{ success, data, error }`. Errores con mensaje en español.

---

## graphify

Hay un grafo de conocimiento en `graphify-out/`.

- Antes de responder preguntas de arquitectura, lee `graphify-out/GRAPH_REPORT.md`.
- Si existe `graphify-out/wiki/index.md`, navégalo en vez de leer archivos crudos.
- Consulta `graphify-out/graph.json` antes de sugerir cambios, para no romper el
  nodo dios (`useAuth`).
- Después de modificar código, corre `graphify update .`.

## Estilo de respuesta

1. **Minimalista técnico.** Sin saludos ni conclusiones. Al grano.
2. Entrega el código o el diff si la solución es evidente.
3. **Excepción:** si hace falta una acción manual (terminal, migración,
   configuración de OS), da las instrucciones paso a paso, completas. No omitas
   pasos críticos.
4. Explicaciones técnicas breves en español; código y comentarios en inglés.
