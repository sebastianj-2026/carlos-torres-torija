import { Request, Response } from 'express';
import pool from '../config/database';
import {
  porcentajeHalfUp, sumaMontos, restaMontos, restaPiso0, comparaMontos, esCero,
} from '../lib/dinero';

// Plain money input: up to 2 decimals, >= 0 (docs/DINERO.md D1)
const esMontoPlano = (s: string): boolean => /^\d+(\.\d{1,2})?$/.test(s.trim());

// ================================================================
// GET /api/cobros/calendario?mes=4&anio=2026
// ================================================================
export const obtenerCalendario = async (req: Request, res: Response): Promise<void> => {
  try {
    const hoy    = new Date();
    const mes    = parseInt(req.query.mes  as string, 10) || (hoy.getMonth() + 1);
    const anio   = parseInt(req.query.anio as string, 10) || hoy.getFullYear();
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
      // SQL already rounds half-up (Postgres ROUND on NUMERIC); JS math on
      // these values must stay exact — no float subtraction (M39, D1).
      const interesS = parseFloat(r.interes_sugerido);
      const interesC = parseFloat(r.interes_cobrado_periodo);
      const diaPago  = r.dia_pago;

      let estatusPago: string;
      if (comparaMontos(r.interes_cobrado_periodo, r.interes_sugerido) >= 0 && !esCero(r.interes_cobrado_periodo)) {
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
        faltante:                Number(restaPiso0(r.interes_sugerido, r.interes_cobrado_periodo)),
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

  // Money stays string end-to-end; exact cents inside (M39, D1).
  // Validate BEFORE taking a pool connection.
  const interesPagado = String(interes_pagado ?? '0').trim() || '0';
  const abonoCapital  = String(abono_capital  ?? '0').trim() || '0';

  if (!esMontoPlano(interesPagado)) {
    res.status(400).json({ mensaje: 'El monto de interés es inválido (decimal con hasta 2 decimales).' }); return;
  }
  if (!esMontoPlano(abonoCapital)) {
    res.status(400).json({ mensaje: 'El abono a capital es inválido (decimal con hasta 2 decimales).' }); return;
  }
  if (!periodo_mes || !periodo_anio) {
    res.status(400).json({ mensaje: 'El período (mes y año) es obligatorio.' }); return;
  }

  const client = await pool.connect();
  try {
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
    const saldoAnterior: string = prestamo.saldo_pendiente;
    // interés = saldo × tasa / 100, half-up exact (D1, C2/C3)
    const interesS = porcentajeHalfUp(saldoAnterior, prestamo.tasa_interes_mensual);
    const tipoCobro =
      comparaMontos(interesPagado, interesS) >= 0 && !esCero(interesPagado)
        ? 'pago_total' : 'pago_parcial';

    // Interest payment
    if (!esCero(interesPagado)) {
      await client.query(
        `INSERT INTO historial_pagos_prestamo
           (prestamo_id, tipo_pago, monto, forma_pago, periodo_mes, periodo_anio, notas, registrado_por)
         VALUES ($1, 'interes', $2, $3, $4, $5, $6, $7)`,
        [id, interesPagado, forma_pago || null, periodo_mes, periodo_anio, notas || null, registrado_por || null]
      );
    }

    let nuevoSaldo = saldoAnterior;

    // Capital abono
    if (!esCero(abonoCapital)) {
      if (comparaMontos(abonoCapital, saldoAnterior) > 0) {
        await client.query('ROLLBACK');
        res.status(400).json({ mensaje: 'El abono a capital supera el saldo pendiente.' }); return;
      }
      await client.query(
        `INSERT INTO historial_pagos_prestamo
           (prestamo_id, tipo_pago, monto, forma_pago, periodo_mes, periodo_anio, notas, registrado_por)
         VALUES ($1, 'capital', $2, $3, $4, $5, $6, $7)`,
        [id, abonoCapital, forma_pago || null, periodo_mes, periodo_anio, notas || null, registrado_por || null]
      );
      nuevoSaldo = restaMontos(saldoAnterior, abonoCapital);
      await client.query(
        'UPDATE prestamos SET saldo_pendiente = $1, fecha_actualizacion = NOW() WHERE id = $2',
        [nuevoSaldo, id]
      );
    }

    // Mirror into historial_ingresos: mandatory separation of utilidad vs retorno de capital
    const montoTotalCobro = sumaMontos([interesPagado, abonoCapital]);
    if (!esCero(montoTotalCobro)) {
      await client.query(
        `INSERT INTO historial_ingresos
           (origen, referencia_id, monto_total_cobrado, monto_utilidad, monto_capital_recuperado,
            periodo_mes, periodo_anio, notas, registrado_por)
         VALUES ('Prestamo', $1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          id, montoTotalCobro, interesPagado, abonoCapital,
          parseInt(periodo_mes, 10), parseInt(periodo_anio, 10),
          notas || null, registrado_por || null,
        ]
      );
    }

    await client.query('COMMIT');

    const interesProximoMes = porcentajeHalfUp(nuevoSaldo, prestamo.tasa_interes_mensual);

    // The recibo keeps numbers at the response edge: exact 2-decimal strings
    // convert losslessly and the frontend contract does not change.
    res.json({
      recibo: {
        folio_prestamo:     prestamo.folio,
        cliente_nombre:     prestamo.cliente_nombre,
        fecha_pago:         new Date().toISOString(),
        interes_sugerido:   Number(interesS),
        interes_pagado:     Number(interesPagado),
        faltante:           Number(restaPiso0(interesS, interesPagado)),
        abono_capital:      Number(abonoCapital),
        saldo_anterior:     Number(saldoAnterior),
        nuevo_saldo:        Number(nuevoSaldo),
        interes_proximo_mes: Number(interesProximoMes),
        forma_pago:         forma_pago || 'efectivo',
        tipo_cobro:         tipoCobro,
        periodo_mes:        parseInt(periodo_mes, 10),
        periodo_anio:       parseInt(periodo_anio, 10),
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
