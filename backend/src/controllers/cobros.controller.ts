import { Request, Response } from 'express';
import pool from '../config/database';

// ================================================================
// GET /api/cobros/calendario?mes=4&anio=2026
// ================================================================
export const obtenerCalendario = async (req: Request, res: Response): Promise<void> => {
  try {
    const hoy    = new Date();
    const mes    = parseInt(req.query.mes  as string) || (hoy.getMonth() + 1);
    const anio   = parseInt(req.query.anio as string) || hoy.getFullYear();
    const diahoy = hoy.getDate();

    // Is the requested period the current month?
    const esMesActual = mes === (hoy.getMonth() + 1) && anio === hoy.getFullYear();
    const esMesPasado = anio < hoy.getFullYear() || (anio === hoy.getFullYear() && mes < (hoy.getMonth() + 1));

    const resultado = await pool.query(
      `SELECT
          p.id,
          p.folio,
          CONCAT(c.nombres, ' ', c.apellido_paterno,
            CASE WHEN c.apellido_materno IS NOT NULL THEN ' ' || c.apellido_materno ELSE '' END
          ) AS cliente_nombre,
          c.id AS cliente_id,
          p.saldo_pendiente::NUMERIC AS saldo_pendiente,
          p.tasa_interes_mensual::NUMERIC AS tasa_interes_mensual,
          ROUND(p.saldo_pendiente * p.tasa_interes_mensual / 100, 2)::NUMERIC AS interes_sugerido,
          EXTRACT(DAY FROM p.fecha_inicio)::INTEGER AS dia_pago,
          p.plazo_meses,
          (SELECT COUNT(*) FROM historial_pagos_prestamo hp
             WHERE hp.prestamo_id = p.id
               AND hp.tipo_pago != 'interes_anticipado')::INTEGER AS pagos_realizados,
          COALESCE((
            SELECT SUM(hp.monto)
            FROM historial_pagos_prestamo hp
            WHERE hp.prestamo_id = p.id
              AND hp.tipo_pago = 'interes'
              AND hp.periodo_mes  = $1
              AND hp.periodo_anio = $2
          ), 0)::NUMERIC AS interes_cobrado_periodo,
          COALESCE((
            SELECT SUM(hp.monto)
            FROM historial_pagos_prestamo hp
            WHERE hp.prestamo_id = p.id
              AND hp.tipo_pago = 'capital'
              AND hp.periodo_mes  = $1
              AND hp.periodo_anio = $2
          ), 0)::NUMERIC AS abono_capital_periodo
        FROM prestamos p
        JOIN clientes c ON c.id = p.cliente_id
        WHERE p.estatus IN ('activo', 'atrasado')
        ORDER BY EXTRACT(DAY FROM p.fecha_inicio)::INTEGER ASC,
                 c.apellido_paterno ASC`,
      [mes, anio]
    );

    const filas = resultado.rows.map((r) => {
      const interesS = parseFloat(r.interes_sugerido);
      const interesC = parseFloat(r.interes_cobrado_periodo);
      const diaPago  = r.dia_pago;

      let estatusPago: string;
      if (interesC >= interesS && interesC > 0) {
        estatusPago = 'pagado';
      } else if (interesC > 0) {
        estatusPago = 'parcial';
      } else if (esMesPasado) {
        estatusPago = 'atrasado';
      } else if (!esMesActual) {
        // future month
        estatusPago = 'pendiente';
      } else {
        const diff = diahoy - diaPago;
        if (diff < 0) {
          estatusPago = 'pendiente';
        } else if (diff === 0) {
          estatusPago = 'al_corriente';
        } else if (diff < 7) {
          estatusPago = 'atrasadin';
        } else {
          estatusPago = 'atrasado';
        }
      }

      const pagosR: number = r.pagos_realizados;
      const numeroPago = interesC > 0 ? pagosR : pagosR + 1;

      return {
        id:                      r.id,
        folio:                   r.folio,
        cliente_nombre:          r.cliente_nombre,
        cliente_id:              r.cliente_id,
        saldo_pendiente:         parseFloat(r.saldo_pendiente),
        tasa_interes_mensual:    parseFloat(r.tasa_interes_mensual),
        interes_sugerido:        interesS,
        dia_pago:                diaPago,
        plazo_meses:             r.plazo_meses,
        pagos_realizados:        pagosR,
        numero_pago:             Math.min(numeroPago, r.plazo_meses),
        interes_cobrado_periodo: interesC,
        abono_capital_periodo:   parseFloat(r.abono_capital_periodo),
        faltante:                parseFloat(Math.max(0, interesS - interesC).toFixed(2)),
        estatus_pago:            estatusPago,
      };
    });

    res.json({ filas, mes, anio });
  } catch (error) {
    console.error('Error al obtener calendario:', error);
    res.status(500).json({ mensaje: 'Error interno al obtener el calendario de pagos.' });
  }
};

