import { Request, Response } from 'express';
import pool from '../config/database';
import {
  CrearCuentaDto, EditarCuentaDto,
  CrearCategoriaDto, CrearMovimientoDto, CrearTraspasoDto,
} from '../models/tesoreria.model';
import { UsuarioAutenticado } from '../middlewares/auth.middleware';

// ── Audit helper ───────────────────────────────────────────────────
const registrarLog = async (
  modulo: string,
  tabla: string,
  registroId: string,
  accion: string,
  detalle: object | null,
  usuario: UsuarioAutenticado | undefined
): Promise<void> => {
  try {
    await pool.query(
      `INSERT INTO logs_auditoria
         (modulo, tabla, registro_id, accion, detalle, usuario_id, usuario_nombre, usuario_correo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        modulo, tabla, registroId, accion,
        detalle ? JSON.stringify(detalle) : null,
        usuario?.userId  || null,
        usuario?.nombre  || null,
        usuario?.correo  || null,
      ]
    );
  } catch { /* non-blocking */ }
};

// ================================================================
// CUENTAS BANCARIAS
// ================================================================

export const listarCuentas = async (_req: Request, res: Response): Promise<void> => {
  try {
    const resultado = await pool.query(
      `SELECT * FROM cuentas_bancarias WHERE activa = true ORDER BY alias`
    );
    res.json(resultado.rows);
  } catch (error) {
    console.error('Error al listar cuentas:', error);
    res.status(500).json({ mensaje: 'Error interno al obtener las cuentas.' });
  }
};

export const crearCuenta = async (req: Request, res: Response): Promise<void> => {
  try {
    const usuario = req.usuario;
    const datos: CrearCuentaDto = req.body;

    if (!datos.alias?.trim() || !datos.titular?.trim() || !datos.banco?.trim()) {
      res.status(400).json({ mensaje: 'Alias, titular y banco son obligatorios.' });
      return;
    }

    const saldoInicial = datos.saldo_inicial ?? 0;

    const resultado = await pool.query(
      `INSERT INTO cuentas_bancarias
         (alias, titular, banco, clabe, numero_cuenta, numero_tarjeta, saldo_inicial, saldo_actual, notas, registrado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$7,$8,$9)
       RETURNING *`,
      [
        datos.alias.trim(),
        datos.titular.trim(),
        datos.banco.trim(),
        datos.clabe?.trim()          || null,
        datos.numero_cuenta?.trim()  || null,
        (datos as any).numero_tarjeta?.trim() || null,
        saldoInicial,
        datos.notas?.trim()          || null,
        usuario?.userId              || null,
      ]
    );

    const cuenta = resultado.rows[0];
    await registrarLog('tesoreria', 'cuentas_bancarias', cuenta.id, 'crear',
      { alias: cuenta.alias, saldo_inicial: saldoInicial }, usuario);

    res.status(201).json({ mensaje: 'Cuenta creada correctamente.', cuenta });
  } catch (error) {
    console.error('Error al crear cuenta:', error);
    res.status(500).json({ mensaje: 'Error interno al crear la cuenta.' });
  }
};

export const editarCuenta = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const usuario = req.usuario;
    const datos: EditarCuentaDto = req.body;

    const existe = await pool.query(
      'SELECT id FROM cuentas_bancarias WHERE id = $1 AND activa = true', [id]
    );
    if (existe.rowCount === 0) {
      res.status(404).json({ mensaje: 'Cuenta no encontrada.' }); return;
    }

    const resultado = await pool.query(
      `UPDATE cuentas_bancarias SET
         alias               = COALESCE($1, alias),
         titular             = COALESCE($2, titular),
         banco               = COALESCE($3, banco),
         clabe               = $4,
         numero_cuenta       = $5,
         numero_tarjeta      = $6,
         notas               = $7,
         fecha_actualizacion = NOW()
       WHERE id = $8
       RETURNING *`,
      [
        datos.alias?.trim()          || null,
        datos.titular?.trim()        || null,
        datos.banco?.trim()          || null,
        datos.clabe?.trim()          ?? null,
        datos.numero_cuenta?.trim()  ?? null,
        (datos as any).numero_tarjeta?.trim() ?? null,
        datos.notas?.trim()          ?? null,
        id,
      ]
    );

    await registrarLog('tesoreria', 'cuentas_bancarias', id as string, 'editar', datos, usuario);
    res.json({ mensaje: 'Cuenta actualizada correctamente.', cuenta: resultado.rows[0] });
  } catch (error) {
    console.error('Error al editar cuenta:', error);
    res.status(500).json({ mensaje: 'Error interno al editar la cuenta.' });
  }
};

export const desactivarCuenta = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const usuario = req.usuario;

    const resultado = await pool.query(
      `UPDATE cuentas_bancarias SET activa = false, fecha_actualizacion = NOW()
       WHERE id = $1 AND activa = true RETURNING id, alias`,
      [id]
    );

    if (resultado.rowCount === 0) {
      res.status(404).json({ mensaje: 'Cuenta no encontrada.' }); return;
    }

    await registrarLog('tesoreria', 'cuentas_bancarias', id as string, 'desactivar',
      { alias: resultado.rows[0].alias }, usuario);

    res.json({ mensaje: 'Cuenta desactivada correctamente.' });
  } catch (error) {
    console.error('Error al desactivar cuenta:', error);
    res.status(500).json({ mensaje: 'Error interno al desactivar la cuenta.' });
  }
};

// ================================================================
// CATEGORÍAS DE MOVIMIENTOS
// ================================================================

export const listarCategorias = async (_req: Request, res: Response): Promise<void> => {
  try {
    const resultado = await pool.query(
      `SELECT * FROM categorias_movimiento WHERE activa = true ORDER BY nombre`
    );
    res.json(resultado.rows);
  } catch (error) {
    console.error('Error al listar categorías:', error);
    res.status(500).json({ mensaje: 'Error interno al obtener las categorías.' });
  }
};

export const crearCategoria = async (req: Request, res: Response): Promise<void> => {
  try {
    const usuario = req.usuario;
    const datos: CrearCategoriaDto = req.body;

    if (!datos.nombre?.trim()) {
      res.status(400).json({ mensaje: 'El nombre de la categoría es obligatorio.' }); return;
    }

    const resultado = await pool.query(
      `INSERT INTO categorias_movimiento (nombre, tipo, registrado_por)
       VALUES ($1, $2, $3)
       ON CONFLICT (nombre) DO UPDATE SET activa = true
       RETURNING *`,
      [datos.nombre.trim(), datos.tipo ?? 'ambos', usuario?.userId || null]
    );

    res.status(201).json({ mensaje: 'Categoría creada.', categoria: resultado.rows[0] });
  } catch (error) {
    console.error('Error al crear categoría:', error);
    res.status(500).json({ mensaje: 'Error interno al crear la categoría.' });
  }
};

// ================================================================
// CAJA CHICA — MOVIMIENTOS
// ================================================================

export const resumenCaja = async (_req: Request, res: Response): Promise<void> => {
  try {
    const resultado = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN monto ELSE 0 END), 0) AS total_entradas,
         COALESCE(SUM(CASE WHEN tipo = 'salida'  THEN monto ELSE 0 END), 0) AS total_salidas,
         COUNT(*) FILTER (WHERE fecha >= DATE_TRUNC('month', CURRENT_DATE))::INTEGER AS movimientos_mes
       FROM movimientos_caja`
    );
    const { total_entradas, total_salidas, movimientos_mes } = resultado.rows[0];
    res.json({
      total_entradas:  parseFloat(total_entradas),
      total_salidas:   parseFloat(total_salidas),
      saldo_actual:    parseFloat(total_entradas) - parseFloat(total_salidas),
      movimientos_mes,
    });
  } catch (error) {
    console.error('Error al calcular resumen de caja:', error);
    res.status(500).json({ mensaje: 'Error interno al calcular el resumen.' });
  }
};

