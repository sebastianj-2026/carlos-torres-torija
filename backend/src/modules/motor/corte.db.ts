/**
 * M13 · DB shell for the monthly cut. Reads active investments, builds
 * candidates with the pure core, and inserts them idempotently:
 * `ON CONFLICT DO NOTHING` leans on the `devengos_idempotente` unique index,
 * so running the cut twice leaves the exact same state (R20, C7).
 */
import { Pool } from 'pg';
import {
  devengosRendimiento, devengosComision,
  InversionFuente, ReferenciaFuente,
} from './corte';

export interface ResultadoCorte {
  candidatos: number;
  insertados: number;
  omitidos: number; // already existed (idempotency) or rounded to zero
}

export async function generarCorte(pool: Pool, mes: number, anio: number): Promise<ResultadoCorte> {
  if (!Number.isInteger(mes) || mes < 1 || mes > 12 || !Number.isInteger(anio)) {
    throw new Error('Periodo inválido: mes 1-12 y año entero.');
  }

  const inversiones = await pool.query<InversionFuente>(
    `SELECT id, inversionista_id, monto_actual::text, tasa_interes_mensual::text, estatus
       FROM inversiones WHERE estatus = 'activo'`,
  );

  // M14: living base — capital of the origin at cut time (R3).
  const referencias = await pool.query<ReferenciaFuente>(
    `SELECT r.id, r.referenciador_id, r.tipo_referido,
            COALESCE(r.inversion_id, r.prestamo_id) AS origen_id,
            r.tasa::text, r.estado,
            CASE WHEN r.tipo_referido = 'inversion'
                 THEN i.monto_actual ELSE p.saldo_pendiente END::text AS base_vigente,
            CASE WHEN r.tipo_referido = 'inversion'
                 THEN i.estatus ELSE p.estatus END AS origen_estatus
       FROM referencias r
       LEFT JOIN inversiones i ON i.id = r.inversion_id
       LEFT JOIN prestamos  p ON p.id = r.prestamo_id
      WHERE r.estado = 'activa'`,
  );

  const candidatos = [
    ...devengosRendimiento(inversiones.rows, mes, anio)
      .map((d) => ({ ...d, referenciador_id: null as string | null })),
    ...devengosComision(referencias.rows, mes, anio)
      .map((d) => ({ ...d, inversionista_id: null as string | null })),
  ];

  let insertados = 0;
  for (const d of candidatos) {
    const res = await pool.query(
      `INSERT INTO devengos
         (inversionista_id, referenciador_id, concepto, origen_tipo, origen_id,
          periodo_mes, periodo_anio, base_capital, tasa, monto_devengado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT DO NOTHING`,
      ['inversionista_id' in d ? d.inversionista_id : null,
       'referenciador_id' in d ? d.referenciador_id : null,
       d.concepto, d.origen_tipo, d.origen_id,
       d.periodo_mes, d.periodo_anio, d.base_capital, d.tasa, d.monto_devengado],
    );
    insertados += res.rowCount ?? 0;
  }

  return { candidatos: candidatos.length, insertados, omitidos: candidatos.length - insertados };
}
