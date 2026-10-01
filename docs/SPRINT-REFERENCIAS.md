# SPRINT — Ligado de referenciadores (M46–M54)

> **Para:** Claude Code · **Repo:** `~/Proyectos/carlos torres torija` · **Base:** `main` @ `df7a812`
> **Autor de las decisiones:** Sebastian (2026-09-16)
> **Cómo usar este archivo:** guárdalo en `docs/SPRINT-REFERENCIAS.md`. Cada sesión de Claude Code
> ejecuta **una sola fase o una sola tarea**, en el orden de este documento, y se para al final.
> Si algo de aquí contradice al código real, **el código real manda: para y reporta**, no adivines.

---

## 0. Índice

1. Objetivo del sprint
2. Decisiones de negocio ya tomadas (no se discuten)
3. Reglas que aplican a TODAS las tareas
4. Condiciones de paro (cuándo detenerte y preguntar)
5. Fase 0 — Verificación previa (sin cambios)
6. Fase 1 — Documentación (sin código)
7. Fase 2 — Tareas M46–M53 (una por sesión)
8. M54 — Prueba humana
9. Formato del reporte al cerrar cada sesión
10. Qué queda FUERA de este sprint

---

## 1. Objetivo del sprint

Hoy **no hay forma de ligar un referenciador** a una inversión o a un préstamo desde el sistema:

- `POST /api/referencias` existe, está validado, es solo admin y tiene tests, **pero ningún componente lo llama**.
- `PerfilInversionista.tsx:148-149` sigue mandando `referenciador_id` y `tasa_referenciador`, así que escribe
  `inversiones.referenciador_id`: una columna **deprecada** que apunta a `inversionistas(id)` y que el motor no lee.
- `FormularioPrestamo.tsx` no tiene campo de referenciador.

**Al terminar el sprint:**

1. Un admin puede ligar un referenciador a una inversión (en el alta y en la edición) y a un préstamo
   (en el alta y en la edición). Queda una fila en `referencias`.
2. Ningún camino del sistema vuelve a escribir `inversiones.referenciador_id` ni `inversiones.tasa_referenciador`.
3. Los docs reflejan las decisiones del 2026-09-16 (corte apagado, R25, R26, nómina de 48 h).

**NO es objetivo** calcular ni pagar comisiones: el corte se queda apagado (ver §2 · D1).

---

## 2. Decisiones de negocio ya tomadas

| # | Decisión | Consecuencia para ti |
|---|---|---|
| **D1** | **El corte mensual NO se conecta.** `generarCorte()` se queda escrito y probado, sin disparador. | No crees endpoint, cron, botón ni script que lo llame. No toques `backend/src/modules/motor/`. `devengos` va a seguir en 0 y la pestaña Devengos va a seguir vacía **a propósito**. Las columnas "se le debe" y "al corriente" siguen en `—`. Nada de eso es un bug. |
| **D2** | **El formulario legacy migra a `referencias`.** No se construye el puente `inversionista(id) → referenciadores(id)`. | El frontend deja de mandar `referenciador_id` y `tasa_referenciador` al crear una inversión. El backend deja de aceptarlos (M53). **La columna NO se borra** (eso sería otra tarea `data`, fuera de este sprint). |
| **D3** | **La base de horas semanales de nómina es 48.** | Se corrige el ejemplo C4 de `docs/DINERO.md` (usaba 40). El código **no se toca**: ya usa 48. |
| **D4** | **Préstamo `atrasado` o `en_juicio` SÍ genera comisión.** Confirmado. | Se quita la marca "pendiente de validar con Carlos" de ese criterio. |
| **D5 = R25** | **Lo generado solo se paga cuando el cliente paga.** | Regla nueva (ver abajo). Solo documentación en este sprint. |
| **D6 = R26** | **Un pago mayor a lo pendiente de la línea se rechaza completo.** Si la persona quiere dejar dinero extra, son **dos movimientos**: el pago del devengo y, aparte, una entrada de capital en `movimientos_inversionistas` (si es inversionista). | Confirma el comportamiento actual de `POST /api/pagos-devengo`. **No cambies ese código.** Solo documentación. |

### R25 — texto para `REGLAS.md` (comisiones-motor)

