import { Request, Response } from 'express';
import pool from '../config/database';
import { UsuarioAutenticado } from '../middlewares/auth.middleware';

// ── Audit helper ───────────────────────────────────────────────────
const log = async (
  tabla: string,
  registroId: string,
  accion: string,
  detalle: object | null,
  usuario: UsuarioAutenticado | undefined
) => {
  try {
    await pool.query(
      `INSERT INTO logs_auditoria
         (modulo, tabla, registro_id, accion, detalle, usuario_id, usuario_nombre, usuario_correo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      ['cuentas_pagar', tabla, registroId, accion,
        detalle ? JSON.stringify(detalle) : null,
        usuario?.userId || null, usuario?.nombre || null, usuario?.correo || null]
    );
  } catch { /* non-blocking */ }
};

// ================================================================
// CUENTAS POR PAGAR
// ================================================================

// GET /api/tesoreria/cuentas-pagar?mes=4&anio=2026&estatus=pendiente
export const listarCuentasPagar = async (req: Request, res: Response): Promise<void> => {
  try {
    const hoy   = new Date();
    const mes   = parseInt(req.query.mes  as string) || (hoy.getMonth() + 1);
    const anio  = parseInt(req.query.anio as string) || hoy.getFullYear();
    const estatus = (req.query.estatus as string) || '';

    const condiciones: string[] = [
      `EXTRACT(YEAR  FROM cp.fecha_vencimiento)::INTEGER = $1`,
      `EXTRACT(MONTH FROM cp.fecha_vencimiento)::INTEGER = $2`,
    ];
    const valores: (string | number)[] = [anio, mes];
    let idx = 3;

    if (estatus) { condiciones.push(`cp.estatus = $${idx++}`); valores.push(estatus); }

    const resultado = await pool.query(
      `SELECT
         cp.*,
         EXTRACT(DAY FROM cp.fecha_vencimiento)::INTEGER AS dia_vencimiento,
         cb.alias AS cuenta_bancaria_alias,
         -- loan info when auto-generated
         p.folio AS prestamo_folio,
         CONCAT(cl.nombres, ' ', cl.apellido_paterno) AS cliente_nombre,
         -- payment history aggregated
         (SELECT json_agg(pcp ORDER BY pcp.fecha_pago DESC)
          FROM pagos_cuentas_pagar pcp
          WHERE pcp.cuenta_pagar_id = cp.id) AS pagos
       FROM cuentas_pagar cp
       LEFT JOIN prestamos p  ON p.id  = cp.prestamo_id
       LEFT JOIN clientes  cl ON cl.id = p.cliente_id
       LEFT JOIN cuentas_bancarias cb ON cb.id = (
         SELECT pcp2.cuenta_bancaria_id FROM pagos_cuentas_pagar pcp2
         WHERE pcp2.cuenta_pagar_id = cp.id ORDER BY pcp2.fecha_registro DESC LIMIT 1
       )
       WHERE ${condiciones.join(' AND ')}
       ORDER BY EXTRACT(DAY FROM cp.fecha_vencimiento) ASC, cp.fecha_registro ASC`,
      valores
    );

    res.json({ cuentas: resultado.rows, mes, anio });
  } catch (error) {
    console.error('Error al listar cuentas por pagar:', error);
    res.status(500).json({ mensaje: 'Error interno.' });
  }
};

// POST /api/tesoreria/cuentas-pagar   — cuenta manual
export const crearCuentaPagar = async (req: Request, res: Response): Promise<void> => {
  try {
    const usuario = req.usuario;
    const { concepto, monto_estimado, fecha_vencimiento, tipo = 'manual', prestamo_id, notas } = req.body;

    if (!concepto?.trim())    { res.status(400).json({ mensaje: 'Concepto requerido.' }); return; }
    if (!monto_estimado || parseFloat(monto_estimado) <= 0) {
      res.status(400).json({ mensaje: 'Monto debe ser mayor a cero.' }); return;
    }
    if (!fecha_vencimiento) { res.status(400).json({ mensaje: 'Fecha de vencimiento requerida.' }); return; }

    const resultado = await pool.query(
      `INSERT INTO cuentas_pagar
         (concepto, monto_estimado, fecha_vencimiento, tipo, prestamo_id, notas, registrado_por, auto_generado)
       VALUES ($1,$2,$3,$4,$5,$6,$7,false)
       RETURNING *`,
      [
        concepto.trim(),
        parseFloat(monto_estimado),
        fecha_vencimiento,
        tipo,
        prestamo_id || null,
        notas?.trim() || null,
        usuario?.userId || null,
      ]
    );

    const cuenta = resultado.rows[0];
    await log('cuentas_pagar', cuenta.id, 'crear', { concepto, monto_estimado, tipo }, usuario);
    res.status(201).json({ mensaje: 'Cuenta por pagar registrada.', cuenta });
  } catch (error) {
    console.error('Error al crear cuenta por pagar:', error);
    res.status(500).json({ mensaje: 'Error interno.' });
  }
};

// POST /api/tesoreria/cuentas-pagar/auto-prestamo/:prestamoId
// Genera cuentas por pagar de avalúo y gastos notariales de un préstamo
export const generarDesdePrestamo = async (req: Request, res: Response): Promise<void> => {
  try {
    const usuario   = req.usuario;
    const { prestamoId } = req.params;

    const pResult = await pool.query(
      `SELECT p.id, p.folio, p.avaluo, p.gastos_notariales, p.apertura,
              p.fecha_inicio,
              CONCAT(c.nombres, ' ', c.apellido_paterno) AS cliente
       FROM prestamos p
       JOIN clientes c ON c.id = p.cliente_id
       WHERE p.id = $1`,
      [prestamoId]
    );
    if (pResult.rowCount === 0) {
      res.status(404).json({ mensaje: 'Préstamo no encontrado.' }); return;
    }

    const p = pResult.rows[0];
    const generadas: object[] = [];

    const insertarSiMonto = async (
      monto: number,
      concepto: string,
      tipo: string
    ) => {
      if (!monto || monto <= 0) return;
      // Check if already generated for this loan + type
      const existe = await pool.query(
        `SELECT id FROM cuentas_pagar
         WHERE prestamo_id = $1 AND tipo = $2 AND auto_generado = true`,
        [prestamoId, tipo]
      );
      if (existe.rowCount && existe.rowCount > 0) return;

      const r = await pool.query(
        `INSERT INTO cuentas_pagar
           (concepto, monto_estimado, fecha_vencimiento, tipo,
            prestamo_id, notas, registrado_por, auto_generado)
         VALUES ($1,$2,$3,$4,$5,$6,$7,true)
         RETURNING *`,
        [
          concepto,
          monto,
          p.fecha_inicio,
          tipo,
          prestamoId,
          `Auto-generado del préstamo ${p.folio || prestamoId} — ${p.cliente}`,
          usuario?.userId || null,
        ]
      );
      generadas.push(r.rows[0]);
    };

    await insertarSiMonto(parseFloat(p.avaluo)            || 0, `Avalúo — ${p.folio || 'Préstamo'}`, 'avaluo');
    await insertarSiMonto(parseFloat(p.gastos_notariales)  || 0, `Gastos Notariales — ${p.folio || 'Préstamo'}`, 'gastos_notariales');
    await insertarSiMonto(parseFloat(p.apertura)           || 0, `Comisión Apertura — ${p.folio || 'Préstamo'}`, 'apertura');

    res.status(201).json({
      mensaje: `${generadas.length} cuenta(s) por pagar generadas del préstamo.`,
      generadas,
    });
  } catch (error) {
    console.error('Error al generar desde préstamo:', error);
    res.status(500).json({ mensaje: 'Error interno.' });
  }
};

// POST /api/tesoreria/cuentas-pagar/auto-rendimientos
// Genera rendimientos mensuales de todos los participantes activos
export const generarRendimientosInversionistas = async (req: Request, res: Response): Promise<void> => {
  try {
    const usuario   = req.usuario;
    const hoy       = new Date();
    const mes       = parseInt(req.body.mes  as string) || (hoy.getMonth() + 1);
    const anio      = parseInt(req.body.anio as string) || hoy.getFullYear();

    // Compute last day of given month for vencimiento
    const fechaVenc = new Date(anio, mes, 0).toISOString().split('T')[0];

    // Get all active loan participants that are investors (not oficina)
    const partsResult = await pool.query(
      `SELECT
         pp.id AS participante_id,
         pp.prestamo_id,
         pp.tasa_rendimiento,
         pp.monto_aportado,
         ROUND(pp.monto_aportado * pp.tasa_rendimiento / 100, 2) AS rendimiento_mensual,
         p.folio,
         p.estatus AS estatus_prestamo,
         COALESCE(pp.inversionista_nombre, 'Inversionista') AS nombre_inv
       FROM participantes_prestamo pp
       JOIN prestamos p ON p.id = pp.prestamo_id
       WHERE pp.es_oficina = false
         AND p.estatus IN ('activo', 'atrasado')`,
      []
    );

    const generadas: object[] = [];
    const omitidas: string[] = [];

    for (const part of partsResult.rows) {
      const rendimiento = parseFloat(part.rendimiento_mensual);
      if (rendimiento <= 0) continue;

      // Idempotent: skip if already generated for same period + participant
      const existe = await pool.query(
        `SELECT id FROM cuentas_pagar
         WHERE participante_id = $1
           AND periodo_mes  = $2
           AND periodo_anio = $3
           AND auto_generado = true`,
        [part.participante_id, mes, anio]
      );
      if (existe.rowCount && existe.rowCount > 0) {
        omitidas.push(part.participante_id);
        continue;
      }

      const r = await pool.query(
        `INSERT INTO cuentas_pagar
           (concepto, monto_estimado, fecha_vencimiento, tipo,
            prestamo_id, participante_id, periodo_mes, periodo_anio,
            notas, registrado_por, auto_generado)
         VALUES ($1,$2,$3,'rendimiento_inversionista',$4,$5,$6,$7,$8,$9,true)
         RETURNING *`,
        [
          `Rendimiento ${part.nombre_inv} — ${part.folio || part.prestamo_id} (${mes}/${anio})`,
          rendimiento,
          fechaVenc,
          part.prestamo_id,
          part.participante_id,
          mes,
          anio,
          `Tasa ${part.tasa_rendimiento}% sobre $${part.monto_aportado}`,
          usuario?.userId || null,
        ]
      );
      generadas.push(r.rows[0]);
    }

    await log('cuentas_pagar', 'batch', 'generar_rendimientos',
      { mes, anio, generadas: generadas.length, omitidas: omitidas.length }, usuario);

    res.status(201).json({
      mensaje: `${generadas.length} rendimiento(s) generados. ${omitidas.length} ya existían.`,
      generadas,
      omitidas: omitidas.length,
    });
  } catch (error) {
    console.error('Error al generar rendimientos:', error);
    res.status(500).json({ mensaje: 'Error interno.' });
  }
};

// POST /api/tesoreria/cuentas-pagar/:id/pagar
export const liquidarCuentaPagar = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const usuario        = req.usuario;
    const { id }         = req.params;
    const file           = (req as Request & { file?: Express.Multer.File }).file;
    const monto_real     = parseFloat(req.body.monto_real);
    const quien_pago     = req.body.quien_pago as string;
    const fuente_fondos  = req.body.fuente_fondos as string;
    const cuenta_banca_id = (req.body.cuenta_bancaria_id as string) || null;
    const notas          = req.body.notas as string | undefined;
    const fecha_pago     = req.body.fecha_pago as string | undefined;

    if (!monto_real || monto_real <= 0) {
      res.status(400).json({ mensaje: 'Monto real debe ser mayor a cero.' }); return;
    }
    if (!quien_pago?.trim()) {
      res.status(400).json({ mensaje: 'Quien pagó es requerido.' }); return;
    }
    if (!['caja_chica', 'cuenta_bancaria'].includes(fuente_fondos)) {
      res.status(400).json({ mensaje: 'Fuente de fondos inválida.' }); return;
    }
    if (fuente_fondos === 'cuenta_bancaria' && !cuenta_banca_id) {
      res.status(400).json({ mensaje: 'Selecciona la cuenta bancaria.' }); return;
    }

    // Validate account exists
    const cpResult = await client.query(
      'SELECT id, concepto, monto_estimado, monto_pagado, estatus FROM cuentas_pagar WHERE id = $1',
      [id]
    );
    if (cpResult.rowCount === 0) {
      res.status(404).json({ mensaje: 'Cuenta por pagar no encontrada.' }); return;
    }
    const cp = cpResult.rows[0];
    if (cp.estatus === 'pagado') {
      res.status(400).json({ mensaje: 'Esta cuenta ya está totalmente liquidada.' }); return;
    }

    await client.query('BEGIN');

    // Deduct from bank account if applicable
    if (fuente_fondos === 'cuenta_bancaria' && cuenta_banca_id) {
      const cuentaResult = await client.query(
        `SELECT saldo_actual FROM cuentas_bancarias WHERE id = $1 AND activa = true FOR UPDATE`,
        [cuenta_banca_id]
      );
      if (cuentaResult.rowCount === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ mensaje: 'Cuenta bancaria no encontrada.' }); return;
      }
      if (parseFloat(cuentaResult.rows[0].saldo_actual) < monto_real) {
        await client.query('ROLLBACK');
        res.status(400).json({
          mensaje: `Saldo insuficiente (${parseFloat(cuentaResult.rows[0].saldo_actual).toFixed(2)} MXN).`
        }); return;
      }
      await client.query(
        `UPDATE cuentas_bancarias SET saldo_actual = saldo_actual - $1, fecha_actualizacion = NOW() WHERE id = $2`,
        [monto_real, cuenta_banca_id]
      );
    }

    // Register as caja outflow if caja_chica
    if (fuente_fondos === 'caja_chica') {
      await client.query(
        `INSERT INTO movimientos_caja (tipo, concepto, monto, encargado, registrado_por)
         VALUES ('salida', $1, $2, $3, $4)`,
        [
          `Pago: ${cp.concepto}`,
          monto_real,
          quien_pago.trim(),
          usuario?.userId || null,
        ]
      );
    }

    // Insert payment record (trigger updates cuentas_pagar automatically)
    const pagoResult = await client.query(
      `INSERT INTO pagos_cuentas_pagar
         (cuenta_pagar_id, monto_real, quien_pago, fuente_fondos, cuenta_bancaria_id,
          voucher_nombre, voucher_mime, voucher_contenido, voucher_tamano, notas, fecha_pago, registrado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        id,
        monto_real,
        quien_pago.trim(),
        fuente_fondos,
        cuenta_banca_id,
        file?.originalname || null,
        file?.mimetype     || null,
        file?.buffer       || null,
        file?.size         || null,
        notas?.trim()      || null,
        fecha_pago || new Date().toISOString().split('T')[0],
        usuario?.userId    || null,
      ]
    );

    await client.query('COMMIT');

    const cpActualizado = await pool.query(
      'SELECT * FROM cuentas_pagar WHERE id = $1', [id]
    );
    await log('cuentas_pagar', id as string, 'pagar',
      { monto_real, fuente_fondos, quien_pago }, usuario);

    res.status(201).json({
      mensaje: 'Pago registrado correctamente.',
      pago: pagoResult.rows[0],
      cuenta: cpActualizado.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al liquidar cuenta por pagar:', error);
    res.status(500).json({ mensaje: 'Error interno.' });
  } finally {
    client.release();
  }
};

// GET /api/tesoreria/cuentas-pagar/:id/voucher/:pagoId
export const verVoucherPago = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pagoId } = req.params;
    const r = await pool.query(
      `SELECT voucher_contenido, voucher_nombre, voucher_mime FROM pagos_cuentas_pagar WHERE id = $1`,
      [pagoId]
    );
    if (r.rowCount === 0 || !r.rows[0].voucher_contenido) {
      res.status(404).json({ mensaje: 'Voucher no encontrado.' }); return;
    }
    const { voucher_contenido, voucher_nombre, voucher_mime } = r.rows[0];
    res.setHeader('Content-Type', voucher_mime || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${voucher_nombre || 'voucher'}"`);
    res.send(voucher_contenido);
  } catch (error) {
    console.error('Error al obtener voucher pago:', error);
    res.status(500).json({ mensaje: 'Error interno.' });
  }
};

