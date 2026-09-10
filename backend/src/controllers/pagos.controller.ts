import { Request, Response } from 'express';
import pool from '../config/database';
import { restaPiso0, esCero } from '../lib/dinero';

// ================================================================
// POST /api/pagos/registrar
// Body (multipart/form-data):
//   modulo_origen  'prestamo' | 'renta'
//   referencia_id  UUID
//   cliente_id     UUID
//   monto_pagado   number
//   notas?         string
//   recibo?        file (via multer)
// ================================================================
export const registrarPago = async (req: Request, res: Response): Promise<void> => {
  const { modulo_origen, referencia_id, cliente_id, monto_pagado, notas } = req.body;
  const archivoRecibo = (req as any).file as Express.Multer.File | undefined;

  // --- Validaciones de entrada ---
  if (!modulo_origen || !referencia_id || !cliente_id || !monto_pagado) {
    res.status(400).json({ mensaje: 'Faltan campos obligatorios.' });
    return;
  }
  if (!['prestamo', 'renta'].includes(modulo_origen)) {
    res.status(400).json({ mensaje: "modulo_origen debe ser 'prestamo' o 'renta'." });
    return;
  }
  const monto = parseFloat(monto_pagado);
  if (!Number.isFinite(monto) || monto <= 0) {
    res.status(400).json({ mensaje: 'monto_pagado debe ser un número positivo.' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // --- 1. Verificar que la obligación existe y obtener su estado actual ---
    let obligacion: { saldo_pendiente: number; fecha_proximo_pago: string | null; estatus: string } | null = null;

    if (modulo_origen === 'prestamo') {
      const r = await client.query(
        `SELECT saldo_pendiente, fecha_proximo_pago, estatus FROM prestamos WHERE id = $1 FOR UPDATE`,
        [referencia_id]
      );
      if (r.rowCount === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ mensaje: 'Préstamo no encontrado.' });
        return;
      }
      obligacion = r.rows[0];
      if (obligacion!.estatus === 'liquidado') {
        await client.query('ROLLBACK');
        res.status(409).json({ mensaje: 'El préstamo ya se encuentra liquidado.' });
        return;
      }
    } else {
      const r = await client.query(
        `SELECT saldo_pendiente, fecha_proximo_pago, estatus FROM contratos_arrendamiento WHERE id = $1 FOR UPDATE`,
        [referencia_id]
      );
      if (r.rowCount === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ mensaje: 'Contrato de arrendamiento no encontrado.' });
        return;
      }
      obligacion = r.rows[0];
      if (obligacion!.estatus === 'terminado') {
        await client.query('ROLLBACK');
        res.status(409).json({ mensaje: 'El contrato de arrendamiento ya está terminado.' });
        return;
      }
    }

    // --- 2. Insertar en el ledger ---
    const pagoResult = await client.query(
      `INSERT INTO historial_pagos_global
         (modulo_origen, referencia_id, cliente_id, monto_pagado, notas)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [modulo_origen, referencia_id, cliente_id, monto, notas ?? null]
    );
    const pagoId: string = pagoResult.rows[0].id;

    // --- 3. Guardar recibo binario si viene archivo ---
    let urlRecibo: string | null = null;
    if (archivoRecibo) {
      await client.query(
        `INSERT INTO recibos_pago (pago_id, nombre, mime_type, contenido, tamano_bytes)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          pagoId,
          archivoRecibo.originalname,
          archivoRecibo.mimetype,
          archivoRecibo.buffer,
          archivoRecibo.size,
        ]
      );
      urlRecibo = `/api/pagos/recibo/${pagoId}`;

      await client.query(
        `UPDATE historial_pagos_global SET url_recibo = $1 WHERE id = $2`,
        [urlRecibo, pagoId]
      );
    }

    // --- 4. Actualizar saldo y estado en la tabla de origen ---
    // Exact cents (deuda 5): balance math never goes through floats
    const nuevoSaldo = restaPiso0(
      String(obligacion!.saldo_pendiente),
      Number(monto).toFixed(2),
    );
    const liquidado  = esCero(nuevoSaldo);

    // Calcular fecha_proximo_pago: sumar 1 mes a la fecha anterior (o a hoy si era null)
    const baseDate = obligacion!.fecha_proximo_pago
      ? new Date(obligacion!.fecha_proximo_pago)
      : new Date();
    baseDate.setMonth(baseDate.getMonth() + 1);
    const nuevaFechaProximoPago = baseDate.toISOString().split('T')[0];

    if (modulo_origen === 'prestamo') {
      await client.query(
        `UPDATE prestamos
         SET saldo_pendiente     = $1,
             estatus             = $2,
             fecha_proximo_pago  = $3,
             fecha_actualizacion = NOW()
         WHERE id = $4`,
        [
          nuevoSaldo,
          liquidado ? 'liquidado' : obligacion!.estatus,
          liquidado ? null : nuevaFechaProximoPago,
          referencia_id,
        ]
      );
    } else {
      await client.query(
        `UPDATE contratos_arrendamiento
         SET saldo_pendiente     = $1,
             estatus             = $2,
             fecha_proximo_pago  = $3,
             fecha_actualizacion = NOW()
         WHERE id = $4`,
        [
          nuevoSaldo,
          liquidado ? 'terminado' : 'activo',
          liquidado ? null : nuevaFechaProximoPago,
          referencia_id,
        ]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      id:               pagoId,
      modulo_origen,
      referencia_id,
      cliente_id,
      monto_pagado:     monto,
      nuevo_saldo:      Number(nuevoSaldo), // API contract: number (display-only)
      liquidado,
      fecha_proximo_pago: liquidado ? null : nuevaFechaProximoPago,
      url_recibo:       urlRecibo,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[pagos] Error en transacción:', err);
    res.status(500).json({ mensaje: 'Error al registrar el pago.' });
  } finally {
    client.release();
  }
};