> **R25 · El pago depende del cobro.** Lo generado (rendimiento o comisión) se sigue generando y
> acumulando cada mes aunque el cliente no pague (R11, R13), pero **no se le paga** al inversionista
> ni al referenciador hasta que el cliente pague. Cuando el cliente se pone al corriente o termina el
> juicio, lo pendiente se paga **FIFO**, empezando por el periodo más viejo (R12, R15). Si el cliente
> paga solo una parte, se liberan solo los periodos más viejos que esa parte alcance.
>
> **Ejemplo:** Juan trajo a Ana. Préstamo de Ana con `saldo_pendiente` $200,000.00 y tasa de
> referenciador 0.50 → comisión de **$1,000.00/mes** (200,000 × 0.50 / 100).
> Ana no paga julio, agosto ni septiembre → Juan tiene 3 periodos pendientes = **$3,000.00**, y la
> oficina no le paga nada.
> En octubre Ana paga solo un mes → se libera **julio** ($1,000.00). Agosto y septiembre siguen pendientes.
> En noviembre Ana se pone al corriente → se liberan agosto y septiembre ($2,000.00).

### R26 — texto para `REGLAS.md` (comisiones-motor)

> **R26 · No se paga más de lo pendiente.** Si el monto capturado excede lo pendiente de la línea
> (beneficiario + concepto + origen, R16), el pago **se rechaza completo** con el sobrante exacto en el
> mensaje. No se crea saldo a favor ni se aplica a otra línea. Si la persona deja dinero de más, se
> registran **dos movimientos separados**: (1) el pago del devengo por lo pendiente exacto y (2) una
> entrada de capital en `movimientos_inversionistas`, solo si la persona es inversionista.
>
> **Ejemplo:** a Juan se le deben $2,000.00 por el préstamo de Ana. Se captura $2,500.00 →
> **400**, sobrante $500.00. Se corrige a $2,000.00 y se registra. Si Juan quiere dejar los $500.00
> invertidos y también es inversionista, se capturan como entrada de capital en su perfil.

### Preguntas abiertas (NO se resuelven en este sprint)

Estas dos preguntas **solo importan el día que se conecte el corte**. Anótalas tal cual y **no inventes respuesta**:

1. **R25 con rendimientos de inversión:** el capital de un inversionista puede estar repartido en varios
   préstamos (`participantes_prestamo`). ¿El pago de qué cliente libera su rendimiento?
2. **R25 si el juicio no recupera el capital:** ¿qué pasa con lo acumulado?

Además, **`POST /api/pagos-devengo` hoy no valida R25.** Es inofensivo mientras el corte esté apagado.
Se anota como deuda y no se programa en este sprint.

---

## 3. Reglas que aplican a TODAS las tareas

### 3.1 Método
- **Una tarea = una sesión.** Al terminar, corre el gate, reporta (§9) y **párate**. No arranques la siguiente.
- Antes de cada tarea lee `CLAUDE.md`, `docs/ESTADO.md` y la entrada de la tarea en `docs/BACKLOG.md`.
  **Abre solo los archivos del campo "Lee:"** más los que vayas a modificar.
- **Las 5 reglas de tamaño:** un módulo · ≤5 archivos · pasa el gate sola · un commit con mensaje de una
  línea · si el título necesita "y", son dos tareas. Si una tarea no cabe, **para y propón cómo partirla**.
- **Verifica, no asumas.** Antes de usar un campo, endpoint o prop, confírmalo en el código.
- Cierra la tarea solo con el **gate en verde**, con el perfil que corresponda a su tipo (`ui` 7/7 · `logic` 6/6).
  Los 127 tests existentes deben seguir pasando.
- Al cerrar: marca ✅ en `BACKLOG.md` y agrega una línea a la bitácora de `ESTADO.md`.
  Si `CLAUDE.md` pide actualizar el grafo (`graphify`), hazlo.

### 3.2 Prohibiciones del proyecto
1. No mezcles tareas en una sesión.
2. **No modifiques `components/shared/` dentro de una tarea de módulo.** Solo M48 lo toca, porque es su propia tarea.
3. **No inventes reglas de negocio.** Si `REGLAS.md` no lo dice, para y pregunta.
4. No arranques una tarea marcada 🚫.
5. **No despliegues. No hagas `push` a `main`:** Railway se despliega solo con cada push. Trabaja en la rama
   `sprint-referencias`, haz commits locales y deja el push y el merge a Sebastian.
6. No cierres una tarea con el gate en rojo.
7. **Este sprint no lleva migraciones.** Si crees que una tarea necesita una, para y pregunta.
8. No borres nada de `_to_delete/`.
9. **No toques `backend/src/modules/motor/` ni conectes `generarCorte` (D1).**
10. **No borres ni renombres `inversiones.referenciador_id` ni `inversiones.tasa_referenciador` (D2).**
11. No cambies el comportamiento de `POST /api/pagos-devengo` (R26 ya está cumplida).
12. No hagas `DELETE` sobre referencias ni sobre ninguna otra cosa (P6). Las bajas se hacen cambiando el estado.