// ================================================================
// FLUJO DE CAJA (PROYECCIÓN)
// GET /api/tesoreria/flujo-caja?mes=4&anio=2026
// ================================================================
export const resumenFlujoCaja = async (req: Request, res: Response): Promise<void> => {
  try {
    const hoy  = new Date();
    const mes  = parseInt(req.query.mes  as string) || (hoy.getMonth() + 1);
    const anio = parseInt(req.query.anio as string) || hoy.getFullYear();

    // ── ENTRADAS: intereses esperados de préstamos activos (AR) ──
    const arResult = await pool.query(
      `SELECT
         COALESCE(SUM(ROUND(p.saldo_pendiente * p.tasa_interes_mensual / 100, 2)), 0)::NUMERIC AS total_intereses_esperados,
         COUNT(*)::INTEGER AS total_prestamos_activos,
         COALESCE(SUM(
           (SELECT COALESCE(SUM(hp.monto), 0)
            FROM historial_pagos_prestamo hp
            WHERE hp.prestamo_id = p.id
              AND hp.tipo_pago = 'interes'
              AND hp.periodo_mes  = $1
              AND hp.periodo_anio = $2)
         ), 0)::NUMERIC AS total_intereses_cobrados
       FROM prestamos p
       WHERE p.estatus IN ('activo', 'atrasado')`,
      [mes, anio]
    );

    // ── SALIDAS: cuentas por pagar del mes (AP) ──
    const apResult = await pool.query(
      `SELECT
         tipo,
         COUNT(*)::INTEGER                                      AS cantidad,
         COALESCE(SUM(monto_estimado), 0)::NUMERIC              AS total_estimado,
         COALESCE(SUM(monto_pagado), 0)::NUMERIC                AS total_pagado,
         COUNT(*) FILTER (WHERE estatus = 'pagado')::INTEGER    AS pagados,
         COUNT(*) FILTER (WHERE estatus = 'pendiente')::INTEGER AS pendientes,
         COUNT(*) FILTER (WHERE estatus = 'atrasado')::INTEGER  AS atrasados,
         COUNT(*) FILTER (WHERE estatus = 'parcial')::INTEGER   AS parciales
       FROM cuentas_pagar
       WHERE EXTRACT(YEAR  FROM fecha_vencimiento)::INTEGER = $1
         AND EXTRACT(MONTH FROM fecha_vencimiento)::INTEGER = $2
       GROUP BY tipo
       ORDER BY tipo`,
      [anio, mes]
    );

    // ── TOTALES GLOBALES ──
    const totalesAP = await pool.query(
      `SELECT
         COALESCE(SUM(monto_estimado), 0)::NUMERIC AS total_salidas_estimadas,
         COALESCE(SUM(monto_pagado),   0)::NUMERIC AS total_salidas_reales,
         COUNT(*) FILTER (WHERE estatus != 'pagado')::INTEGER AS pendientes_count
       FROM cuentas_pagar
       WHERE EXTRACT(YEAR  FROM fecha_vencimiento)::INTEGER = $1
         AND EXTRACT(MONTH FROM fecha_vencimiento)::INTEGER = $2`,
      [anio, mes]
    );

    const ar = arResult.rows[0];
    const ap = totalesAP.rows[0];

    const totalEntradasEsperadas  = parseFloat(ar.total_intereses_esperados);
    const totalEntradasReales     = parseFloat(ar.total_intereses_cobrados);
    const totalSalidasEstimadas   = parseFloat(ap.total_salidas_estimadas);
    const totalSalidasReales      = parseFloat(ap.total_salidas_reales);

    res.json({
      mes,
      anio,
      // AR — Entradas
      entradas: {
        prestamos_activos:       ar.total_prestamos_activos,
        total_intereses_esperados: totalEntradasEsperadas,
        total_intereses_cobrados:  totalEntradasReales,
        pendiente_cobrar:         totalEntradasEsperadas - totalEntradasReales,
      },
      // AP — Salidas por categoría
      salidas_por_tipo: apResult.rows,
      // AP — Totales
      salidas: {
        total_estimado:   totalSalidasEstimadas,
        total_pagado:     totalSalidasReales,
        pendiente_pagar:  totalSalidasEstimadas - totalSalidasReales,
        items_pendientes: ap.pendientes_count,
      },
      // Utilidad libre proyectada
      flujo_neto: {
        proyectado: totalEntradasEsperadas - totalSalidasEstimadas,
        real:       totalEntradasReales    - totalSalidasReales,
      },
    });
  } catch (error) {
    console.error('Error al calcular flujo de caja:', error);
    res.status(500).json({ mensaje: 'Error interno.' });
  }
};
