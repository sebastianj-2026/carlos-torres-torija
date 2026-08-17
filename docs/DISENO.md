# Design System — Carlos Torres Torija

> Archivo de **alta rotación**. Vive solo por eso: mezclarlo con reglas de
> negocio (baja rotación) es lo que hace que Claude Code toque lo que no debía.

## Tokens — única fuente
{{TODO: extraer los tokens reales de frontend/tailwind.config.js y del tema.
Hoy el proyecto usa clases de Tailwind directas, no tokens semánticos. Definir:}}
```css
--ink: {{TODO}};
--accent: {{TODO}};
--surface: {{TODO}};
--muted: {{TODO}};
```
Ningún color hardcodeado en un componente. Nunca.

## Tipografía
{{TODO: display / interfaz — declarar las reales del proyecto}}
Escala: 12 · 14 · 16 · 20 · 24 · 32

## Componentes canónicos

> {{TODO: inventariar `frontend/src/components/shared/` y llenar la tabla.}}

| Componente | Path | Reemplaza a | Cuándo NO usarlo |
|---|---|---|---|
| ErrorBoundary | `components/shared/ErrorBoundary.tsx` | try/catch ad-hoc en render | — |
| FileDropZone | `components/shared/FileDropZone.tsx` | `<input type=file>` suelto | — |
| ProtectedRoute | `components/shared/ProtectedRoute.tsx` | check de auth inline | rutas públicas |

## Prohibiciones

- ❌ Crear componente nuevo sin buscar primero en `components/shared/`
- ❌ Estilos inline. Todo por token / clase Tailwind del sistema.
- ❌ **Modificar un componente compartido dentro de una tarea de módulo.**
  Eso es tarea propia — afecta a todos los módulos y rompe consistencia en silencio.
- ❌ Iconos fuera de `lucide-react`

## Responsive
Breakpoints verificados: **375 / 768 / 1440**.
Criterio duro: cero scroll horizontal, cero error en consola, en las tres.
{{TODO: hoy se verifica a ojo con playwright-mcp. Falta `e2e/responsive.spec.ts`
que lo automatice — ver deuda en ESTADO.md.}}