### 3.3 Reglas de estructura que tocan este sprint (P1–P7)
- **P1:** hay tres formas. Un referenciador puede tener `inversionista_id` (forma 2) o no tenerlo (forma 3). **Nadie se muda de tabla.**
- **P2:** el referido puede ser una inversión (`tipo_referido='inversion'`, base = capital) o un préstamo
  (`tipo_referido='prestamo'`, base = `saldo_pendiente`).
- **P3 · Un solo nivel:** una inversión o un préstamo tiene **un solo** referenciador. La base de datos lo
  garantiza con `ref_unica_inversion` y `ref_unica_prestamo`, y el API responde **409**.
- **P4:** ligarlo es **opcional** y no se hereda. Si un inversionista referido abre otra inversión, esa inversión no queda ligada sola.
- **P6:** nadie se borra. Solo los referenciadores con `activo = true` aparecen en el selector.
- **Nomenclatura:** siempre `referenciador` / `referenciador_id`. Nunca "referidor", "referente" ni otra variante en código nuevo.

### 3.4 Contrato de `/api/referencias` (ya existe; no lo cambies salvo en M46)
- `POST /api/referencias` **[admin]**. El cuerpo incluye `referenciador_id`, `tipo_referido`
  (`'inversion' | 'prestamo'`), `inversion_id` **o** `prestamo_id` (el que corresponda, nunca los dos),
  `tasa` y los campos opcionales que acepte hoy (confírmalos en el controller).
  `fecha_inicio` **la pone el servidor**: no la mandes.
- `PATCH /api/referencias/:id` **[admin]**: solo `estado`, `tasa`, `fecha_fin` y `notas`. **No cambia el origen ni el
  referenciador.** El estado solo avanza (`activa → terminada | cancelada`, M29).
- Validación: UUID, tasa con máximo 2 decimales, **> 0 y ≤ 999.99**, fecha `AAAA-MM-DD` real → **400** con mensaje en español.
- Si el origen ya tiene referenciador → **409** con mensaje en español.
- Respuesta: `{ success, data, error }`. Los endpoints legacy (inversiones, préstamos) usan `{ mensaje }`: **no los cambies**.

### 3.5 Dinero y tasas
- **Tasa = porcentaje con 2 decimales.** `0.50` = 0.5%. `monto = base * tasa / 100`.
- En el frontend, la tasa viaja como **string** validado con `^\d{1,3}(\.\d{1,2})?$`, mayor que 0 y ≤ 999.99.
  **Sin `parseFloat`, sin `Number()` para operar y sin `toFixed`** en código nuevo. `toFixed` solo se permite para ratios de display.
- El backend usa `lib/dinero.ts`. No crees copias locales de sus helpers.

### 3.6 Convenciones
- Código y comentarios en **inglés**. UI y mensajes de error en **español**.
- Las fechas las genera el servidor (`now()` / `current_date`), nunca el cliente.
- **Seguridad:** si algo es solo para admin, se protege en el backend (`roleMiddleware('administrador')`) **y además** se
  oculta en la UI (`RoleGuard` o el chequeo de rol que ya usa el proyecto). Ocultarlo solo en la UI no sirve.
- **Diseño (`docs/DISENO.md`):** usa solo los tokens (`slate-800/500/400`, `sky-500/600`, `sky-50/100`,
  tarjetas `rounded-2xl border-slate-100`, `green/amber/red` para estados). **Cero colores hardcodeados, cero estilos inline.**
  Iconos solo de `lucide-react`. Tipografía en escala 12·14·16·20·24·32.
- **Responsive:** 375 / 768 / 1440 sin scroll horizontal y sin errores de consola. En 375 px el selector debe poder usarse con el dedo.
- Reutiliza los componentes existentes (`Campo`, `FileDropZone`, etc.) antes de crear uno nuevo.

---

## 4. Condiciones de paro

**Detente, no improvises y reporta** si pasa cualquiera de estas:

- La Fase 0 encuentra inversiones con `referenciador_id` o `tasa_referenciador` con valor (ver 5.4).
- Una tarea necesita más de 5 archivos, tocar dos módulos o una migración.
- El contrato real de `/api/referencias`, del alta de inversión o del alta de préstamo no coincide con este documento.
- Crear una inversión o un préstamo **no devuelve su `id`** en la respuesta.
- Aparece un escritor de la columna deprecada que no está listado aquí (por ejemplo, la importación XLSX).
- El gate falla por algo ajeno a tu tarea.
- Cualquier situación de dinero o de reglas que este documento y `REGLAS.md` no cubran.

