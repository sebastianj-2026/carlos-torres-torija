import { Request, Response } from 'express';
import pool from '../config/database';
import {
  CrearClienteDto,
  EditarClienteDto,
  ActualizarDocumentoDto,
  CrearReferenciaDto,
  EstatusCliente,
  TipoDocumento,
} from '../models/cliente.model';

// ----------------------------------------------------------------
// Estadísticas rápidas para el dashboard
// GET /api/clientes/stats
// ----------------------------------------------------------------
export const estadisticasClientes = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*)                                                AS total,
        COUNT(*) FILTER (WHERE estatus = 'en_juicio')          AS en_juicio,
        COUNT(*) FILTER (WHERE estatus = 'negociado')          AS negociados,
        (
          SELECT COUNT(DISTINCT cliente_id)
          FROM prestamos
          WHERE estatus NOT IN ('liquidado', 'cancelado')
        )                                                       AS con_prestamo_vigente,
        (
          SELECT COUNT(*) FROM clientes c2
          WHERE NOT EXISTS (
            SELECT 1 FROM prestamos p
            WHERE p.cliente_id = c2.id AND p.estatus NOT IN ('liquidado','cancelado')
          )
        )                                                       AS inactivos
      FROM clientes
    `);

    const r = result.rows[0];
    res.json({
      total:                parseInt(r.total, 10),
      con_prestamo_vigente: parseInt(r.con_prestamo_vigente, 10),
      inactivos:            parseInt(r.inactivos, 10),
      en_juicio:            parseInt(r.en_juicio, 10),
      negociados:           parseInt(r.negociados, 10),
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de clientes:', error);
    res.status(500).json({ mensaje: 'Error interno al obtener estadísticas.' });
  }
};

// ----------------------------------------------------------------
// Listar clientes con búsqueda y paginación
// GET /api/clientes
// Query params: buscar, estatus, pagina, limite
// ----------------------------------------------------------------
export const listarClientes = async (req: Request, res: Response): Promise<void> => {
  try {
    const buscar = (req.query.buscar as string) || '';
    const estatus = (req.query.estatus as string) || '';
    const pagina = Math.max(1, parseInt(req.query.pagina as string) || 1);
    const limite = Math.min(100, Math.max(1, parseInt(req.query.limite as string) || 20));
    const offset = (pagina - 1) * limite;

    // Construir condiciones dinámicas
    const condiciones: string[] = [];
    const valores: (string | number)[] = [];
    let indice = 1;

    if (buscar) {
      condiciones.push(`(
        nombres ILIKE $${indice}
        OR apellido_paterno ILIKE $${indice}
        OR apellido_materno ILIKE $${indice}
        OR rfc ILIKE $${indice}
        OR curp ILIKE $${indice}
        OR telefono_celular ILIKE $${indice}
      )`);
      valores.push(`%${buscar}%`);
      indice++;
    }

    if (estatus) {
      condiciones.push(`(CASE
        WHEN c.estatus = 'inactivo' AND EXISTS (SELECT 1 FROM prestamos p WHERE p.cliente_id = c.id AND p.estatus NOT IN ('liquidado','cancelado')) THEN 'activo'
        WHEN c.estatus = 'activo' AND NOT EXISTS (SELECT 1 FROM prestamos p WHERE p.cliente_id = c.id) THEN 'inactivo'
        ELSE c.estatus
      END) = $${indice}`);
      valores.push(estatus);
      indice++;
    }

    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    // Consulta de total
    const totalResult = await pool.query(
      `SELECT COUNT(*) FROM clientes c ${where}`,
      valores
    );
    const total = parseInt(totalResult.rows[0].count, 10);

    // Consulta paginada
    const clientes = await pool.query(
      `SELECT
        c.id,
        c.nombres,
        c.apellido_paterno,
        c.apellido_materno,
        c.rfc,
        c.telefono_celular,
        CASE
          WHEN c.estatus = 'inactivo' AND EXISTS (
            SELECT 1 FROM prestamos p
            WHERE p.cliente_id = c.id AND p.estatus NOT IN ('liquidado','cancelado')
          ) THEN 'activo'
          WHEN c.estatus = 'activo' AND NOT EXISTS (
            SELECT 1 FROM prestamos p WHERE p.cliente_id = c.id
          ) THEN 'inactivo'
          ELSE c.estatus
        END AS estatus,
        c.fecha_registro,
        stats.deuda_total,
        stats.interes_mensual,
        stats.meses_sin_pago,
        stats.num_prestamos
      FROM clientes c
      LEFT JOIN LATERAL (
        SELECT
          COALESCE(SUM(p.saldo_pendiente), 0)                                AS deuda_total,
          COALESCE(SUM(p.saldo_pendiente * p.tasa_interes_mensual / 100), 0) AS interes_mensual,
          COUNT(p.id)                                                          AS num_prestamos,
          COALESCE(
            GREATEST(0,
              MAX(
                CASE
                  WHEN lp.ultimo_pago IS NOT NULL THEN
                    (EXTRACT(YEAR  FROM CURRENT_DATE)::int - EXTRACT(YEAR  FROM lp.ultimo_pago)::int) * 12 +
                    (EXTRACT(MONTH FROM CURRENT_DATE)::int - EXTRACT(MONTH FROM lp.ultimo_pago)::int)
                  WHEN p.fecha_inicio <= CURRENT_DATE THEN
                    (EXTRACT(YEAR  FROM CURRENT_DATE)::int - EXTRACT(YEAR  FROM p.fecha_inicio)::int) * 12 +
                    (EXTRACT(MONTH FROM CURRENT_DATE)::int - EXTRACT(MONTH FROM p.fecha_inicio)::int) + 1
                  ELSE 0
                END
              )
            ), 0
          )                                                                    AS meses_sin_pago
        FROM prestamos p
        LEFT JOIN LATERAL (
          SELECT MAX(hpp.fecha_pago) AS ultimo_pago
          FROM historial_pagos_prestamo hpp
          WHERE hpp.prestamo_id = p.id
            AND hpp.tipo_pago = 'interes'
        ) lp ON true
        WHERE p.cliente_id = c.id
          AND p.estatus NOT IN ('liquidado', 'cancelado')
      ) stats ON true
      ${where}
      ORDER BY c.apellido_paterno ASC, c.nombres ASC
      LIMIT $${indice} OFFSET $${indice + 1}`,
      [...valores, limite, offset]
    );

    res.json({
      clientes: clientes.rows,
      total,
      pagina,
      limite,
      totalPaginas: Math.ceil(total / limite),
    });
  } catch (error) {
    console.error('Error al listar clientes:', error);
    res.status(500).json({ mensaje: 'Error interno al obtener clientes.' });
  }
};

// ----------------------------------------------------------------
// Obtener expediente completo de un cliente
// GET /api/clientes/:id
// ----------------------------------------------------------------
export const obtenerCliente = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const clienteResult = await pool.query(
      `SELECT c.*,
        CASE
          WHEN c.estatus = 'inactivo' AND EXISTS (
            SELECT 1 FROM prestamos p
            WHERE p.cliente_id = c.id AND p.estatus NOT IN ('liquidado','cancelado')
          ) THEN 'activo'
          WHEN c.estatus = 'activo' AND NOT EXISTS (
            SELECT 1 FROM prestamos p WHERE p.cliente_id = c.id
          ) THEN 'inactivo'
          ELSE c.estatus
        END AS estatus
       FROM clientes c WHERE c.id = $1`,
      [id]
    );

    if (clienteResult.rowCount === 0) {
      res.status(404).json({ mensaje: 'Cliente no encontrado.' });
      return;
    }

    const documentosResult = await pool.query(
      'SELECT * FROM documentos_cliente WHERE cliente_id = $1 ORDER BY tipo ASC',
      [id]
    );

    const referenciasResult = await pool.query(
      'SELECT * FROM referencias_cliente WHERE cliente_id = $1 ORDER BY fecha_registro ASC',
      [id]
    );

    res.json({
      ...clienteResult.rows[0],
      documentos: documentosResult.rows,
      referencias: referenciasResult.rows,
    });
  } catch (error) {
    console.error('Error al obtener cliente:', error);
    res.status(500).json({ mensaje: 'Error interno al obtener el expediente.' });
  }
};

// ----------------------------------------------------------------
// Crear un nuevo cliente
// POST /api/clientes
// ----------------------------------------------------------------
export const crearCliente = async (req: Request, res: Response): Promise<void> => {
  try {
    const registrado_por = req.usuario?.userId;
    const datos: CrearClienteDto = req.body;

    if (!datos.nombres?.trim() || !datos.apellido_paterno?.trim()) {
      res.status(400).json({ mensaje: 'Los campos nombres y apellido_paterno son obligatorios.' });
      return;
    }

    const resultado = await pool.query(
      `INSERT INTO clientes (
        nombres, apellido_paterno, apellido_materno,
        fecha_nacimiento, rfc, curp,
        telefono_celular, telefono_adicional, correo,
        calle, numero_exterior, numero_interior,
        colonia, municipio, estado, codigo_postal,
        ocupacion, nombre_trabajo, telefono_trabajo,
        ubicacion_expediente, registrado_por
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9,
        $10, $11, $12,
        $13, $14, $15, $16,
        $17, $18, $19,
        $20, $21
      ) RETURNING *`,
      [
        datos.nombres.trim(),
        datos.apellido_paterno.trim(),
        datos.apellido_materno?.trim() || null,
        datos.fecha_nacimiento || null,
        datos.rfc?.toUpperCase().trim() || null,
        datos.curp?.toUpperCase().trim() || null,
        datos.telefono_celular?.trim() || null,
        datos.telefono_adicional?.trim() || null,
        datos.correo?.toLowerCase().trim() || null,
        datos.calle?.trim() || null,
        datos.numero_exterior?.trim() || null,
        datos.numero_interior?.trim() || null,
        datos.colonia?.trim() || null,
        datos.municipio?.trim() || null,
        datos.estado?.trim() || null,
        datos.codigo_postal?.trim() || null,
        datos.ocupacion?.trim() || null,
        datos.nombre_trabajo?.trim() || null,
        datos.telefono_trabajo?.trim() || null,
        datos.ubicacion_expediente?.trim() || null,
        registrado_por || null,
      ]
    );

    // Crear checklist inicial de documentos (todos en false)
    const tiposDocumento: TipoDocumento[] = [
      'ine', 'escritura', 'r20', 'recibo_luz',
      'constancia_no_adeudo', 'predial', 'curp', 'rfc',
    ];

    const clienteId = resultado.rows[0].id;

    for (const tipo of tiposDocumento) {
      await pool.query(
        `INSERT INTO documentos_cliente (cliente_id, tipo, registrado_por)
         VALUES ($1, $2, $3)
         ON CONFLICT (cliente_id, tipo) DO NOTHING`,
        [clienteId, tipo, registrado_por || null]
      );
    }

    res.status(201).json({
      mensaje: 'Cliente registrado correctamente.',
      cliente: resultado.rows[0],
    });
  } catch (error) {
    console.error('Error al crear cliente:', error);
    res.status(500).json({ mensaje: 'Error interno al registrar el cliente.' });
  }
};

// ----------------------------------------------------------------
// Editar datos de un cliente
// PUT /api/clientes/:id
// ----------------------------------------------------------------
export const editarCliente = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const datos: EditarClienteDto = req.body;

    // Verificar que el cliente existe
    const existe = await pool.query('SELECT id FROM clientes WHERE id = $1', [id]);
    if (existe.rowCount === 0) {
      res.status(404).json({ mensaje: 'Cliente no encontrado.' });
      return;
    }

    const resultado = await pool.query(
      `UPDATE clientes SET
        nombres             = COALESCE($1, nombres),
        apellido_paterno    = COALESCE($2, apellido_paterno),
        apellido_materno    = COALESCE($3, apellido_materno),
        fecha_nacimiento    = COALESCE($4, fecha_nacimiento),
        rfc                 = COALESCE($5, rfc),
        curp                = COALESCE($6, curp),
        telefono_celular    = COALESCE($7, telefono_celular),
        telefono_adicional  = COALESCE($8, telefono_adicional),
        correo              = COALESCE($9, correo),
        calle               = COALESCE($10, calle),
        numero_exterior     = COALESCE($11, numero_exterior),
        numero_interior     = COALESCE($12, numero_interior),
        colonia             = COALESCE($13, colonia),
        municipio           = COALESCE($14, municipio),
        estado              = COALESCE($15, estado),
        codigo_postal       = COALESCE($16, codigo_postal),
        ocupacion           = COALESCE($17, ocupacion),
        nombre_trabajo      = COALESCE($18, nombre_trabajo),
        telefono_trabajo    = COALESCE($19, telefono_trabajo),
        ubicacion_expediente = COALESCE($20, ubicacion_expediente),
        fecha_actualizacion = NOW()
      WHERE id = $21
      RETURNING *`,
      [
        datos.nombres?.trim() || null,
        datos.apellido_paterno?.trim() || null,
        datos.apellido_materno?.trim() || null,
        datos.fecha_nacimiento || null,
        datos.rfc?.toUpperCase().trim() || null,
        datos.curp?.toUpperCase().trim() || null,
        datos.telefono_celular?.trim() || null,
        datos.telefono_adicional?.trim() || null,
        datos.correo?.toLowerCase().trim() || null,
        datos.calle?.trim() || null,
        datos.numero_exterior?.trim() || null,
        datos.numero_interior?.trim() || null,
        datos.colonia?.trim() || null,
        datos.municipio?.trim() || null,
        datos.estado?.trim() || null,
        datos.codigo_postal?.trim() || null,
        datos.ocupacion?.trim() || null,
        datos.nombre_trabajo?.trim() || null,
        datos.telefono_trabajo?.trim() || null,
        datos.ubicacion_expediente?.trim() || null,
        id,
      ]
    );

    res.json({
      mensaje: 'Cliente actualizado correctamente.',
      cliente: resultado.rows[0],
    });
  } catch (error) {
    console.error('Error al editar cliente:', error);
    res.status(500).json({ mensaje: 'Error interno al actualizar el cliente.' });
  }
};

// ----------------------------------------------------------------
// Cambiar estatus del cliente
// PATCH /api/clientes/:id/estatus
// ----------------------------------------------------------------
export const cambiarEstatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { estatus } = req.body as { estatus: EstatusCliente };

    const estatusValidos: EstatusCliente[] = ['activo', 'atrasado', 'negociado', 'en_juicio', 'inactivo'];

    if (!estatusValidos.includes(estatus)) {
      res.status(400).json({ mensaje: 'Estatus no válido.', estatusValidos });
      return;
    }

    // Si tiene préstamos activos, no se puede poner inactivo
    const tienePrestamos = await pool.query(
      `SELECT 1 FROM prestamos WHERE cliente_id = $1
       AND estatus NOT IN ('liquidado', 'cancelado') LIMIT 1`,
      [id]
    );
    const estatusFinal = (tienePrestamos.rowCount! > 0 && estatus === 'inactivo') ? 'activo' : estatus;

    const resultado = await pool.query(
      `UPDATE clientes
       SET estatus = $1, fecha_actualizacion = NOW()
       WHERE id = $2
       RETURNING id, estatus, fecha_actualizacion`,
      [estatusFinal, id]
    );

    if (resultado.rowCount === 0) {
      res.status(404).json({ mensaje: 'Cliente no encontrado.' });
      return;
    }

    res.json({
      mensaje: 'Estatus actualizado correctamente.',
      ...resultado.rows[0],
    });
  } catch (error) {
    console.error('Error al cambiar estatus:', error);
    res.status(500).json({ mensaje: 'Error interno al cambiar el estatus.' });
  }
};

// ----------------------------------------------------------------
// Listar documentos del checklist de un cliente
// GET /api/clientes/:id/documentos
// ----------------------------------------------------------------
export const listarDocumentos = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const resultado = await pool.query(
      'SELECT * FROM documentos_cliente WHERE cliente_id = $1 ORDER BY tipo ASC',
      [id]
    );

    res.json(resultado.rows);
  } catch (error) {
    console.error('Error al listar documentos:', error);
    res.status(500).json({ mensaje: 'Error interno al obtener documentos.' });
  }
};

// ----------------------------------------------------------------
// Actualizar checklist de documentos
// PUT /api/clientes/:id/documentos
// Body: array de { tipo, entregado, digitalizado, url_archivo? }
// ----------------------------------------------------------------
export const actualizarDocumentos = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const documentos: ActualizarDocumentoDto[] = req.body;
    const registrado_por = req.usuario?.userId;

    if (!Array.isArray(documentos) || documentos.length === 0) {
      res.status(400).json({ mensaje: 'Se requiere un arreglo de documentos.' });
      return;
    }

    for (const doc of documentos) {
      await pool.query(
        `INSERT INTO documentos_cliente
           (cliente_id, tipo, entregado, digitalizado, url_archivo, registrado_por)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (cliente_id, tipo)
         DO UPDATE SET
           entregado    = EXCLUDED.entregado,
           digitalizado = EXCLUDED.digitalizado,
           url_archivo  = COALESCE(EXCLUDED.url_archivo, documentos_cliente.url_archivo)`,
        [
          id,
          doc.tipo,
          doc.entregado ?? false,
          doc.digitalizado ?? false,
          doc.url_archivo || null,
          registrado_por || null,
        ]
      );
    }

    const resultado = await pool.query(
      'SELECT * FROM documentos_cliente WHERE cliente_id = $1 ORDER BY tipo ASC',
      [id]
    );

    res.json({
      mensaje: 'Documentos actualizados correctamente.',
      documentos: resultado.rows,
    });
  } catch (error) {
    console.error('Error al actualizar documentos:', error);
    res.status(500).json({ mensaje: 'Error interno al actualizar documentos.' });
  }
};

// ----------------------------------------------------------------
// Listar referencias personales de un cliente
// GET /api/clientes/:id/referencias
// ----------------------------------------------------------------
export const listarReferencias = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const resultado = await pool.query(
      'SELECT * FROM referencias_cliente WHERE cliente_id = $1 ORDER BY fecha_registro ASC',
      [id]
    );

    res.json(resultado.rows);
  } catch (error) {
    console.error('Error al listar referencias:', error);
    res.status(500).json({ mensaje: 'Error interno al obtener referencias.' });
  }
};

// ----------------------------------------------------------------
// Agregar referencia personal a un cliente
// POST /api/clientes/:id/referencias
// ----------------------------------------------------------------
export const agregarReferencia = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const datos: CrearReferenciaDto = req.body;
    const registrado_por = req.usuario?.userId;

    if (!datos.nombre_completo?.trim()) {
      res.status(400).json({ mensaje: 'El nombre completo de la referencia es obligatorio.' });
      return;
    }

    const resultado = await pool.query(
      `INSERT INTO referencias_cliente
         (cliente_id, nombre_completo, telefono, relacion, registrado_por)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        id,
        datos.nombre_completo.trim(),
        datos.telefono?.trim() || null,
        datos.relacion || null,
        registrado_por || null,
      ]
    );

    res.status(201).json({
      mensaje: 'Referencia agregada correctamente.',
      referencia: resultado.rows[0],
    });
  } catch (error) {
    console.error('Error al agregar referencia:', error);
    res.status(500).json({ mensaje: 'Error interno al agregar la referencia.' });
  }
};

// ----------------------------------------------------------------
// Eliminar una referencia personal
// DELETE /api/clientes/:id/referencias/:refId
// ----------------------------------------------------------------
export const eliminarReferencia = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, refId } = req.params;

    const resultado = await pool.query(
      'DELETE FROM referencias_cliente WHERE id = $1 AND cliente_id = $2 RETURNING id',
      [refId, id]
    );

    if (resultado.rowCount === 0) {
      res.status(404).json({ mensaje: 'Referencia no encontrada.' });
      return;
    }

    res.json({ mensaje: 'Referencia eliminada correctamente.' });
  } catch (error) {
    console.error('Error al eliminar referencia:', error);
    res.status(500).json({ mensaje: 'Error interno al eliminar la referencia.' });
  }
};