export const listarMovimientos = async (req: Request, res: Response): Promise<void> => {
  try {
    const tipo        = (req.query.tipo         as string) || '';
    const categoriaId = (req.query.categoria_id as string) || '';
    const desde       = (req.query.desde        as string) || '';
    const hasta       = (req.query.hasta        as string) || '';
    const pagina      = Math.max(1, parseInt(req.query.pagina as string) || 1);
    const limite      = Math.min(100, Math.max(1, parseInt(req.query.limite as string) || 20));
    const offset      = (pagina - 1) * limite;

    const condiciones: string[] = [];
    const valores: (string | number)[] = [];
    let idx = 1;

    if (tipo)        { condiciones.push(`m.tipo = $${idx++}`);         valores.push(tipo); }
    if (categoriaId) { condiciones.push(`m.categoria_id = $${idx++}`); valores.push(categoriaId); }
    if (desde)       { condiciones.push(`m.fecha >= $${idx++}`);       valores.push(desde); }
    if (hasta)       { condiciones.push(`m.fecha <= $${idx++}`);       valores.push(hasta); }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

    const totalResult = await pool.query(
      `SELECT COUNT(*) FROM movimientos_caja m ${where}`, valores
    );
    const total = parseInt(totalResult.rows[0].count, 10);

    const resultado = await pool.query(
      `SELECT m.*, c.nombre AS categoria_nombre
       FROM movimientos_caja m
       LEFT JOIN categorias_movimiento c ON c.id = m.categoria_id
       ${where}
       ORDER BY m.fecha DESC, m.fecha_registro DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...valores, limite, offset]
    );

    res.json({
      movimientos:  resultado.rows,
      total, pagina, limite,
      totalPaginas: Math.ceil(total / limite),
    });
  } catch (error) {
    console.error('Error al listar movimientos:', error);
    res.status(500).json({ mensaje: 'Error interno al obtener los movimientos.' });
  }
};

export const crearMovimiento = async (req: Request, res: Response): Promise<void> => {
  try {
    const usuario    = req.usuario;
    const file       = (req as Request & { file?: Express.Multer.File }).file;
    const tipo       = req.body.tipo       as string;
    const concepto   = req.body.concepto   as string;
    const monto      = parseFloat(req.body.monto);
    const fecha      = req.body.fecha      as string | undefined;
    const encargado  = req.body.encargado  as string;
    const categoriaId= req.body.categoria_id as string | undefined;
    const notas      = req.body.notas      as string | undefined;

    if (!['entrada', 'salida'].includes(tipo)) {
      res.status(400).json({ mensaje: 'Tipo debe ser entrada o salida.' }); return;
    }
    if (!concepto?.trim()) {
      res.status(400).json({ mensaje: 'El concepto es obligatorio.' }); return;
    }
    if (!monto || monto <= 0) {
      res.status(400).json({ mensaje: 'El monto debe ser mayor a cero.' }); return;
    }
    if (!encargado?.trim()) {
      res.status(400).json({ mensaje: 'El encargado es obligatorio.' }); return;
    }

    const resultado = await pool.query(
      `INSERT INTO movimientos_caja
         (tipo, concepto, monto, fecha, encargado, categoria_id,
          voucher_nombre, voucher_mime, voucher_contenido, voucher_tamano,
          notas, registrado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id, tipo, concepto, monto, fecha, encargado, categoria_id,
                 voucher_nombre, voucher_mime, voucher_tamano, notas,
                 registrado_por, fecha_registro`,
      [
        tipo,
        concepto.trim(),
        monto,
        fecha || new Date().toISOString().split('T')[0],
        encargado.trim(),
        categoriaId || null,
        file?.originalname || null,
        file?.mimetype     || null,
        file?.buffer       || null,
        file?.size         || null,
        notas?.trim()      || null,
        usuario?.userId    || null,
      ]
    );

    const movimiento = resultado.rows[0];
    await registrarLog('tesoreria', 'movimientos_caja', movimiento.id, 'crear',
      { tipo, monto, concepto }, usuario);

    res.status(201).json({ mensaje: 'Movimiento registrado correctamente.', movimiento });
  } catch (error) {
    console.error('Error al crear movimiento:', error);
    res.status(500).json({ mensaje: 'Error interno al registrar el movimiento.' });
  }
};

export const editarMovimiento = async (req: Request, res: Response): Promise<void> => {
  try {
    const usuario = req.usuario;
    const id = req.params.id as string;
    const file = (req as Request & { file?: Express.Multer.File }).file;

    const existe = await pool.query('SELECT id FROM movimientos_caja WHERE id = $1', [id]);
    if (existe.rowCount === 0) { res.status(404).json({ mensaje: 'Movimiento no encontrado.' }); return; }

    const tipo       = req.body.tipo        as string | undefined;
    const concepto   = req.body.concepto    as string | undefined;
    const montoRaw   = req.body.monto;
    const fecha      = req.body.fecha       as string | undefined;
    const encargado  = req.body.encargado   as string | undefined;
    const categoriaId= req.body.categoria_id as string | undefined;
    const notas      = req.body.notas       as string | undefined;

    if (tipo && !['entrada', 'salida'].includes(tipo)) {
      res.status(400).json({ mensaje: 'Tipo inválido.' }); return;
    }
    const monto = montoRaw ? parseFloat(montoRaw) : undefined;
    if (monto !== undefined && monto <= 0) {
      res.status(400).json({ mensaje: 'El monto debe ser mayor a cero.' }); return;
    }

    const campos: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const valores: any[] = [];
    let idx = 1;

    if (tipo)              { campos.push(`tipo = $${idx++}`);         valores.push(tipo); }
    if (concepto?.trim())  { campos.push(`concepto = $${idx++}`);     valores.push(concepto.trim()); }
    if (monto !== undefined){ campos.push(`monto = $${idx++}`);       valores.push(monto); }
    if (fecha)             { campos.push(`fecha = $${idx++}`);        valores.push(fecha); }
    if (encargado?.trim()) { campos.push(`encargado = $${idx++}`);    valores.push(encargado.trim()); }
    if (categoriaId !== undefined) { campos.push(`categoria_id = $${idx++}`); valores.push(categoriaId || null); }
    if (notas !== undefined)       { campos.push(`notas = $${idx++}`);         valores.push(notas.trim() || null); }
    if (file) {
      campos.push(`voucher_nombre = $${idx++}`);    valores.push(file.originalname);
      campos.push(`voucher_mime = $${idx++}`);      valores.push(file.mimetype);
      campos.push(`voucher_contenido = $${idx++}`); valores.push(file.buffer);
      campos.push(`voucher_tamano = $${idx++}`);    valores.push(file.size);
    }

    if (campos.length === 0) { res.status(400).json({ mensaje: 'Sin campos para actualizar.' }); return; }

    valores.push(id);
    const resultado = await pool.query(
      `UPDATE movimientos_caja SET ${campos.join(', ')}
       WHERE id = $${idx}
       RETURNING id, tipo, concepto, monto, fecha, encargado, categoria_id,
                 voucher_nombre, voucher_mime, voucher_tamano, notas,
                 registrado_por, fecha_registro`,
      valores
    );

    await registrarLog('tesoreria', 'movimientos_caja', id, 'editar',
      { tipo, monto, concepto }, usuario);

    res.json({ mensaje: 'Movimiento actualizado.', movimiento: resultado.rows[0] });
  } catch (error) {
    console.error('Error al editar movimiento:', error);
    res.status(500).json({ mensaje: 'Error interno al editar el movimiento.' });
  }
};

export const eliminarMovimiento = async (req: Request, res: Response): Promise<void> => {
  try {
    const usuario = req.usuario;
    const id = req.params.id as string;

    const existe = await pool.query(
      'SELECT id, concepto, monto FROM movimientos_caja WHERE id = $1', [id]
    );
    if (existe.rowCount === 0) { res.status(404).json({ mensaje: 'Movimiento no encontrado.' }); return; }

    const mov = existe.rows[0];
    await pool.query('DELETE FROM movimientos_caja WHERE id = $1', [id]);

    await registrarLog('tesoreria', 'movimientos_caja', id, 'eliminar',
      { concepto: mov.concepto, monto: mov.monto }, usuario);

    res.json({ mensaje: 'Movimiento eliminado.' });
  } catch (error) {
    console.error('Error al eliminar movimiento:', error);
    res.status(500).json({ mensaje: 'Error interno al eliminar el movimiento.' });
  }
};

export const verVoucherMovimiento = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const resultado = await pool.query(
      `SELECT voucher_contenido, voucher_nombre, voucher_mime
       FROM movimientos_caja WHERE id = $1`,
      [id]
    );
    if (resultado.rowCount === 0 || !resultado.rows[0].voucher_contenido) {
      res.status(404).json({ mensaje: 'Voucher no encontrado.' }); return;
    }
    const { voucher_contenido, voucher_nombre, voucher_mime } = resultado.rows[0];
    res.setHeader('Content-Type', voucher_mime || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${voucher_nombre || 'voucher'}"`);
    res.send(voucher_contenido);
  } catch (error) {
    console.error('Error al obtener voucher:', error);
    res.status(500).json({ mensaje: 'Error interno al obtener el voucher.' });
  }
};

// ================================================================
// TRASPASOS
// ================================================================

export const listarTraspasos = async (req: Request, res: Response): Promise<void> => {
  try {
    const pagina = Math.max(1, parseInt(req.query.pagina as string) || 1);
    const limite = Math.min(100, Math.max(1, parseInt(req.query.limite as string) || 20));
    const offset = (pagina - 1) * limite;

    const totalResult = await pool.query('SELECT COUNT(*) FROM traspasos');
    const total = parseInt(totalResult.rows[0].count, 10);

    const resultado = await pool.query(
      `SELECT t.*,
          co.alias AS cuenta_origen_alias,
          cd.alias AS cuenta_destino_alias
        FROM traspasos t
        LEFT JOIN cuentas_bancarias co ON co.id = t.cuenta_origen_id
        LEFT JOIN cuentas_bancarias cd ON cd.id = t.cuenta_destino_id
        ORDER BY t.fecha DESC, t.fecha_registro DESC
        LIMIT $1 OFFSET $2`,
      [limite, offset]
    );

    res.json({
      traspasos:    resultado.rows,
      total, pagina, limite,
      totalPaginas: Math.ceil(total / limite),
    });
  } catch (error) {
    console.error('Error al listar traspasos:', error);
    res.status(500).json({ mensaje: 'Error interno al obtener los traspasos.' });
  }
};

export const crearTraspaso = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const usuario          = req.usuario;
    const file             = (req as Request & { file?: Express.Multer.File }).file;
    const monto            = parseFloat(req.body.monto);
    const concepto         = req.body.concepto  as string | undefined;
    const fecha            = req.body.fecha     as string | undefined;
    const cuentaOrigenId   = (req.body.cuenta_origen_id  as string) || null;
    const cuentaDestinoId  = (req.body.cuenta_destino_id as string) || null;

    if (!monto || monto <= 0) {
      res.status(400).json({ mensaje: 'El monto debe ser mayor a cero.' }); return;
    }
    if (cuentaOrigenId && cuentaOrigenId === cuentaDestinoId) {
      res.status(400).json({ mensaje: 'Origen y destino no pueden ser la misma cuenta.' }); return;
    }
    if (!cuentaOrigenId && !cuentaDestinoId) {
      res.status(400).json({ mensaje: 'Especifica al menos origen o destino como cuenta bancaria.' }); return;
    }

    await client.query('BEGIN');

    // Descontar de cuenta origen (si no es caja chica)
    if (cuentaOrigenId) {
      const origen = await client.query(
        `SELECT saldo_actual FROM cuentas_bancarias WHERE id = $1 AND activa = true FOR UPDATE`,
        [cuentaOrigenId]
      );
      if (origen.rowCount === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ mensaje: 'Cuenta origen no encontrada.' }); return;
      }
      if (parseFloat(origen.rows[0].saldo_actual) < monto) {
        await client.query('ROLLBACK');
        res.status(400).json({
          mensaje: `Saldo insuficiente en cuenta origen (${parseFloat(origen.rows[0].saldo_actual).toFixed(2)} MXN).`
        }); return;
      }
      await client.query(
        `UPDATE cuentas_bancarias SET saldo_actual = saldo_actual - $1, fecha_actualizacion = NOW() WHERE id = $2`,
        [monto, cuentaOrigenId]
      );
    }

    // Sumar a cuenta destino (si no es caja chica)
    if (cuentaDestinoId) {
      const destino = await client.query(
        `SELECT id FROM cuentas_bancarias WHERE id = $1 AND activa = true`,
        [cuentaDestinoId]
      );
      if (destino.rowCount === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ mensaje: 'Cuenta destino no encontrada.' }); return;
      }
      await client.query(
        `UPDATE cuentas_bancarias SET saldo_actual = saldo_actual + $1, fecha_actualizacion = NOW() WHERE id = $2`,
        [monto, cuentaDestinoId]
      );
    }

    // Traspaso a caja chica → entrada automática en movimientos_caja
    if (!cuentaDestinoId) {
      await client.query(
        `INSERT INTO movimientos_caja (tipo, concepto, monto, encargado, registrado_por)
         VALUES ('entrada', $1, $2, 'Sistema (reposición desde banco)', $3)`,
        [concepto?.trim() || 'Reposición de caja desde cuenta bancaria', monto, usuario?.userId || null]
      );
    }

    // Traspaso desde caja chica → salida automática en movimientos_caja
    if (!cuentaOrigenId) {
      await client.query(
        `INSERT INTO movimientos_caja (tipo, concepto, monto, encargado, registrado_por)
         VALUES ('salida', $1, $2, 'Sistema (traspaso a banco)', $3)`,
        [concepto?.trim() || 'Traspaso a cuenta bancaria', monto, usuario?.userId || null]
      );
    }

    const traspasoResult = await client.query(
      `INSERT INTO traspasos
         (cuenta_origen_id, cuenta_destino_id, monto, concepto, fecha,
          voucher_nombre, voucher_mime, voucher_contenido, voucher_tamano, registrado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id, cuenta_origen_id, cuenta_destino_id, monto, concepto, fecha,
                 voucher_nombre, voucher_tamano, registrado_por, fecha_registro`,
      [
        cuentaOrigenId  || null,
        cuentaDestinoId || null,
        monto,
        concepto?.trim() || null,
        fecha || new Date().toISOString().split('T')[0],
        file?.originalname || null,
        file?.mimetype     || null,
        file?.buffer       || null,
        file?.size         || null,
        usuario?.userId    || null,
      ]
    );

    await client.query('COMMIT');
    const traspaso = traspasoResult.rows[0];
    await registrarLog('tesoreria', 'traspasos', traspaso.id, 'crear',
      { monto, origen: cuentaOrigenId, destino: cuentaDestinoId }, usuario);

    res.status(201).json({ mensaje: 'Traspaso registrado correctamente.', traspaso });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al crear traspaso:', error);
    res.status(500).json({ mensaje: 'Error interno al crear el traspaso.' });
  } finally {
    client.release();
  }
};

