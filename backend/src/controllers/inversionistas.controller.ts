import { Request, Response } from 'express';
import pool from '../config/database';
import {
  CrearInversionistaDto,
  EditarInversionistaDto,
  CrearInversionDto,
  EditarInversionDto,
  RegistrarMovimientoDto,
  TransferirOficinaDto,
  EstatusInversion,
} from '../models/inversionista.model';

// Escapa los wildcards de LIKE/ILIKE (% _ \) en entradas de búsqueda.
const escapeLikeWildcards = (s: string): string => s.replace(/[\\%_]/g, '\\$&');

// ================================================================
// IMPORTACIÓN MASIVA
// POST /api/inversionistas/importar
// ================================================================
export const importarInversionistas = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const registrado_por = req.usuario?.userId;
    const filas: Array<{
      nombres: string;
      apellido_paterno: string;
      capital: number;
      tasa: number;
      dia_pago: number | null;
      fecha_inicio: string;
    }> = req.body.filas;

    if (!Array.isArray(filas) || filas.length === 0) {
      res.status(400).json({ mensaje: 'Se requiere al menos una fila.' });
      return;
    }

    await client.query('BEGIN');

    const resultados: Array<{ ok: boolean; nombre: string; inv_id?: string; error?: string }> = [];

    for (const fila of filas) {
      try {
        const invRes = await client.query(
          `INSERT INTO inversionistas
             (nombres, apellido_paterno, capital_aportado_total, capital_disponible, registrado_por)
           VALUES ($1, $2, $3, 0, $4)
           RETURNING id`,
          [fila.nombres.trim(), fila.apellido_paterno.trim(), fila.capital, registrado_por || null]
        );
        const invId = invRes.rows[0].id;

        if (fila.tasa > 0) {
          const inversionRes = await client.query(
            `INSERT INTO inversiones
               (inversionista_id, monto_inicial, monto_actual, tasa_interes_mensual,
                dia_pago, fecha_inicio, registrado_por)
             VALUES ($1, $2, $2, $3, $4, $5, $6)
             RETURNING id`,
            [invId, fila.capital, fila.tasa, fila.dia_pago || null, fila.fecha_inicio, registrado_por || null]
          );
          await client.query(
            `INSERT INTO historial_inversiones
               (inversion_id, tipo, monto, notas, registrado_por)
             VALUES ($1, 'aporte_capital', $2, 'Capital inicial — importación masiva', $3)`,
            [inversionRes.rows[0].id, fila.capital, registrado_por || null]
          );
        }

        resultados.push({ ok: true, nombre: `${fila.nombres} ${fila.apellido_paterno}`, inv_id: invId });
      } catch (e: unknown) {
        console.error('Error al importar inversionista:', e);
        resultados.push({ ok: false, nombre: `${fila.nombres} ${fila.apellido_paterno}`, error: 'Error al procesar registro.' });
      }
    }

    const hayErrores = resultados.some(r => !r.ok);
    if (hayErrores) {
      await client.query('ROLLBACK');
      res.status(422).json({ mensaje: 'Algunos registros fallaron. No se importó nada.', resultados });
      return;
    }

    await client.query('COMMIT');
    res.status(201).json({
      mensaje: `${resultados.length} inversionistas importados correctamente.`,
      resultados,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en importación masiva:', error);
    res.status(500).json({ mensaje: 'Error interno en la importación.' });
  } finally {
    client.release();
  }
};

// ================================================================
// INVERSIONISTAS
// ================================================================

// ----------------------------------------------------------------
// Stats del módulo: totales, nuevos este mes, capital e intereses
// GET /api/inversionistas/stats
// ----------------------------------------------------------------
export const obtenerStatsInversionistas = async (_req: Request, res: Response): Promise<void> => {
  try {
    const resultado = await pool.query(`
      SELECT
        COUNT(*)                                                            AS total_inversionistas,
        COUNT(*) FILTER (
          WHERE DATE_TRUNC('month', fecha_registro) = DATE_TRUNC('month', NOW())
        )                                                                   AS nuevos_este_mes,
        COALESCE((
          SELECT SUM(monto_actual) FROM inversiones WHERE estatus = 'activo'
        ), 0)                                                               AS capital_total_manejado,
        COALESCE((
          SELECT SUM(hi.monto)
          FROM historial_inversiones hi
          WHERE hi.tipo = 'pago_interes'
        ), 0)                                                               AS intereses_pagados_total
      FROM inversionistas
    `);

    const row = resultado.rows[0];
    res.json({
      total_inversionistas:   parseInt(row.total_inversionistas, 10),
      nuevos_este_mes:        parseInt(row.nuevos_este_mes, 10),
      capital_total_manejado: parseFloat(row.capital_total_manejado),
      intereses_pagados_total: parseFloat(row.intereses_pagados_total),
    });
  } catch (error) {
    console.error('Error al obtener stats de inversionistas:', error);
    res.status(500).json({ mensaje: 'Error interno al obtener estadísticas.' });
  }
};