// ================================================================
// GET /api/pagos/recibo/:pagoId
// Descarga el recibo binario del pago
// ================================================================
export const descargarRecibo = async (req: Request, res: Response): Promise<void> => {
  try {
    const r = await pool.query(
      `SELECT nombre, mime_type, contenido FROM recibos_pago WHERE pago_id = $1`,
      [req.params.pagoId]
    );
    if (r.rowCount === 0) {
      res.status(404).json({ mensaje: 'Recibo no encontrado.' });
      return;
    }
    const { nombre, mime_type, contenido } = r.rows[0];
    res.setHeader('Content-Type', mime_type ?? 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${nombre ?? 'recibo'}"`);
    res.send(contenido);
  } catch (err) {
    console.error('[pagos] Error al descargar recibo:', err);
    res.status(500).json({ mensaje: 'Error al descargar el recibo.' });
  }
};

// ================================================================
// GET /api/pagos/historial/:referenciaId
// Lista los pagos de una obligación específica
// ================================================================
export const historialPorReferencia = async (req: Request, res: Response): Promise<void> => {
  try {
    const r = await pool.query(
      `SELECT id, modulo_origen, cliente_id, monto_pagado, fecha_pago, url_recibo, notas
       FROM historial_pagos_global
       WHERE referencia_id = $1
       ORDER BY fecha_pago DESC`,
      [req.params.referenciaId]
    );
    res.json(r.rows);
  } catch (err) {
    console.error('[pagos] Error al listar historial:', err);
    res.status(500).json({ mensaje: 'Error al obtener historial de pagos.' });
  }
};

// ================================================================
// GET /api/pagos/cliente/:clienteId
// Todos los pagos registrados para un cliente
// ================================================================
export const historialPorCliente = async (req: Request, res: Response): Promise<void> => {
  try {
    const r = await pool.query(
      `SELECT id, modulo_origen, referencia_id, monto_pagado, fecha_pago, url_recibo, notas
       FROM historial_pagos_global
       WHERE cliente_id = $1
       ORDER BY fecha_pago DESC`,
      [req.params.clienteId]
    );
    res.json(r.rows);
  } catch (err) {
    console.error('[pagos] Error al listar historial por cliente:', err);
    res.status(500).json({ mensaje: 'Error al obtener historial del cliente.' });
  }
};

// ================================================================
// GET /api/pagos/deuda-activa/:clienteId
// Saldo pendiente activo de un cliente (préstamos)
// ================================================================
export const deudaActivaCliente = async (req: Request, res: Response): Promise<void> => {
  try {
    const { clienteId } = req.params;
    const r = await pool.query(
      `SELECT id, folio, saldo_pendiente, estatus, fecha_proximo_pago
       FROM prestamos
       WHERE cliente_id = $1 AND estatus NOT IN ('liquidado', 'cancelado')
       ORDER BY fecha_inicio DESC`,
      [clienteId]
    );
    const total = r.rows.reduce((s: number, p: any) => s + parseFloat(p.saldo_pendiente), 0);
    res.json({
      prestamos:       r.rows,
      total_prestamos: parseFloat(total.toFixed(2)),
      total_rentas:    0,
      total_activo:    parseFloat(total.toFixed(2)),
    });
  } catch (err) {
    console.error('[pagos] Error al obtener deuda activa:', err);
    res.status(500).json({ mensaje: 'Error al obtener deuda activa del cliente.' });
  }
};
