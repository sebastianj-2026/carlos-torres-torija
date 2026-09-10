/**
 * C7 · One-shot integration check for the cut's DB idempotency (R20).
 * Run: npx ts-node src/modules/motor/corte.integracion.ts [--keep]
 * Without --keep it deletes the generated rows at the end (dry-run mode).
 */
import * as dotenv from 'dotenv';
import { Pool } from 'pg';
import { generarCorte } from './corte.db';

dotenv.config();

(async () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true },
  });
  const keep = process.argv.includes('--keep');

  const uno = await generarCorte(pool, 9, 2026);
  const dos = await generarCorte(pool, 9, 2026);
  const filas = await pool.query(
    `SELECT count(*)::int AS n, COALESCE(sum(monto_devengado), 0)::text AS total
       FROM devengos WHERE periodo_mes = 9 AND periodo_anio = 2026`,
  );

  console.log('corrida 1:', JSON.stringify(uno));
  console.log('corrida 2:', JSON.stringify(dos));
  console.log('en tabla :', JSON.stringify(filas.rows[0]));
  console.log('C7', dos.insertados === 0 && uno.insertados === filas.rows[0].n ? 'OK' : 'FALLA');

  if (!keep) {
    const del = await pool.query(
      'DELETE FROM devengos WHERE periodo_mes = 9 AND periodo_anio = 2026',
    );
    console.log('limpieza:', del.rowCount, 'filas');
  }
  await pool.end();
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