// ----------------------------------------------------------------
// Listar inversionistas con búsqueda, filtro y paginación
// GET /api/inversionistas
// ----------------------------------------------------------------
export const listarInversionistas = async (req: Request, res: Response): Promise<void> => {
  try {
    const buscar    = (req.query.buscar     as string) || '';
    const asignado  = (req.query.asignado_a as string) || '';
    const orden     = (req.query.orden      as string) || '';
    const pagina    = Math.max(1, parseInt(req.query.pagina as string) || 1);
    const limite    = Math.min(100, Math.max(1, parseInt(req.query.limite as string) || 20));
    const offset    = (pagina - 1) * limite;

    const ordenClause: Record<string, string> = {
      inversion_desc: 'total_invertido DESC, i.apellido_paterno ASC',
      inversion_asc:  'total_invertido ASC,  i.apellido_paterno ASC',
      dia_pago_asc:   'min_dia_pago ASC NULLS LAST, i.apellido_paterno ASC',
      dia_pago_desc:  'min_dia_pago DESC NULLS LAST, i.apellido_paterno ASC',
    };
    const orderBy = ordenClause[orden] ?? 'i.apellido_paterno ASC, i.nombres ASC';

    const condiciones: string[] = [];
    const valores: (string | number)[] = [];
    let indice = 1;

    if (buscar) {
      condiciones.push(`(
        i.nombres           ILIKE $${indice} ESCAPE '\\'
        OR i.apellido_paterno ILIKE $${indice} ESCAPE '\\'
        OR i.apellido_materno ILIKE $${indice} ESCAPE '\\'
        OR i.telefono         ILIKE $${indice} ESCAPE '\\'
        OR i.correo           ILIKE $${indice} ESCAPE '\\'
      )`);
      valores.push(`%${escapeLikeWildcards(String(buscar))}%`);
      indice++;
    }

    if (asignado) {
      condiciones.push(`i.asignado_a = $${indice}`);
      valores.push(asignado);
      indice++;
    }

    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    const totalResult = await pool.query(
      `SELECT COUNT(*) FROM inversionistas i ${where}`,
      valores
    );
    const total = parseInt(totalResult.rows[0].count, 10);

    const resultado = await pool.query(
      `SELECT
          i.id,
          i.nombres,
          i.apellido_paterno,
          i.apellido_materno,
          i.telefono,
          i.asignado_a,
          i.capital_aportado_total,
          i.capital_disponible,
          COALESCE(SUM(inv.monto_actual) FILTER (WHERE inv.estatus = 'activo'), 0)
            AS total_invertido,
          COUNT(inv.id) FILTER (WHERE inv.estatus = 'activo')
            AS inversiones_activas,
          COALESCE(SUM(inv.monto_actual * inv.tasa_interes_mensual / 100) FILTER (WHERE inv.estatus = 'activo'), 0)
            AS pago_mensual,
          STRING_AGG(DISTINCT inv.dia_pago::TEXT, ', ') FILTER (WHERE inv.estatus = 'activo' AND inv.dia_pago IS NOT NULL)
            AS dias_pago,
          MIN(inv.dia_pago) FILTER (WHERE inv.estatus = 'activo' AND inv.dia_pago IS NOT NULL)
            AS min_dia_pago
        FROM inversionistas i
        LEFT JOIN inversiones inv ON inv.inversionista_id = i.id
        ${where}
        GROUP BY i.id
        ORDER BY ${orderBy}
        LIMIT $${indice} OFFSET $${indice + 1}`,
      [...valores, limite, offset]
    );

    res.json({
      inversionistas: resultado.rows,
      total,
      pagina,
      limite,
      totalPaginas: Math.ceil(total / limite),
    });
  } catch (error) {
    console.error('Error al listar inversionistas:', error);
    res.status(500).json({ mensaje: 'Error interno al obtener inversionistas.' });
  }
};