---

## 5. Fase 0 — Verificación previa (una sesión, sin cambios)

**Tipo:** verificación · **Modifica:** nada

1. `git status`: el working tree debe estar limpio. Si no, para y reporta.
2. `git checkout main && git pull` (solo pull). Confirma que `HEAD` es `df7a812` o posterior.
   Crea la rama: `git checkout -b sprint-referencias`.
3. Corre `./gate.sh` completo y `npm test --prefix backend`. Deben dar **127 passed** y el gate en verde.
   Anota el resultado.
4. **Consulta de solo lectura en Neon (dev)**, usando `DATABASE_URL` de `backend/.env`:
   ```sql
   SELECT count(*) AS con_ref_vieja
   FROM inversiones
   WHERE referenciador_id IS NOT NULL OR tasa_referenciador IS NOT NULL;

   SELECT count(*) FROM referencias;
   SELECT count(*) FROM referenciadores WHERE activo = true;
   ```
   - Si `con_ref_vieja > 0` → **PARA**. Reporta las filas (id, inversionista, referenciador_id, tasa) y espera
     instrucciones. **No copies nada a `referencias`.**
   - Si `con_ref_vieja = 0` → sigue.
5. **Inventario de escritores de la columna deprecada** (solo búsqueda):
   ```bash
   grep -rn "referenciador_id\|tasa_referenciador" backend/src frontend/src --include=*.ts --include=*.tsx
   ```
   Clasifica cada hallazgo como **escribe en `inversiones`**, **lee de `inversiones`** o **es del modelo nuevo
   (`referencias`/`referenciadores`)**. Los escritores esperados son `PerfilInversionista.tsx:148-149` y
   `crearInversion` en el backend. Revisa en especial la **importación XLSX** (`POST /api/inversionistas/importar`).
6. **Contratos reales** (solo lectura). Anota:
   - el cuerpo exacto que acepta `POST /api/referencias` y lo que devuelve;
   - si algún endpoint ya devuelve la referencia de una inversión o de un préstamo (GET de inversiones,
     de préstamos o de referenciadores);
   - qué devuelve `POST /api/inversionistas/:id/inversiones` y si trae el `id` creado;
   - qué devuelve `POST /api/prestamos` y si trae el `id` creado;
   - dónde está la UI de **edición** de una inversión (componente y archivo) y la de edición de un préstamo;
   - cómo sabe el frontend si el usuario es admin (hook o contexto) y cómo se usa `RoleGuard`.
7. **Reporte** con el formato de §9 y **párate**.

---

## 6. Fase 1 — Documentación (una sesión, sin código)

**Tipo:** docs · **Modifica solo:** archivos de `docs/`

Con los resultados de la Fase 0:

1. **`docs/modulos/comisiones-motor/REGLAS.md`**
   - Agrega **R25** y **R26** con el texto y los ejemplos de §2.
   - Agrega una sección **"Preguntas abiertas — antes de conectar el corte"** con las dos preguntas de §2.
     **No uses el encabezado `⛔ REGLA NO DEFINIDA`**, porque pondría el gate en rojo en auditorías completas y el corte
     está apagado a propósito. Usa un bloque de cita que empiece con `> ⛔ PENDIENTE (no bloqueante mientras el corte esté apagado)`
     y agrega la nota: *"El día que se conecte el corte, estas preguntas pasan a encabezado `## ⛔ REGLA NO DEFINIDA · …`
     y bloquean el módulo hasta tener respuesta."*
   - En los criterios derivados: el de *atrasado/en_juicio sí genera comisión* pasa a **confirmado (Sebastian, 2026-09-16)**,
     y el del *excedente rechazado* pasa a **confirmado = R26**.
2. **`docs/PARA-CARLOS-referenciadores.md`**: marca los dos criterios derivados como confirmados, con fecha, y agrega R25.
3. **`docs/DINERO.md`**: el caso **C4** debe usar una base de **48 horas** semanales. Recalcula su aritmética con un solo
   redondeo half-up al final (D2) y verifícala con un test que ya exista o con un cálculo a mano mostrado paso a paso.
   **No toques código.**
