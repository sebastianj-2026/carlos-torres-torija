import { Request, Response } from 'express';
import pool from '../config/database';
import {
  ActualizarJuicioDto,
  AgregarGastoLegalDto,
  AgregarBitacoraDto,
  EtapaProcesal,
} from '../models/juicio.model';

const ETIQUETAS_ETAPA: Record<EtapaProcesal, string> = {
  demanda:       'Demanda',
  emplazamiento: 'Emplazamiento',
  pruebas:       'Pruebas',
  sentencia:     'Sentencia',
};

const ETAPAS_VALIDAS: EtapaProcesal[] = ['demanda', 'emplazamiento', 'pruebas', 'sentencia'];

// ================================================================
// JUICIOS
// ================================================================

const queryResumenJuicio = `
  SELECT
    j.id,
    j.prestamo_id,
    p.folio,
    j.cliente_id,
    CONCAT(c.nombres, ' ', c.apellido_paterno,
      CASE WHEN c.apellido_materno IS NOT NULL THEN ' ' || c.apellido_materno ELSE '' END
    ) AS cliente_nombre,
    j.abogado_nombre,
    j.fecha_asignacion_abogado,
    j.fecha_inicio,
    j.etapa_procesal,
    j.proxima_fecha_critica,
    j.descripcion_fecha_critica,
    p.monto_prestado,
    p.saldo_pendiente,
    p.valor_propiedad,
    COALESCE(
      (SELECT SUM(gl.monto) FROM gastos_legales gl WHERE gl.juicio_id = j.id),
      0
    )::DECIMAL(14,2) AS total_gastos_legales,
    ROUND(
      p.saldo_pendiente + COALESCE(
        (SELECT SUM(gl.monto) FROM gastos_legales gl WHERE gl.juicio_id = j.id),
        0
      ), 2
    ) AS deuda_total,
    (
      SELECT MAX(hp.fecha_pago)
      FROM historial_pagos_prestamo hp
      WHERE hp.prestamo_id = j.prestamo_id
        AND hp.tipo_pago != 'interes_anticipado'
    ) AS fecha_ultimo_pago,
    j.activo
  FROM juicios j
  JOIN prestamos p ON p.id = j.prestamo_id
  JOIN clientes c ON c.id = j.cliente_id
`;