// ----------------------------------------------------------------
// Obtener perfil completo de un inversionista con sus inversiones
// GET /api/inversionistas/:id
// ----------------------------------------------------------------
export const obtenerInversionista = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const invResult = await pool.query(
      'SELECT * FROM inversionistas WHERE id = $1',
      [id]
    );

    if (invResult.rowCount === 0) {
      res.status(404).json({ mensaje: 'Inversionista no encontrado.' });
      return;
    }

    const inversionesResult = await pool.query(
      `SELECT * FROM inversiones
       WHERE inversionista_id = $1
       ORDER BY fecha_inicio DESC`,
      [id]
    );

    res.json({
      ...invResult.rows[0],
      inversiones: inversionesResult.rows,
    });
  } catch (error) {
    console.error('Error al obtener inversionista:', error);
    res.status(500).json({ mensaje: 'Error interno al obtener el perfil.' });
  }
};

// ----------------------------------------------------------------
// Crear inversionista (con capital inicial opcional)
// POST /api/inversionistas
// ----------------------------------------------------------------
export const crearInversionista = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const registrado_por = req.usuario?.userId;
    const datos: CrearInversionistaDto = req.body;

    if (!datos.nombres?.trim() || !datos.apellido_paterno?.trim()) {
      res.status(400).json({ mensaje: 'Los campos nombres y apellido_paterno son obligatorios.' });
      return;
    }

    const montoInicial = datos.monto_aportado_inicial && datos.monto_aportado_inicial > 0
      ? datos.monto_aportado_inicial
      : 0;

    const fechaAportacion = datos.fecha_aportacion
      ? new Date(datos.fecha_aportacion + 'T12:00:00')
      : new Date();

    await client.query('BEGIN');

    const resultado = await client.query(
      `INSERT INTO inversionistas
         (nombres, apellido_paterno, apellido_materno, telefono, correo,
          asignado_a, url_ine, capital_aportado_total, capital_disponible, registrado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $9)
       RETURNING *`,
      [
        datos.nombres.trim(),
        datos.apellido_paterno.trim(),
        datos.apellido_materno?.trim()     || null,
        datos.telefono?.trim()             || null,
        datos.correo?.toLowerCase().trim() || null,
        datos.asignado_a                   || null,
        datos.url_ine?.trim()              || null,
        montoInicial,
        registrado_por                     || null,
      ]
    );

    const inv = resultado.rows[0];

    if (montoInicial > 0) {
      await client.query(
        `INSERT INTO movimientos_inversionistas
           (inversionista_id, tipo, monto, concepto, registrado_por, fecha_movimiento)
         VALUES ($1, 'entrada', $2, 'Capital inicial', $3, $4)`,
        [inv.id, montoInicial, registrado_por || null, fechaAportacion]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      mensaje: 'Inversionista registrado correctamente.',
      inversionista: inv,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al crear inversionista:', error);
    res.status(500).json({ mensaje: 'Error interno al registrar el inversionista.' });
  } finally {
    client.release();
  }
};

// ----------------------------------------------------------------
// Editar inversionista (datos personales únicamente)
// PUT /api/inversionistas/:id
// ----------------------------------------------------------------
export const editarInversionista = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const datos: EditarInversionistaDto = req.body;

    const existe = await pool.query('SELECT id FROM inversionistas WHERE id = $1', [id]);
    if (existe.rowCount === 0) {
      res.status(404).json({ mensaje: 'Inversionista no encontrado.' });
      return;
    }

    const resultado = await pool.query(
      `UPDATE inversionistas SET
          nombres             = COALESCE($1, nombres),
          apellido_paterno    = COALESCE($2, apellido_paterno),
          apellido_materno    = COALESCE($3, apellido_materno),
          telefono            = COALESCE($4, telefono),
          correo              = COALESCE($5, correo),
          asignado_a          = COALESCE($6, asignado_a),
          url_ine             = COALESCE($7, url_ine),
          fecha_actualizacion = NOW()
       WHERE id = $8
       RETURNING *`,
      [
        datos.nombres?.trim()           || null,
        datos.apellido_paterno?.trim()  || null,
        datos.apellido_materno?.trim()  || null,
        datos.telefono?.trim()          || null,
        datos.correo?.toLowerCase().trim() || null,
        datos.asignado_a                || null,
        datos.url_ine?.trim()           || null,
        id,
      ]
    );

    res.json({
      mensaje: 'Inversionista actualizado correctamente.',
      inversionista: resultado.rows[0],
    });
  } catch (error) {
    console.error('Error al editar inversionista:', error);
    res.status(500).json({ mensaje: 'Error interno al actualizar el inversionista.' });
  }
};

