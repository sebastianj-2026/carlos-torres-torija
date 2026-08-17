/**
 * Runner mínimo de migraciones SQL contra Neon.
 * Lee DATABASE_URL de backend/.env y ejecuta el archivo .sql que le pases
 * (el archivo trae su propio BEGIN/COMMIT).
 *
 * Uso:
 *   node scripts/apply-migration.js database/migration_personas_slice.up.sql
 *
 * Reversa: pásale el .down.sql correspondiente.
 * No versionar credenciales: la URL sale de backend/.env (gitignored).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const { Pool } = require(path.join(ROOT, 'backend', 'node_modules', 'pg'));

function readDatabaseUrl() {
  const envPath = path.join(ROOT, 'backend', '.env');
  const txt = fs.readFileSync(envPath, 'utf8');
  const m = txt.match(/^\s*DATABASE_URL\s*=\s*(.+?)\s*$/m);
  if (!m) throw new Error('DATABASE_URL no encontrada en backend/.env');
  return m[1].trim().replace(/^["']|["']$/g, '');
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Uso: node scripts/apply-migration.js <archivo.sql>');
    process.exit(2);
  }
  const abs = path.resolve(file);
  const sql = fs.readFileSync(abs, 'utf8');

  const pool = new Pool({
    connectionString: readDatabaseUrl(),
    // Neon emite certificados de CA confiable → verificamos TLS (no MITM).
    ssl: { rejectUnauthorized: true },
  });

  try {
    await pool.query(sql);
    console.log('✅ Aplicada:', file);
  } catch (e) {
    console.error('❌ Error aplicando', file);
    console.error('  ', e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