// ----------------------------------------------------------------
// GET /api/juicios
// ----------------------------------------------------------------
export const listarJuicios = async (req: Request, res: Response): Promise<void> => {
  try {
    const buscar = (req.query.buscar as string) || '';
    const pagina = Math.max(1, parseInt(req.query.pagina as string) || 1);
    const limite = Math.min(50, Math.max(1, parseInt(req.query.limite as string) || 20));
    const offset = (pagina - 1) * limite;

    const condiciones: string[] = ['j.activo = true'];
    const valores: (string | number)[] = [];
    let idx = 1;

    if (buscar) {
      condiciones.push(`(
        CONCAT(c.nombres, ' ', c.apellido_paterno) ILIKE $${idx}
        OR p.folio ILIKE $${idx}
        OR j.abogado_nombre ILIKE $${idx}
      )`);
      valores.push(`%${buscar}%`);
      idx++;
    }

    const where = `WHERE ${condiciones.join(' AND ')}`;

    const totalResult = await pool.query(
      `SELECT COUNT(*) FROM juicios j
       JOIN prestamos p ON p.id = j.prestamo_id
       JOIN clientes c ON c.id = j.cliente_id
       ${where}`,
      valores
    );

    const resultado = await pool.query(
      `${queryResumenJuicio}
       ${where}
       ORDER BY j.fecha_registro DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...valores, limite, offset]
    );

    res.json({
      juicios: resultado.rows,
      total: parseInt(totalResult.rows[0].count, 10),
      pagina,
      limite,
      totalPaginas: Math.ceil(parseInt(totalResult.rows[0].count, 10) / limite),
    });
  } catch (error) {
    console.error('Error al listar juicios:', error);
    res.status(500).json({ mensaje: 'Error interno al obtener juicios.' });
  }
};

// ----------------------------------------------------------------
// GET /api/juicios/prestamo/:prestamoId
// ----------------------------------------------------------------
export const obtenerJuicioPorPrestamo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { prestamoId } = req.params;

    const resultado = await pool.query(
      `${queryResumenJuicio} WHERE j.prestamo_id = $1`,
      [prestamoId]
    );

    if (resultado.rowCount === 0) {
      res.status(404).json({ mensaje: 'Juicio no encontrado para este préstamo.' });
      return;
    }

    res.json(resultado.rows[0]);
  } catch (error) {
    console.error('Error al obtener juicio por préstamo:', error);
    res.status(500).json({ mensaje: 'Error interno.' });
  }
};

// ----------------------------------------------------------------
// GET /api/juicios/:id
// ----------------------------------------------------------------
export const obtenerJuicio = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const juicioResult = await pool.query(
      `SELECT
        j.*,
        p.folio,
        p.tipo_garantia,
        p.monto_prestado,
        p.saldo_pendiente,
        p.valor_propiedad,
        CONCAT(c.nombres, ' ', c.apellido_paterno,
          CASE WHEN c.apellido_materno IS NOT NULL THEN ' ' || c.apellido_materno ELSE '' END
        ) AS cliente_nombre,
        c.telefono_celular AS cliente_telefono,
        COALESCE(
          (SELECT SUM(gl.monto) FROM gastos_legales gl WHERE gl.juicio_id = j.id),
          0
        )::DECIMAL(14,2) AS total_gastos_legales,
        ROUND(
          p.saldo_pendiente + COALESCE(
            (SELECT SUM(gl.monto) FROM gastos_legales gl WHERE gl.juicio_id = j.id),
            0
          ), 2
        ) AS deuda_total,
        (
          SELECT MAX(hp.fecha_pago)
          FROM historial_pagos_prestamo hp
          WHERE hp.prestamo_id = j.prestamo_id
            AND hp.tipo_pago != 'interes_anticipado'
        ) AS fecha_ultimo_pago
      FROM juicios j
      JOIN prestamos p ON p.id = j.prestamo_id
      JOIN clientes c ON c.id = j.cliente_id
      WHERE j.id = $1`,
      [id]
    );

    if (juicioResult.rowCount === 0) {
      res.status(404).json({ mensaje: 'Juicio no encontrado.' });
      return;
    }

    const [gastosResult, documentosResult, bitacoraResult] = await Promise.all([
      pool.query(
        'SELECT * FROM gastos_legales WHERE juicio_id = $1 ORDER BY fecha DESC, fecha_registro DESC',
        [id]
      ),
      pool.query(
        `SELECT id, juicio_id, nombre_documento, nombre_original, mime_type,
                tamano_bytes, registrado_por, fecha_registro
         FROM documentos_juicio WHERE juicio_id = $1 ORDER BY fecha_registro DESC`,
        [id]
      ),
      pool.query(
        'SELECT * FROM bitacora_legal WHERE juicio_id = $1 ORDER BY fecha_registro ASC',
        [id]
      ),
    ]);

    res.json({
      ...juicioResult.rows[0],
      gastos:    gastosResult.rows,
      documentos: documentosResult.rows,
      bitacora:  bitacoraResult.rows,
    });
  } catch (error) {
    console.error('Error al obtener juicio:', error);
    res.status(500).json({ mensaje: 'Error interno al obtener el juicio.' });
  }
};

// ----------------------------------------------------------------
// PUT /api/juicios/:id
// ----------------------------------------------------------------
export const actualizarJuicio = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const registrado_por = req.usuario?.userId;
    const datos: ActualizarJuicioDto = req.body;

    const existe = await pool.query(
      'SELECT id, etapa_procesal FROM juicios WHERE id = $1',
      [id]
    );
    if (existe.rowCount === 0) {
      res.status(404).json({ mensaje: 'Juicio no encontrado.' });
      return;
    }

    if (datos.etapa_procesal && !ETAPAS_VALIDAS.includes(datos.etapa_procesal)) {
      res.status(400).json({ mensaje: 'Etapa procesal no válida.', validas: ETAPAS_VALIDAS });
      return;
    }

    const etapaAnterior = existe.rows[0].etapa_procesal as EtapaProcesal;

    const resultado = await pool.query(
      `UPDATE juicios SET
        abogado_nombre            = $1,
        abogado_telefono          = $2,
        abogado_email             = $3,
        fecha_asignacion_abogado  = $4,
        etapa_procesal            = COALESCE($5, etapa_procesal),
        proxima_fecha_critica     = $6,
        descripcion_fecha_critica = $7,
        notas                     = $8,
        fecha_actualizacion       = NOW()
       WHERE id = $9
       RETURNING *`,
      [
        datos.abogado_nombre?.trim() || null,
        datos.abogado_telefono?.trim() || null,
        datos.abogado_email?.trim() || null,
        datos.fecha_asignacion_abogado || null,
        datos.etapa_procesal || null,
        datos.proxima_fecha_critica || null,
        datos.descripcion_fecha_critica?.trim() || null,
        datos.notas?.trim() || null,
        id,
      ]
    );

    if (datos.etapa_procesal && datos.etapa_procesal !== etapaAnterior) {
      await pool.query(
        `INSERT INTO bitacora_legal (juicio_id, descripcion, etapa, registrado_por)
         VALUES ($1, $2, $3, $4)`,
        [
          id,
          `Etapa procesal actualizada: "${ETIQUETAS_ETAPA[etapaAnterior]}" → "${ETIQUETAS_ETAPA[datos.etapa_procesal]}".`,
          datos.etapa_procesal,
          registrado_por ?? null,
        ]
      );
    }

    res.json({ mensaje: 'Juicio actualizado.', juicio: resultado.rows[0] });
  } catch (error) {
    console.error('Error al actualizar juicio:', error);
    res.status(500).json({ mensaje: 'Error interno al actualizar el juicio.' });
  }
};

// ================================================================
// GASTOS LEGALES
// ================================================================

// ----------------------------------------------------------------
// POST /api/juicios/:id/gastos
// ----------------------------------------------------------------
export const agregarGastoLegal = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const registrado_por = req.usuario?.userId;
    const datos: AgregarGastoLegalDto = req.body;

    if (!datos.concepto?.trim()) {
      res.status(400).json({ mensaje: 'El concepto es obligatorio.' });
      return;
    }
    if (!datos.monto || datos.monto <= 0) {
      res.status(400).json({ mensaje: 'El monto debe ser mayor a cero.' });
      return;
    }

    const existe = await pool.query('SELECT id FROM juicios WHERE id = $1', [id]);
    if (existe.rowCount === 0) {
      res.status(404).json({ mensaje: 'Juicio no encontrado.' });
      return;
    }

    const resultado = await pool.query(
      `INSERT INTO gastos_legales (juicio_id, concepto, monto, fecha, notas, registrado_por)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        id,
        datos.concepto.trim(),
        datos.monto,
        datos.fecha || new Date().toISOString().split('T')[0],
        datos.notas?.trim() || null,
        registrado_por ?? null,
      ]
    );

    await pool.query(
      'UPDATE juicios SET fecha_actualizacion = NOW() WHERE id = $1',
      [id]
    );

    res.status(201).json({ mensaje: 'Gasto legal registrado.', gasto: resultado.rows[0] });
  } catch (error) {
    console.error('Error al agregar gasto legal:', error);
    res.status(500).json({ mensaje: 'Error interno al registrar el gasto.' });
  }
};

