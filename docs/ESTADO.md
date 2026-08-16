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
| comisiones | 🟡 motor en TDD — T-001 tests RED | 10 (RED) | personas | T-001 hecha; siguen T-002/T-003 (verde) |
| dashboard | ✅ producción (legacy), documentado post-hoc | 0 | ingresos, egresos, nómina | Fase 0 (modularización) |
| auth / clientes / inversionistas / prestamos / cobros / pagos / ingresos / egresos / cuentas_pagar / nominas / tesoreria / juicios | ✅ producción (legacy) | 0 | — | sin spec de metodología |

Estados: `⬜ pendiente` · `🟡 en curso` · `✅ producción` · `🚫 bloqueado`

## Bloqueos activos

| Módulo | Qué falta | Quién resuelve | Desde |
|---|---|---|---|
| — | — | — | — |

> Resuelto 2026-08-16: el stale del dashboard se verificó contra
> `migration_remove_modules.sql` (ver Decisiones). Queda un pendiente menor, no
> bloqueante: confirmar en vivo contra Neon si se quiere certeza absoluta.

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
| 2026-08-16 | Fase 0 | Resuelto stale del dashboard vía `migration_remove_modules.sql` | `inmuebles`/`contratos_arrendamiento`/`cuentas_por_cobrar` DROP CASCADE → eliminadas; `juicios` viva; orígenes Inmueble/Cancha/Estacionamiento sin filas ni escritores, el CHECK los lista como residuo. Solo `'Prestamo'` vivo. |
| 2026-08-16 | comisiones | Cerradas R21 (inversionista primero), R22 (oficina en rojo → devenga hasta lo cobrado), R23 (2 decimales, residuo a oficina) | Desbloquea el motor de comisiones; la invarianza de suma ya tiene dueño del residuo definido. |

## Bitácora de aceptación (Sebastian)

| Fecha | Tarea | Veredicto | Nota |
|---|---|---|---|
| — | — | — | — |