4. **`docs/ESTADO.md`**
   - En decisiones (2026-09-16): agrega D1, D2, D3, R25 y R26 con su porqué.
   - Mueve el hueco *"el corte no tiene disparador"* a **decisión**: *"el corte queda apagado a propósito"*.
   - En deuda: *"`POST /api/pagos-devengo` no valida R25; es inofensivo mientras el corte esté apagado"*.
   - Quita la deuda *"base de horas 48 vs 40"* porque ya está resuelta.
   - Anota el resultado de la Fase 0 (conteos y escritores).
5. **`docs/modulos/inversionistas/FLUJOS.md` §3**: confirma que describe el selector (autocompletar, tasa obligatoria si se
   eligió referenciador, sin auto-referencia) y agrega lo que definen las tareas M49–M52 (§7): orden de las llamadas, falla
   parcial, vista de solo lectura cuando ya hay referenciador y visibilidad solo para admin.
6. **`docs/BACKLOG.md`**: da de alta **M46–M54** copiando el contenido de §7 y §8 (Tipo, Módulo, Lee, Toca, Pasos,
   criterios EARS). Márcalas ⬜.
7. `./gate.sh` en verde → commit `docs: sprint referencias M46–M54, R25, R26, corte apagado` → reporte → **párate**.

---

## 7. Fase 2 — Tareas (una por sesión, en este orden)

```
M46 → M47 → M48 → M49 → M50 → M51 → M52 → M53 → M54(humana)
```

---

### M46 · logic · Consultar la referencia de un origen

**Módulo:** inversionistas · **Perfil del gate:** `logic`
**Lee:** controller y rutas de referencias, su `.test.ts`, `docs/modulos/inversionistas/DATOS.md`
**Toca (≤5):** `referencias.controller.ts`, su archivo de rutas, `referencias.controller.test.ts`

**Primero:** si la Fase 0 encontró que algún endpoint **ya devuelve** la referencia de una inversión y de un préstamo, marca
M46 como **❌ descartada** con el motivo (igual que se hizo con M8) y párate.

**Pasos**
1. Agrega `GET /api/referencias?inversion_id=<uuid>` y `GET /api/referencias?prestamo_id=<uuid>` (con autenticación; lectura para ambos roles).
2. Exige **exactamente uno** de los dos parámetros y valida que sea un UUID → si no, **400** en español.
3. Devuelve `{ success: true, data: <referencia | null> }` con `id`, `referenciador_id`, el nombre completo del referenciador,
   `tasa` (string), `estado`, `fecha_inicio` y `fecha_fin`. Devuelve la referencia **sin importar su estado**: la unicidad es por origen.
4. Tests con el pool mockeado, igual que los existentes.

**Criterios (EARS)**
- **When** llega `inversion_id` válido con referencia, **the API shall** responder 200 con esa referencia.
- **When** el origen no tiene referencia, **the API shall** responder 200 con `data: null`.
- **If** faltan los dos parámetros, llegan los dos o el UUID es inválido, **the API shall** responder 400 en español sin consultar la DB.
- **The API shall** usar el envelope `{ success, data, error }`.

**Commit:** `feat(referencias): consultar referencia por origen`

---

### M47 · ui · Service y tipos de referencias

**Módulo:** inversionistas · **Perfil del gate:** `ui`
**Lee:** `services/referenciadoresService.ts`, sus tipos en `types/`, el contrato anotado en la Fase 0
**Toca (≤5):** `services/referenciasService.ts` (nuevo), el archivo de tipos que corresponda

**Pasos**
1. Crea `referenciasService` con el mismo cliente axios e interceptor JWT que los demás services.
2. Funciones: `crearReferencia(payload)`, `editarReferencia(id, cambios)`, `obtenerReferenciaPorInversion(id)` y
   `obtenerReferenciaPorPrestamo(id)` (estas dos, solo si M46 no se descartó; si se descartó, usa el endpoint existente que encontró la Fase 0).
3. Tipos: `tipo_referido` como unión literal y `tasa: string`. **No incluyas `fecha_inicio`** en el payload de alta.
4. Normaliza errores: devuelve el `error` en español del backend y el status (400, 403, 409).

**Criterios (EARS)**
- **The service shall** mandar la tasa como string, sin convertirla a número.
- **The service shall not** mandar `fecha_inicio`.
- **When** el backend responde 409, **the service shall** exponer el status y el mensaje del backend sin cambiarlos.

**Commit:** `feat(referencias): service y tipos del frontend`

---

### M48 · ui · Componente compartido `SelectorReferenciador`

