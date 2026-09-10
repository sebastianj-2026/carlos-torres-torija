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

  // Temporary referral fixtures so the cut also exercises comision accruals
  // (M14). Deleted at the end unless --keep.
  const inv = (await pool.query('SELECT id FROM inversiones LIMIT 1')).rows[0];
  const pre = (await pool.query('SELECT id FROM prestamos LIMIT 1')).rows[0];
  const rdor = (await pool.query(
    `INSERT INTO referenciadores (nombres, apellido_paterno)
     VALUES ('Prueba','CorteM14') RETURNING id`,
  )).rows[0];
  await pool.query(
    `INSERT INTO referencias (referenciador_id, tipo_referido, inversion_id, tasa, fecha_inicio)
     VALUES ($1, 'inversion', $2, '0.50', CURRENT_DATE)`,
    [rdor.id, inv.id],
  );
  if (pre) {
    await pool.query(
      `INSERT INTO referencias (referenciador_id, tipo_referido, prestamo_id, tasa, fecha_inicio)
       VALUES ($1, 'prestamo', $2, '0.75', CURRENT_DATE)`,
      [rdor.id, pre.id],
    );
  }

  const uno = await generarCorte(pool, 9, 2026);
  const dos = await generarCorte(pool, 9, 2026);
  const filas = await pool.query(
    `SELECT concepto, count(*)::int AS n, sum(monto_devengado)::text AS total
       FROM devengos WHERE periodo_mes = 9 AND periodo_anio = 2026
      GROUP BY concepto ORDER BY concepto`,
  );

  console.log('corrida 1:', JSON.stringify(uno));
  console.log('corrida 2:', JSON.stringify(dos));
  console.log('en tabla :', JSON.stringify(filas.rows));
  console.log('C7', dos.insertados === 0 ? 'OK' : 'FALLA');

  if (!keep) {
    const d1 = await pool.query(
      'DELETE FROM devengos WHERE periodo_mes = 9 AND periodo_anio = 2026',
    );
    const d2 = await pool.query('DELETE FROM referencias WHERE referenciador_id = $1', [rdor.id]);
    const d3 = await pool.query('DELETE FROM referenciadores WHERE id = $1', [rdor.id]);
    console.log('limpieza:', d1.rowCount, 'devengos,', d2.rowCount, 'referencias,', d3.rowCount, 'referenciador');
  }
  await pool.end();
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