export const verVoucherTraspaso = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const resultado = await pool.query(
      `SELECT voucher_contenido, voucher_nombre, voucher_mime FROM traspasos WHERE id = $1`,
      [id]
    );
    if (resultado.rowCount === 0 || !resultado.rows[0].voucher_contenido) {
      res.status(404).json({ mensaje: 'Voucher no encontrado.' }); return;
    }
    const { voucher_contenido, voucher_nombre, voucher_mime } = resultado.rows[0];
    res.setHeader('Content-Type', voucher_mime || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${voucher_nombre || 'voucher'}"`);
    res.send(voucher_contenido);
  } catch (error) {
    console.error('Error al obtener voucher:', error);
    res.status(500).json({ mensaje: 'Error interno al obtener el voucher.' });
  }
};

// ================================================================
// LOGS DE AUDITORÍA
// ================================================================

export const listarLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const modulo = (req.query.modulo as string) || '';
    const pagina = Math.max(1, parseInt(req.query.pagina as string) || 1);
    const limite = Math.min(100, Math.max(1, parseInt(req.query.limite as string) || 50));
    const offset = (pagina - 1) * limite;

    const condiciones: string[] = [];
    const valores: (string | number)[] = [];
    let idx = 1;

    if (modulo) { condiciones.push(`modulo = $${idx++}`); valores.push(modulo); }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
    const totalResult = await pool.query(`SELECT COUNT(*) FROM logs_auditoria ${where}`, valores);
    const total = parseInt(totalResult.rows[0].count, 10);

    const resultado = await pool.query(
      `SELECT * FROM logs_auditoria ${where}
       ORDER BY fecha_registro DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...valores, limite, offset]
    );

    res.json({ logs: resultado.rows, total, pagina, limite, totalPaginas: Math.ceil(total / limite) });
  } catch (error) {
    console.error('Error al listar logs:', error);
    res.status(500).json({ mensaje: 'Error interno al obtener los logs.' });
  }
};

// ================================================================
// FLUJO DE CAJA — agrega movimientos_caja del período por categoría
// ================================================================

export const resumenFlujoCaja = async (req: Request, res: Response): Promise<void> => {
  try {
    const hoy  = new Date();
    const mes  = parseInt(req.query.mes  as string) || (hoy.getMonth() + 1);
    const anio = parseInt(req.query.anio as string) || hoy.getFullYear();

    const totalesResult = await pool.query(
      `SELECT
         SUM(CASE WHEN tipo = 'entrada' THEN monto ELSE 0 END)::NUMERIC AS total_entradas,
         SUM(CASE WHEN tipo = 'salida'  THEN monto ELSE 0 END)::NUMERIC AS total_salidas,
         COUNT(*)::INTEGER AS total_movimientos
       FROM movimientos_caja
       WHERE EXTRACT(YEAR  FROM fecha) = $1
         AND EXTRACT(MONTH FROM fecha) = $2`,
      [anio, mes]
    );

    const catResult = await pool.query(
      `SELECT
         m.categoria_id,
         COALESCE(c.nombre, 'Sin categoría') AS categoria_nombre,
         m.tipo,
         SUM(m.monto)::NUMERIC  AS total,
         COUNT(*)::INTEGER      AS cantidad
       FROM movimientos_caja m
       LEFT JOIN categorias_movimiento c ON m.categoria_id = c.id
       WHERE EXTRACT(YEAR  FROM m.fecha) = $1
         AND EXTRACT(MONTH FROM m.fecha) = $2
       GROUP BY m.categoria_id, c.nombre, m.tipo
       ORDER BY m.tipo, total DESC`,
      [anio, mes]
    );

    const origenResult = await pool.query(
      `SELECT
         origen,
         SUM(monto_utilidad)::NUMERIC AS total,
         COUNT(*)::INTEGER            AS cantidad
       FROM historial_ingresos_central
       WHERE periodo_anio = $1
         AND periodo_mes  = $2
       GROUP BY origen
       ORDER BY total DESC`,
      [anio, mes]
    );

    const { total_entradas, total_salidas, total_movimientos } = totalesResult.rows[0];
    const te = parseFloat(total_entradas ?? '0');
    const ts = parseFloat(total_salidas  ?? '0');

    const ingresosPorOrigen = origenResult.rows.map(r => ({
      origen:   r.origen,
      total:    parseFloat(r.total ?? '0'),
      cantidad: r.cantidad ?? 0,
    }));
    const totalIngresosExternos = ingresosPorOrigen.reduce((s, r) => s + r.total, 0);

    res.json({
      mes,
      anio,
      total_entradas:          te,
      total_salidas:           ts,
      flujo_neto:              parseFloat((te - ts).toFixed(2)),
      total_movimientos:       total_movimientos ?? 0,
      por_categoria:           catResult.rows,
      ingresos_por_origen:     ingresosPorOrigen,
      total_ingresos_externos: parseFloat(totalIngresosExternos.toFixed(2)),
    });
  } catch (error) {
    console.error('Error al calcular flujo de caja:', error);
    res.status(500).json({ mensaje: 'Error interno al calcular flujo de caja.' });
  }
};
