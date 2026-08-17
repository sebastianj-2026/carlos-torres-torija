import { Request, Response } from 'express';
import pool from '../config/database';

// ============================================================================
// Módulo comisiones — T-005: corte del periodo (generación de devengos).
// Ver docs/modulos/comisiones/{MODULO,REGLAS,DATOS}.md.
//
// El corte DEVENGA SIEMPRE (R11): no depende de lo cobrado, solo de las
// aportaciones activas. Genera, por cada aportación activa:
//   - un devengo de 'rendimiento' para el inversionista
//   - un devengo de 'comision' para el referenciador (si existe)
//
// El monto se calcula en SQL NUMERIC (round(base*tasa, 2)) — nunca en JS —
// para no romper la regla dinero-sin-float. La regla de cálculo (base*tasa,
// 2 decimales) es la misma de reparto.ts (R1/R23).
//
// R18: base_capital y tasa quedan CONGELADOS en la fila del devengo.
// R20: idempotencia por el UNIQUE corte_idempotente + ON CONFLICT DO NOTHING —
//      correr el mismo periodo dos veces no duplica (caso 7).
// ============================================================================

const PERIODO_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/; // 'YYYY-MM'

export const generarCorte = async (req: Request, res: Response): Promise<void> => {
  const rawPeriodo = req.params.periodo;
  const periodo = Array.isArray(rawPeriodo) ? rawPeriodo[0] : rawPeriodo;
  if (!periodo || !PERIODO_REGEX.test(periodo)) {
    res.status(400).json({ mensaje: 'periodo inválido. Formato esperado: YYYY-MM.' });
    return;
  }
  const periodoDate = `${periodo}-01`; // primer día del mes (devengos.periodo es DATE)

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Rendimiento del inversionista.
    const rend = await client.query(
      `INSERT INTO devengos
         (persona_id, concepto, origen_tipo, origen_id, periodo, base_capital, tasa, monto_devengado)
       SELECT a.inversionista_id, 'rendimiento', 'aportacion', a.id, $1::date,
              a.monto, a.tasa_inversionista, round(a.monto * a.tasa_inversionista, 2)
         FROM aportaciones a
        WHERE a.estado = 'activa'
       ON CONFLICT (persona_id, concepto, origen_tipo, origen_id, periodo) DO NOTHING
       RETURNING id`,
      [periodoDate]
    );

    // Comisión del referenciador (solo aportaciones con referidor).
    const comi = await client.query(
      `INSERT INTO devengos
         (persona_id, concepto, origen_tipo, origen_id, periodo, base_capital, tasa, monto_devengado)
       SELECT a.referenciador_id, 'comision', 'aportacion', a.id, $1::date,
              a.monto, a.tasa_referenciador, round(a.monto * a.tasa_referenciador, 2)
         FROM aportaciones a
        WHERE a.estado = 'activa' AND a.referenciador_id IS NOT NULL
       ON CONFLICT (persona_id, concepto, origen_tipo, origen_id, periodo) DO NOTHING
       RETURNING id`,
      [periodoDate]
    );

    await client.query('COMMIT');

    const generadosRend = rend.rowCount ?? 0;
    const generadosComi = comi.rowCount ?? 0;
    res.status(201).json({
      periodo,
      generados_rendimiento: generadosRend,
      generados_comision: generadosComi,
      total_generados: generadosRend + generadosComi,
      // Si ambos son 0, el periodo ya se había corrido (idempotencia R20).
      ya_corrido: generadosRend === 0 && generadosComi === 0,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al generar el corte:', error);
    res.status(500).json({ mensaje: 'Error interno al generar el corte del periodo.' });
  } finally {
    client.release();
  }
};
