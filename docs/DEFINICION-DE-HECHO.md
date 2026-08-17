# Definición de Hecho — Carlos Torres Torija

> Este archivo **hereda** de `metodologia/base/DEFINICION-DE-HECHO.base.md`.
> No copiar la base aquí: leerla allá. Este archivo solo agrega lo propio del
> proyecto.

Base heredada: `~/.claude/skills/metodologia/base/DEFINICION-DE-HECHO.base.md`
(tres niveles: ejecutable · observable · humano; criterios por tipo de tarea;
universales; deploy fuera de la compuerta).

## Agregados de este proyecto

### Nivel ejecutable — lo que corre el gate aquí
- `typecheck` = `tsc --noEmit` sobre backend **y** frontend (no hay script `typecheck`).
- `tests` = `craco test` del frontend en modo CI. **Backend sin tests** (deuda).
- `lint`, `migrate`, `e2e responsive`, `casos-resueltos` → **no declarados** aún
  (ver `docs/ESTADO.md` › Deuda técnica). El gate los salta, no los inventa.

### Nivel humano — lista específica del negocio (Sebastian, no delegable)
- [ ] Los montos en pantalla cuadran al centavo con lo que espera el cliente.
- [ ] El flujo de cobro/pago refleja cómo opera la oficina en la vida real.
- [ ] Ninguna regla de préstamo/interés/mora fue **inventada** por Claude
      (contrastar contra `docs/modulos/<X>/REGLAS.md`).

### Regla de oro del dominio (perfil financiera)
- Dinero en `numeric`, nunca float. **Deuda activa:** el backend usa `parseFloat`
  en todos los controllers. El check `dinero-sin-float` existe pero está
  desactivado como bloqueante hasta el refactor. Ver `docs/ESTADO.md`.
- Fechas las genera el servidor (`now()`/`current_date`), nunca el cliente.
- Nada se borra: archivado con bandera.
