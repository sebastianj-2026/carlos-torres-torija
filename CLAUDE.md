# Carlos Torres Torija — CLAUDE.md

> Este archivo es un **router**, no un manual. ~150 líneas, máximo.
> Si crece, es que algo que debía vivir en `docs/` se metió aquí.
> Metodología: v0.1.0 · Perfil: frontback-drizzle (con overrides — ver `gate.sh`)

## Qué es esto en una línea
Sistema de gestión financiera (préstamos, inversionistas, ingresos/egresos,
tesorería, nómina) para la oficina de Carlos Torres Torija.

## Stack
- **Frontend:** React 19 + CRA/CRACO + TypeScript 4.9 + Tailwind + react-router 7 + recharts. Deploy: Vercel.
- **Backend:** Express 5 + ts-node + `pg` (SQL crudo, sin ORM) + JWT/bcrypt. Deploy: Railway.
- **DB:** PostgreSQL (Neon). Migraciones SQL planas en `database/`, aplicadas **a mano**.

---

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)

## Style Guidelines

1. **Modo Minimalista Técnico:** Respuestas directas, sin saludos ni conclusiones. Ve al grano.
2. **Prioridad de Código:** Entrega solo el código o el diff si la solución es evidente.
3. **Excepción de Comandos Manuales:** Si la solución requiere una acción manual (comandos de consola, terminal, configuraciones de OS, migraciones o instalaciones), DEBES dar las instrucciones paso a paso de forma obligatoria y clara. No omitas pasos críticos de terminal.
4. **Validación por Grafo:** Consulta siempre `graphify-out/graph.json` antes de sugerir cambios para evitar efectos colaterales en el Nodo Dios (`useAuth`).
5. **Idioma:** Explicaciones técnicas breves en español, código y comentarios en inglés.

---

## 📍 Qué leer según la tarea

| Si la tarea es… | Lee | NO abras |
|---|---|---|
| UI, componente, pantalla | `docs/DISENO.md` + `docs/modulos/<X>/FLUJOS.md` | REGLAS, DATOS |
| Lógica de negocio | `docs/modulos/<X>/REGLAS.md` + `MODULO.md` | DISENO |
| Motor de cálculo | `REGLAS.md` + `CASOS-RESUELTOS.md` | DISENO, FLUJOS |
| Migración, schema | `docs/modulos/<X>/DATOS.md` | DISENO, FLUJOS |
| Verificar | `docs/DEFINICION-DE-HECHO.md` | todo lo demás |
| Arrancar el día | `docs/ESTADO.md` + `docs/BACKLOG.md` | todo lo demás |

**Regla dura:** si un archivo no está en tu fila, no lo abras.
Si crees que lo necesitas, **pregunta antes**. Que lo necesites suele significar
que la tarea está mal clasificada.

---

## 🚫 Prohibiciones

1. **Una tarea = una sesión.** No encadenes tareas en la misma conversación.
2. **No toques `components/shared/` dentro de una tarea de módulo.** Cambiar un
   componente compartido es tarea propia, porque afecta a todos los módulos.
3. **No inventes reglas de negocio.** Si `REGLAS.md` no lo dice, **para y
   pregunta**. Una regla inventada que funciona es peor que un error visible.
4. **No corras deploy.** Nunca. El gate llega a "listo para deploy" y ahí para.
5. **No cierres una tarea con el gate rojo.**

---

## Módulos
Ver `docs/ESTADO.md` — es la fuente de verdad del estado, no este archivo.
Especificados: `personas`, `comisiones`. Documentado (legacy): `dashboard`.

## Convenciones
- Código y comentarios en inglés; UI y explicaciones en español.
- Dinero: debe ser `numeric` en DB. **Deuda activa:** el backend usa `parseFloat`
  en todos los controllers (ver `docs/ESTADO.md`).
- Fechas las genera el servidor (`now()`/`current_date`), nunca el cliente.
- Nada se borra: archivado con bandera.
