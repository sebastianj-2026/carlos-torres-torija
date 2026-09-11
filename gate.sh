#!/usr/bin/env bash
# ============================================================================
# gate.sh — Carlos Torres Torija
#
# ⚠️  AQUÍ NO VA LÓGICA. Solo declaraciones.
#     La lógica vive en metodologia/base/gate.base.sh y es heredada.
#     Si necesitas cambiar CÓMO corre el gate, cámbialo allá y sube la versión.
#     Si lo cambias aquí, este proyecto se salió del ecosistema.
# ============================================================================
set -uo pipefail

# Resolución de la metodología, en orden. El plugin instalado desde marketplace
# se copia a un cache cuyo path CAMBIA en cada update — por eso no se usa aquí.
# La instalación recomendada (skills-dir) sí da un path estable.
: "${METODOLOGIA_ROOT:=}"
for _cand in \
    "$METODOLOGIA_ROOT" \
    "$HOME/.claude/skills/metodologia" \
    "$HOME/dev/metodologia" \
    "./.metodologia" ; do
  if [[ -n "$_cand" && -f "$_cand/base/gate.base.sh" ]]; then
    METODOLOGIA_ROOT="$_cand"; break
  fi
done

if [[ ! -f "${METODOLOGIA_ROOT:-}/base/gate.base.sh" ]]; then
  echo "No encuentro la metodología." >&2
  echo "Clónala en ~/.claude/skills/metodologia o exporta METODOLOGIA_ROOT." >&2
  exit 2
fi

# Versión heredada que este proyecto acepta. La sube /auditar-proyecto, no sola.
METODOLOGIA_VERSION="0.1.2"

source "$METODOLOGIA_ROOT/perfiles/frontback-drizzle.sh"
source "$METODOLOGIA_ROOT/base/gate.base.sh"

if [[ "$GATE_BASE_VERSION" != "$METODOLOGIA_VERSION" ]]; then
  echo "⚠  metodología v$GATE_BASE_VERSION instalada, este proyecto fija v$METODOLOGIA_VERSION." >&2
  echo "   Corre /auditar-proyecto antes de subir. No subas a ciegas en un repo de cliente." >&2
fi

# ── Overrides de este proyecto ───────────────────────────────────────────────
# Este fork NO usa Drizzle ni Vitest ni `npm run migrate`. Es CRA/CRACO (front),
# Express + pg raw (back), y migraciones SQL manuales a Neon. Casi todo el perfil
# se sobreescribe. Los comandos que no existen se dejan vacíos → el gate los
# imprime "no declarado" y no falla. La ausencia está registrada como deuda en
# docs/ESTADO.md, no escondida aquí.

# tsc directo: ninguno de los dos package.json tiene script `typecheck`.
# Se corre el tsc LOCAL de cada paquete (typescript vive en backend/ y frontend/,
# no en la raíz — `npx tsc` desde la raíz baja un decoy). cwd = paquete → toma su
# tsconfig.json por defecto.
CMD_TYPECHECK="(cd backend && node_modules/.bin/tsc --noEmit) && (cd frontend && node_modules/.bin/tsc --noEmit)"

# Sin script de lint en ningún lado (solo eslintConfig de CRA en build). Deuda.
CMD_LINT="npm run lint --prefix frontend"

# Backend con Vitest (T-001 montó el harness). `npm test` = `vitest run` (una vez).
# El front sigue con craco test pero su smoke default está roto por RRD v7 (deuda).
CMD_TEST="npm test --prefix backend"
# --passWithNoTests: un módulo sin tests pasa en vez de reventar. El repo hoy no
# tiene tests por módulo (deuda en ESTADO); vitest sale 1 si el filtro no matchea.
CMD_TEST_MODULO="npm test --prefix backend -- --passWithNoTests"   # filtra por nombre de archivo/módulo

# Build de producción del front (craco). El del back es `tsc` vía build script.
CMD_BUILD="npm run build --prefix frontend"

# Migraciones: SQL plano en database/, con runner de tracking (scripts/migrar.js,
# tabla _migraciones en Neon). `down` solo revierte lo NO sellado — la migración
# de la tarea en curso — y es no-op si todo está sellado. Al cerrar una tarea
# `data`: `node scripts/migrar.js sellar`. Nuevas migraciones: par
# <fecha>_<nombre>.up.sql/.down.sql.
CMD_MIGRATE_UP="node scripts/migrar.js up"
CMD_MIGRATE_DOWN="node scripts/migrar.js down"
# Seed demo no idempotente — correrlo en cada gate duplicaría datos. Deuda.
CMD_SEED=""

# Sin suite e2e/playwright todavía. Deuda.
CMD_E2E_RESPONSIVE="npm run test:e2e --prefix frontend"

# Casos resueltos del motor de comisiones (M13-M15; los del módulo descartado
# viven en _to_delete/backend-huerfano/ y ya no corren).
CMD_TEST_CASOS="npm test --prefix backend -- modules/motor"

DIR_MIGRACIONES="database"

# ── Checks extra ────────────────────────────────────────────────────────────
# dinero-sin-float sale ROJO con ~100 hits en todos los controllers (parseFloat
# sobre dinero). Es deuda real registrada en ESTADO.md, NO se activa como
# bloqueante aún: bloquearía cada tarea hasta migrar todo a numeric/Decimal.
# Se activa cuando exista el ticket de refactor. Ver docs/ESTADO.md.
CHECKS_EXTRA=()

gate_run "$@"