// ----------------------------------------------------------------
// DELETE /api/juicios/:id/gastos/:gastoId
// ----------------------------------------------------------------
export const eliminarGastoLegal = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, gastoId } = req.params;

    const resultado = await pool.query(
      'DELETE FROM gastos_legales WHERE id = $1 AND juicio_id = $2 RETURNING id',
      [gastoId, id]
    );

    if (resultado.rowCount === 0) {
      res.status(404).json({ mensaje: 'Gasto no encontrado.' });
      return;
    }

    await pool.query('UPDATE juicios SET fecha_actualizacion = NOW() WHERE id = $1', [id]);

    res.json({ mensaje: 'Gasto eliminado.' });
  } catch (error) {
    console.error('Error al eliminar gasto legal:', error);
    res.status(500).json({ mensaje: 'Error interno.' });
  }
};

// ================================================================
// DOCUMENTOS JUICIO (Archivero Judicial)
// ================================================================

// ----------------------------------------------------------------
// GET /api/juicios/:id/documentos
// ----------------------------------------------------------------
export const listarDocumentosJuicio = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const resultado = await pool.query(
      `SELECT id, juicio_id, nombre_documento, nombre_original, mime_type,
              tamano_bytes, registrado_por, fecha_registro
       FROM documentos_juicio WHERE juicio_id = $1 ORDER BY fecha_registro DESC`,
      [id]
    );

    res.json(resultado.rows);
  } catch (error) {
    console.error('Error al listar documentos juicio:', error);
    res.status(500).json({ mensaje: 'Error interno.' });
  }
};