// ----------------------------------------------------------------
// Listar movimientos de wallet de un inversionista
// GET /api/inversionistas/:id/movimientos
// ----------------------------------------------------------------
export const listarMovimientosInversionista = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existe = await pool.query('SELECT id FROM inversionistas WHERE id = $1', [id]);
    if (existe.rowCount === 0) {
      res.status(404).json({ mensaje: 'Inversionista no encontrado.' });
      return;
    }

    const resultado = await pool.query(
      `SELECT
          m.*,
          CASE WHEN p.folio IS NOT NULL THEN p.folio END AS prestamo_folio
        FROM movimientos_inversionistas m
        LEFT JOIN prestamos p ON p.id = m.prestamo_id
        WHERE m.inversionista_id = $1
        ORDER BY m.fecha_movimiento DESC`,
      [id]
    );

    res.json(resultado.rows);
  } catch (error) {
    console.error('Error al listar movimientos:', error);
    res.status(500).json({ mensaje: 'Error interno al obtener movimientos.' });
  }
};

// ----------------------------------------------------------------
// Transferir capital a Oficina TS (uso de liquidez operativa)
// POST /api/inversionistas/:id/uso-oficina
// ----------------------------------------------------------------
export const transferirAOficina = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const registrado_por = req.usuario?.userId;
    const datos: TransferirOficinaDto = req.body;

    if (!datos.monto || datos.monto <= 0) {
      res.status(400).json({ mensaje: 'El monto debe ser mayor a cero.' });
      return;
    }

    await client.query('BEGIN');

    const invResult = await client.query(
      'SELECT id, capital_disponible FROM inversionistas WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (invResult.rowCount === 0) {
      res.status(404).json({ mensaje: 'Inversionista no encontrado.' });
      await client.query('ROLLBACK');
      return;
    }

    const disponible = parseFloat(invResult.rows[0].capital_disponible);
    if (datos.monto > disponible + 0.009) {
      res.status(400).json({
        mensaje: `Capital insuficiente. Disponible: $${disponible.toFixed(2)}, solicitado: $${datos.monto.toFixed(2)}.`,
      });
      await client.query('ROLLBACK');
      return;
    }

    await client.query(
      `UPDATE inversionistas
       SET capital_disponible = capital_disponible - $1, fecha_actualizacion = NOW()
       WHERE id = $2`,
      [datos.monto, id]
    );

    const movResult = await client.query(
      `INSERT INTO movimientos_inversionistas
         (inversionista_id, tipo, monto, concepto, registrado_por)
       VALUES ($1, 'uso_oficina', $2, $3, $4)
       RETURNING *`,
      [
        id,
        datos.monto,
        datos.concepto?.trim() || 'Uso de liquidez — Oficina TS',
        registrado_por || null,
      ]
    );

    await client.query('COMMIT');

    res.status(201).json({
      mensaje: 'Transferencia a Oficina TS registrada.',
      movimiento: movResult.rows[0],
      capital_disponible_nuevo: disponible - datos.monto,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al transferir a oficina:', error);
    res.status(500).json({ mensaje: 'Error interno al registrar la transferencia.' });
  } finally {
    client.release();
  }
};

// ================================================================
// INVERSIONES
// ================================================================

// ----------------------------------------------------------------
// Listar inversiones de un inversionista
// GET /api/inversionistas/:id/inversiones
// ----------------------------------------------------------------
export const listarInversiones = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const resultado = await pool.query(
      `SELECT * FROM inversiones
       WHERE inversionista_id = $1
       ORDER BY fecha_inicio DESC`,
      [id]
    );

    res.json(resultado.rows);
  } catch (error) {
    console.error('Error al listar inversiones:', error);
    res.status(500).json({ mensaje: 'Error interno al obtener inversiones.' });
  }
};