**Módulo:** shared (**tarea propia**, precedente M25) · **Perfil del gate:** `ui`
**Lee:** `docs/DISENO.md`, `components/shared/` (para seguir su estilo), el componente `Campo`, `referenciadoresService.ts`
**Toca (≤5):** `components/shared/SelectorReferenciador.tsx` (nuevo) y su archivo de tipos si hace falta

Va en `shared/` porque lo usan dos módulos (inversionistas y préstamos).

**Props**
- `valor: { referenciador_id: string | null; tasa: string }`
- `onCambio(valor)`
- `excluirInversionistaId?: string` (para evitar la auto-referencia)
- `deshabilitado?: boolean`
- `error?: string`

**Comportamiento**
1. Un buscador con autocompletar que usa `GET /api/referenciadores`. Muestra **solo los que tienen `activo = true`**, con
   nombre completo y un badge de forma (*Ambos* si tiene `inversionista_id`, *Referenciador* si no).
2. **Auto-referencia:** si llega `excluirInversionistaId`, oculta al referenciador cuyo `inversionista_id` sea igual.
3. Ligarlo es **opcional**. Un botón para quitar la selección limpia el referenciador **y** la tasa.
4. **Tasa obligatoria** solo si hay un referenciador seleccionado. Valida el string con la regex de §3.5, > 0 y ≤ 999.99, y
   muestra el mensaje en español debajo del campo. Muestra el sufijo `%` y el hint *"0.50 = 0.5% mensual"*.
5. El componente **no llama a `/api/referencias`**: solo reporta el valor. Quien lo usa decide cuándo guardar.
6. No sabe nada de roles: ocultarlo a quien no es admin le toca a quien lo usa.
7. Usa solo tokens de diseño, iconos de lucide y ningún estilo inline. Debe verse bien en 375, 768 y 1440.

**Criterios (EARS)**
- **When** no hay referenciador seleccionado, **the component shall** reportar un valor válido con la tasa vacía.
- **When** hay referenciador y la tasa está vacía, es 0, tiene más de 2 decimales o es mayor que 999.99, **the component shall** mostrar el error y reportar el valor como inválido.
- **Where** se pasa `excluirInversionistaId`, **the component shall** no ofrecer al referenciador ligado a ese inversionista.
- **The component shall** listar solo referenciadores activos.

**Commit:** `feat(shared): SelectorReferenciador`

---

### M49 · ui · Ligar referenciador en el ALTA de inversión

**Módulo:** inversionistas · **Perfil del gate:** `ui`
**Lee:** `pages/.../PerfilInversionista.tsx` (en especial las líneas 148-149), `FLUJOS.md` §3, `referenciasService.ts`, `SelectorReferenciador.tsx`
**Toca (≤5):** `PerfilInversionista.tsx` (y el subcomponente del formulario de inversión, si el formulario vive en otro archivo)

**Pasos**
1. **Quita** `referenciador_id` y `tasa_referenciador` del payload de creación de inversión, y quita sus campos viejos del formulario.
2. Agrega `SelectorReferenciador` con `excluirInversionistaId = <id del inversionista del perfil>`.
   **Visible solo para admin.**
3. Al guardar:
   1. crea la inversión con el endpoint legacy de siempre y obtén su `id`;
   2. **si** se eligió un referenciador, llama a `crearReferencia({ referenciador_id, tipo_referido: 'inversion', inversion_id, tasa })`.
4. **Falla parcial** (decisión de UX de Sebastian): si la inversión se creó pero la referencia falló, **la inversión se queda**
   (P6, nada se borra ni se revierte). Muestra el aviso ámbar: *"La inversión se guardó, pero no se pudo ligar el
   referenciador: {mensaje del backend}. Puedes ligarlo desde la edición de la inversión."*
5. El botón de guardar se deshabilita mientras corren las llamadas, para evitar doble envío.

**Criterios (EARS)**
- **The form shall not** mandar `referenciador_id` ni `tasa_referenciador` al endpoint de inversiones.
- **When** un admin guarda con referenciador y tasa válidos, **the system shall** crear la inversión y luego una fila en `referencias` con `tipo_referido='inversion'`.
- **When** se guarda sin referenciador, **the system shall** crear solo la inversión.
- **If** la referencia falla después de crear la inversión, **the system shall** conservar la inversión y mostrar el aviso de falla parcial.
- **While** el usuario no es admin, **the form shall** no mostrar el selector.
- **The form shall** verse sin scroll horizontal ni errores de consola en 375, 768 y 1440.

**Commit:** `feat(inversionistas): ligar referenciador al crear inversión`

---