// ----------------------------------------------------------------
// POST /api/juicios/:id/documentos
// ----------------------------------------------------------------
export const subirDocumentoJuicio = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const registrado_por = req.usuario?.userId;
    const file = (req as Request & { file?: Express.Multer.File }).file;

    if (!file) {
      res.status(400).json({ mensaje: 'No se recibió ningún archivo.' });
      return;
    }

    const nombreDoc = (req.body.nombre_documento as string)?.trim() || file.originalname;

    const existe = await pool.query('SELECT id FROM juicios WHERE id = $1', [id]);
    if (existe.rowCount === 0) {
      res.status(404).json({ mensaje: 'Juicio no encontrado.' });
      return;
    }

    const resultado = await pool.query(
      `INSERT INTO documentos_juicio
         (juicio_id, nombre_documento, nombre_original, mime_type, contenido, tamano_bytes, registrado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, juicio_id, nombre_documento, nombre_original, mime_type, tamano_bytes, fecha_registro`,
      [id, nombreDoc, file.originalname, file.mimetype, file.buffer, file.size, registrado_por ?? null]
    );

    res.status(201).json({ mensaje: 'Documento cargado.', documento: resultado.rows[0] });
  } catch (error) {
    console.error('Error al subir documento juicio:', error);
    res.status(500).json({ mensaje: 'Error interno al guardar el documento.' });
  }
};

// ----------------------------------------------------------------
// GET /api/juicios/:id/documentos/:docId
// ----------------------------------------------------------------
export const descargarDocumentoJuicio = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, docId } = req.params;

    const resultado = await pool.query(
      `SELECT contenido, nombre_original, mime_type
       FROM documentos_juicio WHERE id = $1 AND juicio_id = $2`,
      [docId, id]
    );

    if (resultado.rowCount === 0) {
      res.status(404).json({ mensaje: 'Documento no encontrado.' });
      return;
    }

    const { contenido, nombre_original, mime_type } = resultado.rows[0];
    res.setHeader('Content-Type', mime_type || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${nombre_original || 'documento.pdf'}"`);
    res.send(contenido);
  } catch (error) {
    console.error('Error al descargar documento juicio:', error);
    res.status(500).json({ mensaje: 'Error interno.' });
  }
};

// ----------------------------------------------------------------
// DELETE /api/juicios/:id/documentos/:docId
// ----------------------------------------------------------------
export const eliminarDocumentoJuicio = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, docId } = req.params;

    const resultado = await pool.query(
      'DELETE FROM documentos_juicio WHERE id = $1 AND juicio_id = $2 RETURNING id',
      [docId, id]
    );

    if (resultado.rowCount === 0) {
      res.status(404).json({ mensaje: 'Documento no encontrado.' });
      return;
    }

    res.json({ mensaje: 'Documento eliminado.' });
  } catch (error) {
    console.error('Error al eliminar documento juicio:', error);
    res.status(500).json({ mensaje: 'Error interno.' });
  }
};

// ================================================================
// BITÁCORA LEGAL
// ================================================================

// ----------------------------------------------------------------
// GET /api/juicios/:id/bitacora
// ----------------------------------------------------------------
export const listarBitacora = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const resultado = await pool.query(
      'SELECT * FROM bitacora_legal WHERE juicio_id = $1 ORDER BY fecha_registro ASC',
      [id]
    );

    res.json(resultado.rows);
  } catch (error) {
    console.error('Error al listar bitácora:', error);
    res.status(500).json({ mensaje: 'Error interno.' });
  }
};

// ----------------------------------------------------------------
// POST /api/juicios/:id/bitacora
// ----------------------------------------------------------------
export const agregarBitacora = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const registrado_por = req.usuario?.userId;
    const datos: AgregarBitacoraDto = req.body;

    if (!datos.descripcion?.trim()) {
      res.status(400).json({ mensaje: 'La descripción es obligatoria.' });
      return;
    }

    const existe = await pool.query('SELECT id FROM juicios WHERE id = $1', [id]);
    if (existe.rowCount === 0) {
      res.status(404).json({ mensaje: 'Juicio no encontrado.' });
      return;
    }

    const resultado = await pool.query(
      `INSERT INTO bitacora_legal (juicio_id, descripcion, etapa, registrado_por)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, datos.descripcion.trim(), datos.etapa || null, registrado_por ?? null]
    );

    res.status(201).json({ mensaje: 'Entrada registrada.', entrada: resultado.rows[0] });
  } catch (error) {
    console.error('Error al agregar bitácora:', error);
    res.status(500).json({ mensaje: 'Error interno.' });
  }
};
