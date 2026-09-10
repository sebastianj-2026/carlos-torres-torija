# Design System — Carlos Torres Torija

> Archivo de **alta rotación**. Vive solo por eso: mezclarlo con reglas de
> negocio (baja rotación) es lo que hace que Claude Code toque lo que no debía.

## Tokens — única fuente
(Extraídos del uso real el 2026-09-09. El proyecto usa clases de Tailwind
directas; estos son los equivalentes semánticos que TODO componente debe usar.)

| Token | Clase Tailwind | Uso |
|---|---|---|
| `--ink` | `slate-800` | texto principal, títulos |
| `--ink-soft` | `slate-500` / `slate-600` | texto secundario, labels |
| `--muted` | `slate-400` | hints, placeholders, `—` de datos vacíos |
| `--accent` | `sky-500` (hover `sky-600`) | botones primarios, tab activa, focus ring |
| `--accent-soft` | `sky-50` / `sky-100` | fondos de selección y badges informativos |
| `--surface` | `white` sobre fondo `slate-50` | tarjetas (`rounded-2xl border-slate-100`) |
| `--linea` | `slate-100` / `slate-200` | bordes, divisores |
| éxito | `green-50/600/700` | confirmaciones, badge Activo |
| alerta | `amber-50/700` | avisos, badge Comisión |
| error | `red-50/500/600` | errores, baja |

⚠️ `tailwind.config.js` todavía define `naranja.principal/oscuro` (#F97316) del
tema viejo pre-rebranding — **sin uso en componentes**. Candidato a limpieza en
tarea propia; mientras, no usarlo.

Ningún color hardcodeado en un componente. Nunca.

## Tipografía
Sistema (stack por defecto de Tailwind: `ui-sans-serif, system-ui, …`).
No hay fuente display propia.
Escala: 12 · 14 · 16 · 20 · 24 · 32 — en la práctica `text-xs/sm/base/xl/2xl`;
cifras de dinero en `font-bold`/`font-semibold`.

## Componentes canónicos

(Inventario completo de `components/shared/` al 2026-09-09.)

| Componente | Path | Reemplaza a | Cuándo NO usarlo |
|---|---|---|---|
| ErrorBoundary | `components/shared/ErrorBoundary.tsx` | try/catch ad-hoc en render | — |
| FileDropZone | `components/shared/FileDropZone.tsx` | `<input type=file>` suelto. Prop opcional `accept` (M25) para restringir MIME | — |
| ProtectedRoute | `components/shared/ProtectedRoute.tsx` | check de auth inline | rutas públicas |
| RoleGuard | `components/shared/RoleGuard.tsx` | check de rol inline en render | cuando el gate es de ruta completa (usar `roleMiddleware` en el backend además, nunca solo UI) |

## Prohibiciones

- ❌ Crear componente nuevo sin buscar primero en `components/shared/`
- ❌ Estilos inline. Todo por token / clase Tailwind del sistema.
- ❌ **Modificar un componente compartido dentro de una tarea de módulo.**
  Eso es tarea propia — afecta a todos los módulos y rompe consistencia en silencio.
- ❌ Iconos fuera de `lucide-react`

## Responsive
Breakpoints verificados: **375 / 768 / 1440**.
Criterio duro: cero scroll horizontal, cero error en consola, en las tres.
Hoy se verifica con playwright (navegador dirigido) en cada tarea `ui`.
Sigue pendiente `e2e/responsive.spec.ts` que lo automatice — deuda #4 en ESTADO.md.