### M50 · ui · Ligar referenciador en la EDICIÓN de inversión

**Módulo:** inversionistas · **Perfil del gate:** `ui`
**Lee:** el componente de edición de inversión que ubicó la Fase 0, `referenciasService.ts`, `SelectorReferenciador.tsx`
**Toca (≤5):** ese componente (y `CardInversion` solo si ahí se muestra el dato)

**Pasos**
1. Al abrir la edición, consulta la referencia de la inversión (M46 o el endpoint existente).
2. **Sin referencia:** muestra `SelectorReferenciador` (solo a admin). Al guardar con un referenciador elegido, llama a `crearReferencia`.
3. **Con referencia:** muestra **solo lectura**: nombre del referenciador, tasa con `%`, estado y fecha de inicio. **No permitas cambiar
   el referenciador** (el API no lo permite y P3 lo prohíbe).
4. **No agregues** en esta tarea botones para editar la tasa ni para terminar o cancelar la referencia: eso no está especificado.
   Si lo ves necesario, anótalo como propuesta en el reporte.
5. Si llega un 409 (alguien más la ligó mientras tanto), muestra el mensaje del backend y recarga la referencia.

**Criterios (EARS)**
- **When** la inversión no tiene referencia y un admin elige una, **the system shall** crear la fila en `referencias`.
- **When** la inversión ya tiene referencia, **the system shall** mostrarla en solo lectura y no ofrecer el selector.
- **If** el API responde 409, **the system shall** mostrar el mensaje y recargar la referencia.
- **While** el usuario no es admin, **the system shall** mostrar la referencia existente (si hay) sin permitir ligar una.

**Commit:** `feat(inversionistas): ligar referenciador al editar inversión`

---

### M51 · ui · Ligar referenciador en el ALTA de préstamo

**Módulo:** prestamos · **Perfil del gate:** `ui`
**Lee:** `FormularioPrestamo.tsx`, su service, `referenciasService.ts`, `SelectorReferenciador.tsx`, las reglas C9/C10 (la base es `saldo_pendiente`)
**Toca (≤5):** `FormularioPrestamo.tsx` (y su subcomponente de sección, si existe)

**Pasos**
1. Agrega `SelectorReferenciador` como sección opcional *"Referenciador"*, **solo para admin**. En préstamos no aplica `excluirInversionistaId`.
2. Al guardar: crea el préstamo con el flujo legacy de siempre, obtén su `id` y, **si** se eligió un referenciador, llama a
   `crearReferencia({ referenciador_id, tipo_referido: 'prestamo', prestamo_id, tasa })`.
3. Falla parcial igual que en M49, con el texto: *"El préstamo se guardó, pero no se pudo ligar el referenciador: {mensaje}.
   Puedes ligarlo desde la edición del préstamo."*
4. **No cambies** ningún otro campo, cálculo ni validación del formulario de préstamo.

**Criterios (EARS)**
- **When** un admin crea un préstamo con referenciador y tasa válidos, **the system shall** crear una fila en `referencias` con `tipo_referido='prestamo'`.
- **When** se crea sin referenciador, **the system shall** comportarse exactamente como antes.
- **If** la referencia falla, **the system shall** conservar el préstamo y mostrar el aviso de falla parcial.
- **While** el usuario no es admin, **the form shall** no mostrar la sección.

**Commit:** `feat(prestamos): ligar referenciador al crear préstamo`

---

### M52 · ui · Ligar referenciador en la EDICIÓN de préstamo

**Módulo:** prestamos · **Perfil del gate:** `ui`
**Lee:** la edición de préstamo que ubicó la Fase 0, `referenciasService.ts`, `SelectorReferenciador.tsx`
**Toca (≤5):** ese componente

**Pasos:** los mismos de M50, pero con `prestamo_id`: sin referencia → selector (admin); con referencia → solo lectura;
409 → mensaje y recarga. Sin botones de editar ni cancelar.

**Criterios (EARS):** los mismos de M50, aplicados al préstamo.

**Commit:** `feat(prestamos): ligar referenciador al editar préstamo`

---

### M53 · logic · El backend deja de escribir las columnas deprecadas

**Módulo:** inversionistas · **Perfil del gate:** `logic`
**Lee:** `inversionistas.controller.ts` (`crearInversion`, `PUT /api/inversiones/:id`, importar), su `.test.ts`, el inventario de escritores de la Fase 0
**Toca (≤5):** `inversionistas.controller.ts` y su test (más el controller de inversiones, si está separado)