// ----------------------------------------------------------------
// Crear nueva inversión para un inversionista
// POST /api/inversionistas/:id/inversiones
// ----------------------------------------------------------------
export const crearInversion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const registrado_por = req.usuario?.userId;
    const datos: CrearInversionDto = req.body;

    const existe = await pool.query('SELECT id FROM inversionistas WHERE id = $1', [id]);
    if (existe.rowCount === 0) {
      res.status(404).json({ mensaje: 'Inversionista no encontrado.' });
      return;
    }

    if (!datos.monto_inicial || datos.monto_inicial <= 0) {
      res.status(400).json({ mensaje: 'El monto inicial debe ser mayor a cero.' });
      return;
    }

    if (!datos.tasa_interes_mensual || datos.tasa_interes_mensual <= 0) {
      res.status(400).json({ mensaje: 'La tasa de interés mensual debe ser mayor a cero.' });
      return;
    }

    if (!datos.fecha_inicio) {
      res.status(400).json({ mensaje: 'La fecha de inicio es obligatoria.' });
      return;
    }

    const resultado = await pool.query(
      `INSERT INTO inversiones
         (inversionista_id, monto_inicial, monto_actual, tasa_interes_mensual,
          dia_pago, forma_ingreso, cuenta_deposito,
          tiene_pagare, url_pagare, fecha_inicio, fecha_vencimiento,
          notas, registrado_por)
       VALUES ($1, $2, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        id,
        datos.monto_inicial,
        datos.tasa_interes_mensual,
        datos.dia_pago          || null,
        datos.forma_ingreso     || null,
        datos.cuenta_deposito?.trim() || null,
        datos.tiene_pagare      ?? false,
        datos.url_pagare?.trim()|| null,
        datos.fecha_inicio,
        datos.fecha_vencimiento || null,
        datos.notas?.trim()     || null,
        registrado_por          || null,
      ]
    );

    await pool.query(
      `INSERT INTO historial_inversiones
         (inversion_id, tipo, monto, forma_pago, notas, registrado_por)
       VALUES ($1, 'aporte_capital', $2, $3, 'Capital inicial', $4)`,
      [
        resultado.rows[0].id,
        datos.monto_inicial,
        datos.forma_ingreso || null,
        registrado_por || null,
      ]
    );

    res.status(201).json({
      mensaje: 'Inversión registrada correctamente.',
      inversion: resultado.rows[0],
    });
  } catch (error) {
    console.error('Error al crear inversión:', error);
    res.status(500).json({ mensaje: 'Error interno al registrar la inversión.' });
  }
};

// ----------------------------------------------------------------
// Editar inversión
// PUT /api/inversiones/:id
// ----------------------------------------------------------------
export const editarInversion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const datos: EditarInversionDto = req.body;

    const existe = await pool.query('SELECT id FROM inversiones WHERE id = $1', [id]);
    if (existe.rowCount === 0) {
      res.status(404).json({ mensaje: 'Inversión no encontrada.' });
      return;
    }

    const resultado = await pool.query(
      `UPDATE inversiones SET
          tasa_interes_mensual = COALESCE($1, tasa_interes_mensual),
          dia_pago             = COALESCE($2, dia_pago),
          forma_ingreso        = COALESCE($3, forma_ingreso),
          cuenta_deposito      = COALESCE($4, cuenta_deposito),
          tiene_pagare         = COALESCE($5, tiene_pagare),
          url_pagare           = COALESCE($6, url_pagare),
          fecha_vencimiento    = COALESCE($7, fecha_vencimiento),
          notas                = COALESCE($8, notas),
          fecha_actualizacion  = NOW()
       WHERE id = $9
       RETURNING *`,
      [
        datos.tasa_interes_mensual || null,
        datos.dia_pago             || null,
        datos.forma_ingreso        || null,
        datos.cuenta_deposito?.trim() || null,
        datos.tiene_pagare         ?? null,
        datos.url_pagare?.trim()   || null,
        datos.fecha_vencimiento    || null,
        datos.notas?.trim()        || null,
        id,
      ]
    );

    res.json({
      mensaje: 'Inversión actualizada correctamente.',
      inversion: resultado.rows[0],
    });
  } catch (error) {
    console.error('Error al editar inversión:', error);
    res.status(500).json({ mensaje: 'Error interno al actualizar la inversión.' });
  }
};

// ----------------------------------------------------------------
// Cambiar estatus de una inversión
// PATCH /api/inversiones/:id/estatus
// ----------------------------------------------------------------
export const cambiarEstatusInversion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { estatus } = req.body as { estatus: EstatusInversion };

    const estatusValidos: EstatusInversion[] = ['activo', 'pausado', 'liquidado', 'vencido'];
    if (!estatusValidos.includes(estatus)) {
      res.status(400).json({ mensaje: 'Estatus no válido.', estatusValidos });
      return;
    }

    const resultado = await pool.query(
      `UPDATE inversiones
       SET estatus = $1, fecha_actualizacion = NOW()
       WHERE id = $2
       RETURNING id, estatus, fecha_actualizacion`,
      [estatus, id]
    );

    if (resultado.rowCount === 0) {
      res.status(404).json({ mensaje: 'Inversión no encontrada.' });
      return;
    }

    res.json({
      mensaje: 'Estatus actualizado correctamente.',
      ...resultado.rows[0],
    });
  } catch (error) {
    console.error('Error al cambiar estatus de inversión:', error);
    res.status(500).json({ mensaje: 'Error interno al cambiar el estatus.' });
  }
};

// ================================================================
// HISTORIAL DE MOVIMIENTOS DE INVERSIONES
// ================================================================

// ----------------------------------------------------------------
// Listar historial de movimientos de una inversión
// GET /api/inversiones/:id/historial
// ----------------------------------------------------------------
export const listarHistorial = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const resultado = await pool.query(
      `SELECT * FROM historial_inversiones
       WHERE inversion_id = $1
       ORDER BY fecha_movimiento DESC`,
      [id]
    );

    res.json(resultado.rows);
  } catch (error) {
    console.error('Error al listar historial:', error);
    res.status(500).json({ mensaje: 'Error interno al obtener el historial.' });
  }
};

// ----------------------------------------------------------------
// Registrar movimiento (pago de interés, aporte o retiro de capital)
// POST /api/inversiones/:id/historial
// ----------------------------------------------------------------
export const registrarMovimiento = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const registrado_por = req.usuario?.userId;
    const datos: RegistrarMovimientoDto = req.body;

    const invResult = await pool.query(
      'SELECT id, monto_actual, tasa_interes_mensual, estatus FROM inversiones WHERE id = $1',
      [id]
    );

    if (invResult.rowCount === 0) {
      res.status(404).json({ mensaje: 'Inversión no encontrada.' });
      return;
    }

    const inversion = invResult.rows[0];

    if (!datos.tipo || !['pago_interes', 'aporte_capital', 'retiro_capital'].includes(datos.tipo)) {
      res.status(400).json({ mensaje: 'Tipo de movimiento no válido.' });
      return;
    }

    if (!datos.monto || datos.monto <= 0) {
      res.status(400).json({ mensaje: 'El monto debe ser mayor a cero.' });
      return;
    }

    const montoActual  = parseFloat(inversion.monto_actual);
    const tasa         = parseFloat(inversion.tasa_interes_mensual);
    const montoInteres = parseFloat((montoActual * (tasa / 100)).toFixed(2));

    const histResult = await pool.query(
      `INSERT INTO historial_inversiones
         (inversion_id, tipo, monto, forma_pago,
          periodo_mes, periodo_anio, notas, url_evidencia, registrado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        id,
        datos.tipo,
        datos.monto,
        datos.forma_pago    || null,
        datos.periodo_mes   || null,
        datos.periodo_anio  || null,
        datos.notas?.trim() || null,
        datos.url_evidencia?.trim() || null,
        registrado_por      || null,
      ]
    );

    let nuevoMonto = montoActual;
    if (datos.tipo === 'aporte_capital') {
      nuevoMonto = parseFloat((montoActual + datos.monto).toFixed(2));
    } else if (datos.tipo === 'retiro_capital') {
      nuevoMonto = parseFloat((montoActual - datos.monto).toFixed(2));
    }

    if (datos.tipo !== 'pago_interes') {
      await pool.query(
        `UPDATE inversiones
         SET monto_actual = $1, fecha_actualizacion = NOW()
         WHERE id = $2`,
        [nuevoMonto, id]
      );
    }

    res.status(201).json({
      mensaje: 'Movimiento registrado correctamente.',
      movimiento: histResult.rows[0],
      monto_interes_calculado: montoInteres,
      monto_actual_nuevo: nuevoMonto,
    });
  } catch (error) {
    console.error('Error al registrar movimiento:', error);
    res.status(500).json({ mensaje: 'Error interno al registrar el movimiento.' });
  }
};
