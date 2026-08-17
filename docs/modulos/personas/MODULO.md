# Módulo: personas

## Qué resuelve
Un registro único de cada persona que participa en Presta Fácil, con los roles
que puede tener al mismo tiempo: inversionista, cliente, referenciador.

## Por qué una sola tabla y no tres
Una misma persona puede ser inversionista **y** referenciador — invierte su
dinero y además trae a un amigo. Con tablas separadas, sus datos se duplican y
divergen: cambia de teléfono en una y no en la otra. Persona única, roles encima.

## Entidades

| Entidad | Qué representa | Tabla |
|---|---|---|
| Persona | un ser humano. Una fila, nunca duplicada | `personas` |
| Rol | qué es esa persona en el sistema. Varios a la vez | `persona_roles` |
| Aportación | dinero que un inversionista mete, con fecha | `aportaciones` |
| Documento | INE en PDF | `persona_documentos` |

## Endpoints

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/personas` | lista con filtro por rol (inversionistas / referenciadores / todos) |
| GET | `/personas/:id` | detalle con roles, aportaciones y referidos |
| POST | `/personas` | alta con datos base |
| PATCH | `/personas/:id` | edita datos base |
| POST | `/personas/:id/roles` | activa un rol |
| POST | `/personas/:id/documentos` | sube el INE (PDF) |
| GET | `/personas/:id/documentos/:docId` | descarga el INE |
| POST | `/personas/:id/aportaciones` | registra aportación, con referenciador opcional |

## Depende de
Nada. Es la base de todo lo demás.

## Qué NO hace este módulo

- **No calcula comisiones ni rendimientos.** Eso es `comisiones`.
- **No genera devengos.** Solo guarda quién es quién y quién trajo a quién.
- **No maneja créditos.** Un cliente aquí es solo una persona con rol de cliente;
  su crédito vive en el módulo de préstamos.
- **No valida la autenticidad del INE.** Se guarda el PDF, nadie lo verifica
  contra el INE. Si algún día hace falta validación, es otro módulo.
- **No decide política de sucesión.** Si un referenciador muere o se retira, eso
  lo determina la oficina y se captura como un cambio de estado. El sistema no
  tiene regla propia.

## Alcance y responsabilidad
El sistema registra y calcula. La estructura del esquema de referenciadores y su
cumplimiento regulatorio son responsabilidad del operador.