**Precondición:** M49 ✅, para que el frontend ya no mande esos campos.

**Pasos**
1. En **todos** los escritores del inventario (crear inversión, editar inversión y, si aplica, importar), quita
   `referenciador_id` y `tasa_referenciador` del `INSERT` o `UPDATE`.
2. Si el cuerpo trae alguno de los dos campos, responde **400** con el formato legacy de ese endpoint (`{ mensaje }`):
   *"El referenciador ya no se captura aquí. Usa la sección Referenciador (referencias)."*
3. **No borres la columna** ni cambies las lecturas existentes (D2).
4. Si la importación XLSX tiene columnas de referenciador, **para y pregunta** antes de cambiarla.
5. Tests: con esos campos → 400 y ningún query de escritura; sin ellos → mismo comportamiento que hoy.

**Criterios (EARS)**
- **If** el cuerpo trae `referenciador_id` o `tasa_referenciador`, **the API shall** responder 400 sin escribir en la DB.
- **The API shall not** escribir esas columnas desde ningún endpoint.
- **When** el cuerpo no las trae, **the API shall** comportarse igual que antes (los tests existentes siguen verdes).

**Commit:** `fix(inversiones): dejar de escribir columnas deprecadas de referenciador`

---

## 8. M54 · ✋ Prueba humana (Sebastian, en dev)

Claude Code **solo prepara** la lista y el ambiente local. No marca esta tarea como ✅: la marca Sebastian.

- [ ] Login como admin.
- [ ] Alta de un referenciador de forma 3 (sin inversionista) y de uno de forma 2 (ligado a un inversionista).
- [ ] Alta de una inversión en el perfil del inversionista de forma 2: **no** aparece él mismo en el selector (sin auto-referencia).
- [ ] Alta de una inversión con referenciador y tasa `0.50` → aparece en `referencias` y en el detalle del referenciador (una fila por origen).
- [ ] Tasa inválida (`0`, `1.234`, `1000`) → error en español y no se guarda.
- [ ] Editar una inversión sin referencia → se liga. Editar una que ya tiene → se ve en solo lectura.
- [ ] Alta de un préstamo con referenciador → fila en `referencias` con `tipo_referido='prestamo'`.
- [ ] Editar un préstamo que ya tiene referenciador → se ve en solo lectura.
- [ ] Intentar ligar dos veces el mismo origen → mensaje 409 en español.
- [ ] Login como oficinista → no ve los selectores, pero sí puede crear inversiones y préstamos.
- [ ] En la DB: `SELECT count(*) FROM inversiones WHERE referenciador_id IS NOT NULL` sigue en **0**.
- [ ] Pestaña Devengos vacía y columnas "se le debe" en `—` → **correcto** (D1).
- [ ] Todo lo anterior en 375 px desde el celular.
- [ ] `npm run test:e2e --prefix frontend` en verde (18 tests). Si alguna pantalla nueva lo amerita, proponer agregarla al spec.

**Estado:** ✅ Aprobada por Sebastian el 2026-10-01 (prueba humana local: ligado desde inversión, préstamo nuevo y existente, auto-referencia bloqueada, 409 por duplicado, estados solo hacia adelante, detalle por origen, 375 y 1440).

---

## 9. Formato del reporte al cerrar cada sesión

```
## Reporte · <Fase o Mxx> · <fecha>
Estado: ✅ cerrada | ⏸ parada (motivo) | ❌ descartada (motivo)
Archivos tocados (n/5):
  - ruta — qué cambió
Gate: perfil <x> · <n/n> verde | rojo (detalle)
Tests backend: <n> passed (antes 127)
Criterios EARS: uno por línea con ✅/❌
Hallazgos que contradicen el documento: …
Propuestas (no implementadas): …
Commit: <hash> <mensaje>  (sin push)
Siguiente tarea: <Mxx> — espero aprobación.
```

---

## 10. Fuera de este sprint (no hacer)

- Conectar el corte, o crear un endpoint, cron o botón de corte (D1).
- Validar R25 en `POST /api/pagos-devengo`.
- Exponer totales de `devengos` en `/api/referenciadores` (las columnas siguen en `—`).
- Historial de pagos de devengo (endpoint y pantalla).
- Borrar o renombrar `inversiones.referenciador_id` ni `inversiones.tasa_referenciador`.
- Editar la tasa o terminar/cancelar una referencia desde la UI (falta especificarlo).
- Tests de los controllers legacy que este sprint no toque.
- Cualquier cambio en nómina, dashboard, tesorería o egresos.
- Push, merge o deploy.
