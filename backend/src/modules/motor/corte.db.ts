/**
 * M13 · DB shell for the monthly cut. Reads active investments, builds
 * candidates with the pure core, and inserts them idempotently:
 * `ON CONFLICT DO NOTHING` leans on the `devengos_idempotente` unique index,
 * so running the cut twice leaves the exact same state (R20, C7).
 */
import { Pool } from 'pg';
import { devengosRendimiento, InversionFuente } from './corte';

export interface ResultadoCorte {
  candidatos: number;
  insertados: number;
  omitidos: number; // already existed (idempotency) or rounded to zero
}

export async function generarCorte(pool: Pool, mes: number, anio: number): Promise<ResultadoCorte> {
  if (!Number.isInteger(mes) || mes < 1 || mes > 12 || !Number.isInteger(anio)) {
    throw new Error('Periodo inválido: mes 1-12 y año entero.');
  }

  const { rows } = await pool.query<InversionFuente>(
    `SELECT id, inversionista_id, monto_actual::text, tasa_interes_mensual::text, estatus
       FROM inversiones WHERE estatus = 'activo'`,
  );

  const candidatos = devengosRendimiento(rows, mes, anio);

  let insertados = 0;
  for (const d of candidatos) {
    const res = await pool.query(
      `INSERT INTO devengos
         (inversionista_id, concepto, origen_tipo, origen_id,
          periodo_mes, periodo_anio, base_capital, tasa, monto_devengado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT DO NOTHING`,
      [d.inversionista_id, d.concepto, d.origen_tipo, d.origen_id,
       d.periodo_mes, d.periodo_anio, d.base_capital, d.tasa, d.monto_devengado],
    );
    insertados += res.rowCount ?? 0;
  }

  return { candidatos: candidatos.length, insertados, omitidos: candidatos.length - insertados };
}
