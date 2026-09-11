/**
 * Migration runner for the flat SQL files in database/ against Neon (dev).
 * Wraps the same mechanism as apply-migration.js but tracks state in the
 * `_migraciones` table so the gate can verify apply/revert/reapply.
 *
 * Commands:
 *   node scripts/migrar.js up        Apply every pending *.up.sql, in filename
 *                                    order. Exit 0 if none ("al dia").
 *   node scripts/migrar.js down      Revert the LAST applied migration that is
 *                                    NOT sealed, using its .down.sql. If every
 *                                    applied migration is sealed, no-op exit 0
 *                                    (closed tasks are never auto-reverted).
 *   node scripts/migrar.js sellar    Seal all applied migrations. Run when a
 *                                    data task closes: from then on the gate's
 *                                    down/up cycle will not touch them.
 *   node scripts/migrar.js baseline  First run only: registers every existing
 *                                    migration_*.sql already applied by hand,
 *                                    sealed, without executing anything.
 *   node scripts/migrar.js status    List tracked vs pending.
 *
 * Conventions:
 *   - New migrations are PAIRS: <fecha>_<nombre>.up.sql + .down.sql, e.g.
 *     2026-09-15_indices_devengos.up.sql. The date prefix gives the order.
 *   - Legacy files (migration_*.sql / *.up.sql without date) live in the
 *     baseline and are never re-run by this script.
 *   - Each .up.sql still carries its own BEGIN/COMMIT and idempotency guards.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'database');
const { Pool } = require(path.join(ROOT, 'backend', 'node_modules', 'pg'));

function readDatabaseUrl() {
  const txt = fs.readFileSync(path.join(ROOT, 'backend', '.env'), 'utf8');
  const m = txt.match(/^\s*DATABASE_URL\s*=\s*(.+?)\s*$/m);
  if (!m) throw new Error('DATABASE_URL no encontrada en backend/.env');
  return m[1].trim().replace(/^["']|["']$/g, '');
}

// Every migration file, .down.sql excluded. Sorted by filename: the date
// prefix of new files gives chronological order; baseline files never re-run.
function archivosMigracion() {
  return fs.readdirSync(DIR)
    .filter((f) => /^(migration_|\d{4}-\d{2}-\d{2}_).*\.sql$/.test(f))
    .filter((f) => !f.endsWith('.down.sql'))
    .sort();
}

async function main() {
  const cmd = process.argv[2];
  const pool = new Pool({
    connectionString: readDatabaseUrl(),
    ssl: { rejectUnauthorized: true },
    max: 1,
  });

  const fin = async (code) => { await pool.end(); process.exit(code); };

  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migraciones (
      nombre     TEXT PRIMARY KEY,
      aplicada_en TIMESTAMPTZ NOT NULL DEFAULT now(),
      sellada    BOOLEAN NOT NULL DEFAULT false
    )`);

  const { rows: aplicadas } = await pool.query(
    'SELECT nombre, sellada FROM _migraciones ORDER BY aplicada_en, nombre');
  const nombres = new Set(aplicadas.map((r) => r.nombre));
  const pendientes = archivosMigracion().filter((f) => !nombres.has(f));

  if (cmd === 'status') {
    for (const r of aplicadas) console.log(`aplicada${r.sellada ? ' (sellada)' : ''}  ${r.nombre}`);
    for (const f of pendientes) console.log(`pendiente  ${f}`);
    if (aplicadas.length === 0 && pendientes.length === 0) console.log('nada que reportar');
    return fin(0);
  }

  if (cmd === 'baseline') {
    if (aplicadas.length > 0) {
      console.error('La tabla _migraciones ya tiene filas — baseline solo corre una vez.');
      return fin(1);
    }
    for (const f of archivosMigracion()) {
      await pool.query(
        'INSERT INTO _migraciones (nombre, sellada) VALUES ($1, true)', [f]);
      console.log(`baseline  ${f}`);
    }
    return fin(0);
  }

  if (cmd === 'up') {
    if (pendientes.length === 0) { console.log('al dia — sin migraciones pendientes'); return fin(0); }
    for (const f of pendientes) {
      const sql = fs.readFileSync(path.join(DIR, f), 'utf8');
      try {
        await pool.query(sql);
      } catch (e) {
        console.error(`✗ ${f}: ${e.message}`);
        return fin(1);
      }
      await pool.query('INSERT INTO _migraciones (nombre) VALUES ($1)', [f]);
      console.log(`✓ aplicada  ${f}`);
    }
    return fin(0);
  }

  if (cmd === 'down') {
    const abiertas = aplicadas.filter((r) => !r.sellada);
    if (abiertas.length === 0) {
      console.log('nada que revertir — todo lo aplicado esta sellado');
      return fin(0);
    }
    const ultima = abiertas[abiertas.length - 1].nombre;
    const down = ultima.replace(/\.up\.sql$/, '.down.sql');
    const downPath = path.join(DIR, down);
    if (down === ultima || !fs.existsSync(downPath)) {
      console.error(`✗ ${ultima} no tiene .down.sql — reversa manual obligatoria`);
      return fin(1);
    }
    try {
      await pool.query(fs.readFileSync(downPath, 'utf8'));
    } catch (e) {
      console.error(`✗ ${down}: ${e.message}`);
      return fin(1);
    }
    await pool.query('DELETE FROM _migraciones WHERE nombre = $1', [ultima]);
    console.log(`✓ revertida  ${ultima}`);
    return fin(0);
  }

  if (cmd === 'sellar') {
    const { rowCount } = await pool.query(
      'UPDATE _migraciones SET sellada = true WHERE NOT sellada');
    console.log(`selladas: ${rowCount}`);
    return fin(0);
  }

  console.error('Uso: node scripts/migrar.js up|down|sellar|baseline|status');
  return fin(2);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
