# Estado — Carlos Torres Torija

> Lo mantiene **Claude Code** al cerrar cada tarea (`/cerrar-tarea`).
> Es el punto de reentrada: una sesión nueva lee esto y sabe dónde está.

**Metodología:** v0.1.0  ·  **Perfil:** frontback-drizzle (con overrides — ver `gate.sh`)
**Última actualización:** 2026-08-16

## Grafo de módulos

> ⚠️ Hay **drift** entre la especificación y el código: los docs de metodología
> especifican `personas` (clientes+inversionistas+referenciadores unificados),
> pero el código en producción todavía tiene `clientes` e `inversionistas`
> como controllers separados. La metodología entra sobre un sistema legacy vivo.

| Módulo | Estado | Tests | Depende de | Última tarea |
|---|---|---|---|---|
| personas | 🟡 especificado, NO implementado | 0 | — | spec en `docs/modulos/personas/` |
| comisiones | 🟡 especificado, NO implementado (motor) | 0 | personas | spec en `docs/modulos/comisiones/` |
| dashboard | ✅ producción (legacy), documentado post-hoc | 0 | ingresos, egresos, nómina | Fase 0 (modularización) |
| auth / clientes / inversionistas / prestamos / cobros / pagos / ingresos / egresos / cuentas_pagar / nominas / tesoreria / juicios | ✅ producción (legacy) | 0 | — | sin spec de metodología |

Estados: `⬜ pendiente` · `🟡 en curso` · `✅ producción` · `🚫 bloqueado`

## Bloqueos activos

| Módulo | Qué falta | Quién resuelve | Desde |
|---|---|---|---|
| dashboard | Confirmar contra Neon si orígenes/tablas Inmueble/Cancha/Estacionamiento siguen vivos tras el commit 52b2117, o son residuo stale | Sebastian + Claude | 2026-08-16 |

> Un módulo bloqueado por regla de negocio sin definir **no entra al backlog**.
> No se marca TODO — se detiene.

## Deuda técnica

**Detectada en la Fase 0:**

- [ ] **Dinero en float.** ~100 hits de `parseFloat(...).toFixed(2)` sobre dinero
      en todos los controllers del backend (`cobros`, `prestamos`, `inversionistas`,
      `nominas`, `egresos`, `ingresos`, `tesoreria`, `pagos`, `cuentas_pagar`,
      `dashboard`). El check `dinero-sin-float` sale ROJO. **Desactivado como
      bloqueante** (no está en `CHECKS_EXTRA`) para no bloquear cada tarea; se
      activa cuando exista el ticket de refactor a `numeric`/Decimal.
- [ ] **Backend sin tests.** 0 archivos `.test.ts`/`.spec.ts`. El gate `logic`/`motor`
      cae al test del frontend (`craco test`). Un motor como `comisiones` no puede
      cerrar sin sus casos-resueltos en test.
- [ ] **Sin script de lint.** Solo `eslintConfig` de CRA en build. `CMD_LINT` vacío.
- [ ] **Migraciones manuales, sin reversa, sin runner.** SQL plano en `database/`
      (naming sin `.up/.down`), aplicado a mano a Neon. `CMD_MIGRATE_*` vacíos →
      el gate `data`/`full` no verifica migraciones. Check `migracion-reversible`
      no aplica al naming actual.
- [ ] **Migraciones NO aplicadas en prod** con workarounds hardcoded en el
      analytics controller (`otros=0::NUMERIC`, `pensiones_activas=0`).
      Ver `docs/modulos/dashboard/DATOS.md`.
- [ ] **Sin e2e/responsive.** No existe `e2e/responsive.spec.ts`; responsive se
      verifica a ojo con playwright-mcp. `CMD_E2E_RESPONSIVE` vacío → el gate `ui`
      falla el paso de screenshots (esperado hasta montar la suite).
- [ ] **Drift spec↔código.** `personas`/`comisiones` especificados pero no
      implementados; el código legacy corre con `clientes`/`inversionistas`
      separados. Decidir estrategia: refactor a `personas` o re-especificar sobre
      lo existente.
- [ ] **Docs de tokens/tipografía pendientes** en `docs/DISENO.md` (marcas `{{TODO}}`).

## Decisiones de arquitectura

| Fecha | Tarea | Decisión | Por qué |
|---|---|---|---|
| 2026-08-16 | Fase 0 | Perfil `frontback-drizzle` con overrides pesados | Es el perfil "financiera-sistema y forks", pero este fork usa CRA/CRACO + pg raw, no Drizzle/Vitest/migrate. Comandos inexistentes → vacíos, registrados como deuda. |
| 2026-08-16 | Fase 0 | `dinero-sin-float` NO bloqueante | Sale rojo con ~100 hits legacy; bloquearía cada tarea hasta refactor total. Se documenta como deuda y se ataca en ticket dedicado. |
| 2026-08-16 | Fase 0 | Módulo `dashboard` como destino del conocimiento del CLAUDE.md monolítico | El dashboard es real y transversal (`dashboard.controller.ts`); agrega ingresos/egresos/nómina. |

## Bitácora de aceptación (Sebastian)

| Fecha | Tarea | Veredicto | Nota |
|---|---|---|---|
| — | — | — | — |