// ================================================================
// POST /api/cobros/:id/registrar
// Body: { interes_pagado, abono_capital?, forma_pago, notas?, periodo_mes, periodo_anio }
// ================================================================
export const registrarCobro = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const registrado_por = req.usuario?.userId;
    const {
      interes_pagado,
      abono_capital,
      forma_pago,
      notas,
      periodo_mes,
      periodo_anio,
    } = req.body;

    const interesPagado  = parseFloat(interes_pagado ?? '0');
    const abonoCapital   = parseFloat(abono_capital  ?? '0') || 0;

    if (interesPagado < 0) {
      res.status(400).json({ mensaje: 'El monto de interés no puede ser negativo.' }); return;
    }
    if (!periodo_mes || !periodo_anio) {
      res.status(400).json({ mensaje: 'El período (mes y año) es obligatorio.' }); return;
    }

    await client.query('BEGIN');

    const prestamoRes = await client.query(
      `SELECT p.*, CONCAT(c.nombres, ' ', c.apellido_paterno,
          CASE WHEN c.apellido_materno IS NOT NULL THEN ' ' || c.apellido_materno ELSE '' END
        ) AS cliente_nombre
       FROM prestamos p
       JOIN clientes c ON c.id = p.cliente_id
       WHERE p.id = $1 AND p.estatus IN ('activo','atrasado')
       FOR UPDATE`,
      [id]
    );
    if (prestamoRes.rowCount === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ mensaje: 'Préstamo no encontrado o no activo.' }); return;
    }

    const prestamo = prestamoRes.rows[0];
    const saldoAnterior = parseFloat(prestamo.saldo_pendiente);
    const interesS = parseFloat((saldoAnterior * parseFloat(prestamo.tasa_interes_mensual) / 100).toFixed(2));
    const tipoCobro = interesPagado >= interesS && interesPagado > 0 ? 'pago_total' : 'pago_parcial';

    // Interest payment
    if (interesPagado > 0) {
      await client.query(
        `INSERT INTO historial_pagos_prestamo
           (prestamo_id, tipo_pago, monto, forma_pago, periodo_mes, periodo_anio, notas, registrado_por)
         VALUES ($1, 'interes', $2, $3, $4, $5, $6, $7)`,
        [id, interesPagado, forma_pago || null, periodo_mes, periodo_anio, notas || null, registrado_por || null]
      );
    }

    let nuevoSaldo = saldoAnterior;

    // Capital abono
    if (abonoCapital > 0) {
      if (abonoCapital > saldoAnterior) {
        await client.query('ROLLBACK');
        res.status(400).json({ mensaje: 'El abono a capital supera el saldo pendiente.' }); return;
      }
      await client.query(
        `INSERT INTO historial_pagos_prestamo
           (prestamo_id, tipo_pago, monto, forma_pago, periodo_mes, periodo_anio, notas, registrado_por)
         VALUES ($1, 'capital', $2, $3, $4, $5, $6, $7)`,
        [id, abonoCapital, forma_pago || null, periodo_mes, periodo_anio, notas || null, registrado_por || null]
      );
      nuevoSaldo = parseFloat((saldoAnterior - abonoCapital).toFixed(2));
      await client.query(
        'UPDATE prestamos SET saldo_pendiente = $1, fecha_actualizacion = NOW() WHERE id = $2',
        [nuevoSaldo, id]
      );
    }

    // Mirror into historial_ingresos: mandatory separation of utilidad vs retorno de capital
    const montoTotalCobro = parseFloat((interesPagado + abonoCapital).toFixed(2));
    if (montoTotalCobro > 0) {
      await client.query(
        `INSERT INTO historial_ingresos
           (origen, referencia_id, monto_total_cobrado, monto_utilidad, monto_capital_recuperado,
            periodo_mes, periodo_anio, notas, registrado_por)
         VALUES ('Prestamo', $1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          id, montoTotalCobro, interesPagado, abonoCapital,
          parseInt(periodo_mes), parseInt(periodo_anio),
          notas || null, registrado_por || null,
        ]
      );
    }

    await client.query('COMMIT');

    const interesProximoMes = parseFloat((nuevoSaldo * parseFloat(prestamo.tasa_interes_mensual) / 100).toFixed(2));

    res.json({
      recibo: {
        folio_prestamo:     prestamo.folio,
        cliente_nombre:     prestamo.cliente_nombre,
        fecha_pago:         new Date().toISOString(),
        interes_sugerido:   interesS,
        interes_pagado:     interesPagado,
        faltante:           parseFloat(Math.max(0, interesS - interesPagado).toFixed(2)),
        abono_capital:      abonoCapital,
        saldo_anterior:     saldoAnterior,
        nuevo_saldo:        nuevoSaldo,
        interes_proximo_mes: interesProximoMes,
        forma_pago:         forma_pago || 'efectivo',
        tipo_cobro:         tipoCobro,
        periodo_mes:        parseInt(periodo_mes),
        periodo_anio:       parseInt(periodo_anio),
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al registrar cobro:', error);
    res.status(500).json({ mensaje: 'Error interno al registrar el cobro.' });
  } finally {
    client.release();
  }
};
