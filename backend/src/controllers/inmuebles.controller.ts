import { Request, Response } from 'express';
import pool from '../config/database';

// ================================================================
// INMUEBLES
// ================================================================
export const listarInmuebles = async (_req: Request, res: Response): Promise<void> => {
  try {
    const r = await pool.query(`
      SELECT i.*,
        CASE
          WHEN i.total_locales IS NOT NULL THEN
            (SELECT SUM(ca.monto_renta_mensual)
             FROM contratos_arrendamiento ca
             WHERE ca.inmueble_id = i.id AND ca.estatus = 'activo')
          ELSE
            (SELECT ca.monto_renta_mensual
             FROM contratos_arrendamiento ca
             WHERE ca.inmueble_id = i.id AND ca.estatus = 'activo' LIMIT 1)
        END AS renta_actual,
        CASE
          WHEN i.total_locales IS NOT NULL THEN
            (SELECT COUNT(*)::TEXT || '/' || i.total_locales::TEXT
             FROM contratos_arrendamiento ca
             WHERE ca.inmueble_id = i.id AND ca.estatus = 'activo')
          ELSE
            (SELECT CONCAT(iq.nombres,' ',iq.apellidos)
             FROM contratos_arrendamiento ca
             JOIN inquilinos iq ON iq.id = ca.inquilino_id
             WHERE ca.inmueble_id = i.id AND ca.estatus = 'activo' LIMIT 1)
        END AS inquilino_actual
      FROM inmuebles i
      ORDER BY i.fecha_registro DESC
    `);
    res.json(r.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al listar inmuebles.' });
  }
};

export const obtenerInmueble = async (req: Request, res: Response): Promise<void> => {
  try {
    const r = await pool.query('SELECT * FROM inmuebles WHERE id = $1', [req.params.id]);
    if ((r.rowCount ?? 0) === 0) { res.status(404).json({ mensaje: 'Inmueble no encontrado.' }); return; }
    res.json(r.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al obtener inmueble.' });
  }
};

export const crearInmueble = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      ubicacion_direccion, ciudad, estado, valor_propiedad,
      estatus = 'disponible', foto_principal_url, predial_cuenta, predial_mes_pago,
      es_renta_externa = false, propietario_nombre, total_locales,
    } = req.body;
    if (!ubicacion_direccion?.trim() || !ciudad?.trim() || !estado?.trim()) {
      res.status(400).json({ mensaje: 'ubicacion_direccion, ciudad y estado son obligatorios.' }); return;
    }
    const r = await pool.query(
      `INSERT INTO inmuebles
         (ubicacion_direccion, ciudad, estado, valor_propiedad, estatus, foto_principal_url,
          predial_cuenta, predial_mes_pago, es_renta_externa, propietario_nombre, total_locales)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        ubicacion_direccion.trim(), ciudad.trim(), estado.trim(),
        valor_propiedad || null, estatus,
        foto_principal_url || null, predial_cuenta || null, predial_mes_pago || null,
        es_renta_externa,
        propietario_nombre || null,
        total_locales || null,
      ]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al crear inmueble.' });
  }
};

export const editarInmueble = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      ubicacion_direccion, ciudad, estado, valor_propiedad,
      estatus, foto_principal_url, predial_cuenta, predial_mes_pago,
      es_renta_externa, propietario_nombre, total_locales,
    } = req.body;
    const r = await pool.query(
      `UPDATE inmuebles SET
         ubicacion_direccion = COALESCE($1,  ubicacion_direccion),
         ciudad              = COALESCE($2,  ciudad),
         estado              = COALESCE($3,  estado),
         valor_propiedad     = COALESCE($4,  valor_propiedad),
         estatus             = COALESCE($5,  estatus),
         foto_principal_url  = COALESCE($6,  foto_principal_url),
         predial_cuenta      = COALESCE($7,  predial_cuenta),
         predial_mes_pago    = COALESCE($8,  predial_mes_pago),
         es_renta_externa    = COALESCE($9,  es_renta_externa),
         propietario_nombre  = COALESCE($10, propietario_nombre),
         total_locales       = COALESCE($11, total_locales),
         fecha_actualizacion = NOW()
       WHERE id = $12 RETURNING *`,
      [
        ubicacion_direccion || null, ciudad || null, estado || null,
        valor_propiedad || null, estatus || null,
        foto_principal_url || null, predial_cuenta || null, predial_mes_pago || null,
        es_renta_externa ?? null,
        propietario_nombre || null,
        total_locales || null,
        id,
      ]
    );
    if ((r.rowCount ?? 0) === 0) { res.status(404).json({ mensaje: 'Inmueble no encontrado.' }); return; }
    res.json(r.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al editar inmueble.' });
  }
};

// ================================================================
// INQUILINO + CONTRATO (formulario unificado)
// ================================================================
export const crearInquilinoCompleto = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const {
      // Inquilino
      nombres, apellidos, telefono, aval_nombre, aval_propiedad_garantia, url_doc_aval,
      // Contrato
      inmueble_id, fecha_inicio, fecha_fin, monto_renta_mensual, dia_corte_pago,
      comision_oficina_pct, num_local, notas,
      url_contrato_pdf, url_pagare_pdf, url_id_inquilino,
      // Depósito
      monto_deposito, deposito_items, url_deposito,
    } = req.body;

    if (!nombres?.trim() || !apellidos?.trim()) {
      res.status(400).json({ mensaje: 'nombres y apellidos son obligatorios.' }); return;
    }
    if (!inmueble_id || !fecha_inicio || !fecha_fin || !monto_renta_mensual || !dia_corte_pago) {
      res.status(400).json({ mensaje: 'inmueble_id, fechas, monto_renta_mensual y dia_corte_pago son obligatorios.' }); return;
    }

    await client.query('BEGIN');

    if (num_local) {
      const ocupado = await client.query(
        `SELECT 1 FROM contratos_arrendamiento WHERE inmueble_id=$1 AND num_local=$2 AND estatus='activo'`,
        [inmueble_id, num_local]
      );
      if ((ocupado.rowCount ?? 0) > 0) {
        await client.query('ROLLBACK');
        res.status(400).json({ mensaje: `Local ${num_local} ya tiene un contrato activo.` }); return;
      }
    }

    const inq = await client.query(
      `INSERT INTO inquilinos
         (nombres, apellidos, telefono, aval_nombre, aval_propiedad_garantia, url_doc_aval)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [
        nombres.trim(), apellidos.trim(),
        telefono || null, aval_nombre || null, aval_propiedad_garantia || null, url_doc_aval || null,
      ]
    );
    const inquilino_id = inq.rows[0].id;

    const cont = await client.query(
      `INSERT INTO contratos_arrendamiento
         (inmueble_id, inquilino_id, fecha_inicio, fecha_fin, monto_renta_mensual, dia_corte_pago,
          url_contrato_pdf, url_pagare_pdf, url_id_inquilino, url_deposito,
          comision_oficina_pct, num_local, notas,
          monto_deposito, deposito_items, incluye_servicios)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,false) RETURNING *`,
      [
        inmueble_id, inquilino_id, fecha_inicio, fecha_fin,
        monto_renta_mensual, dia_corte_pago,
        url_contrato_pdf || null, url_pagare_pdf || null, url_id_inquilino || null, url_deposito || null,
        comision_oficina_pct || null, num_local || null, notas || null,
        monto_deposito || null,
        deposito_items ? JSON.stringify(deposito_items) : null,
      ]
    );

    await client.query(
      `UPDATE inmuebles SET estatus='rentado', fecha_actualizacion=NOW() WHERE id=$1`,
      [inmueble_id]
    );

    await client.query('COMMIT');
    res.status(201).json({ inquilino: inq.rows[0], contrato: cont.rows[0] });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ mensaje: 'Error al crear inquilino y contrato.' });
  } finally {
    client.release();
  }
};

// ================================================================
// INQUILINOS
// ================================================================
export const listarInquilinos = async (_req: Request, res: Response): Promise<void> => {
  try {
    const r = await pool.query(`
      SELECT
        iq.*,
        ca.id                  AS contrato_id,
        ca.monto_renta_mensual,
        ca.url_contrato_pdf,
        ca.url_pagare_pdf,
        ca.url_id_inquilino,
        ca.comision_oficina_pct,
        i.ubicacion_direccion  AS inmueble_direccion,
        i.ciudad               AS inmueble_ciudad,
        i.es_renta_externa,
        i.total_locales,
        CASE
          WHEN EXISTS (
            SELECT 1 FROM cuentas_por_cobrar cpc WHERE cpc.contrato_id = ca.id
          )
          THEN COALESCE((
            SELECT SUM(cpc.monto)
            FROM cuentas_por_cobrar cpc
            WHERE cpc.contrato_id = ca.id
              AND cpc.estatus IN ('pendiente','vencido')
          ), 0)
          ELSE ca.monto_renta_mensual
        END AS saldo_pendiente
      FROM inquilinos iq
      LEFT JOIN contratos_arrendamiento ca
        ON ca.inquilino_id = iq.id AND ca.estatus = 'activo'
      LEFT JOIN inmuebles i ON i.id = ca.inmueble_id
      ORDER BY iq.apellidos ASC, iq.nombres ASC
    `);
    res.json(r.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al listar inquilinos.' });
  }
};

export const obtenerInquilino = async (req: Request, res: Response): Promise<void> => {
  try {
    const r = await pool.query('SELECT * FROM inquilinos WHERE id = $1', [req.params.id]);
    if ((r.rowCount ?? 0) === 0) { res.status(404).json({ mensaje: 'Inquilino no encontrado.' }); return; }
    res.json(r.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al obtener inquilino.' });
  }
};

export const crearInquilino = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombres, apellidos, telefono, aval_nombre, aval_propiedad_garantia } = req.body;
    if (!nombres?.trim() || !apellidos?.trim()) {
      res.status(400).json({ mensaje: 'nombres y apellidos son obligatorios.' }); return;
    }
    const r = await pool.query(
      `INSERT INTO inquilinos (nombres, apellidos, telefono, aval_nombre, aval_propiedad_garantia)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [nombres.trim(), apellidos.trim(), telefono || null, aval_nombre || null, aval_propiedad_garantia || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al crear inquilino.' });
  }
};

export const editarInquilino = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { nombres, apellidos, telefono, aval_nombre, aval_propiedad_garantia, url_doc_aval } = req.body;
    const r = await pool.query(
      `UPDATE inquilinos SET
         nombres                 = COALESCE($1, nombres),
         apellidos               = COALESCE($2, apellidos),
         telefono                = COALESCE($3, telefono),
         aval_nombre             = COALESCE($4, aval_nombre),
         aval_propiedad_garantia = COALESCE($5, aval_propiedad_garantia),
         url_doc_aval            = COALESCE($6, url_doc_aval),
         fecha_actualizacion     = NOW()
       WHERE id = $7 RETURNING *`,
      [nombres || null, apellidos || null, telefono || null, aval_nombre || null, aval_propiedad_garantia || null, url_doc_aval || null, id]
    );
    if ((r.rowCount ?? 0) === 0) { res.status(404).json({ mensaje: 'Inquilino no encontrado.' }); return; }
    res.json(r.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al editar inquilino.' });
  }
};

// ================================================================
// CONTRATOS
// ================================================================
export const listarContratos = async (_req: Request, res: Response): Promise<void> => {
  try {
    const r = await pool.query(`
      SELECT ca.*,
             i.ubicacion_direccion, i.ciudad,
             CONCAT(iq.nombres,' ',iq.apellidos) AS inquilino_nombre,
             (ca.fecha_fin - CURRENT_DATE)::INTEGER AS dias_para_vencer
      FROM contratos_arrendamiento ca
      JOIN inmuebles  i  ON i.id  = ca.inmueble_id
      JOIN inquilinos iq ON iq.id = ca.inquilino_id
      ORDER BY ca.estatus ASC, ca.fecha_fin ASC
    `);
    res.json(r.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al listar contratos.' });
  }
};

export const obtenerContrato = async (req: Request, res: Response): Promise<void> => {
  try {
    const r = await pool.query(`
      SELECT ca.*,
             i.ubicacion_direccion, i.ciudad,
             CONCAT(iq.nombres,' ',iq.apellidos) AS inquilino_nombre
      FROM contratos_arrendamiento ca
      JOIN inmuebles  i  ON i.id  = ca.inmueble_id
      JOIN inquilinos iq ON iq.id = ca.inquilino_id
      WHERE ca.id = $1
    `, [req.params.id]);
    if ((r.rowCount ?? 0) === 0) { res.status(404).json({ mensaje: 'Contrato no encontrado.' }); return; }
    res.json(r.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al obtener contrato.' });
  }
};

export const crearContrato = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const {
      inmueble_id, inquilino_id, fecha_inicio, fecha_fin,
      monto_renta_mensual, dia_corte_pago,
      url_contrato_pdf, url_pagare_pdf, url_llaves_entrega, url_inventario_pdf, url_id_inquilino,
      incluye_servicios = false, detalles_servicios, notas, comision_oficina_pct, num_local,
    } = req.body;

    if (!inmueble_id || !inquilino_id || !fecha_inicio || !fecha_fin || !monto_renta_mensual || !dia_corte_pago) {
      res.status(400).json({ mensaje: 'inmueble_id, inquilino_id, fechas, monto_renta_mensual y dia_corte_pago son obligatorios.' });
      return;
    }

    await client.query('BEGIN');

    if (num_local) {
      const ocupado = await client.query(
        `SELECT 1 FROM contratos_arrendamiento
         WHERE inmueble_id = $1 AND num_local = $2 AND estatus = 'activo'`,
        [inmueble_id, num_local]
      );
      if ((ocupado.rowCount ?? 0) > 0) {
        await client.query('ROLLBACK');
        res.status(400).json({ mensaje: `Local ${num_local} ya tiene un contrato activo.` }); return;
      }
    }

    const r = await client.query(
      `INSERT INTO contratos_arrendamiento
         (inmueble_id, inquilino_id, fecha_inicio, fecha_fin, monto_renta_mensual, dia_corte_pago,
          url_contrato_pdf, url_pagare_pdf, url_llaves_entrega, url_inventario_pdf, url_id_inquilino,
          incluye_servicios, detalles_servicios, notas, comision_oficina_pct, num_local)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [
        inmueble_id, inquilino_id, fecha_inicio, fecha_fin,
        monto_renta_mensual, dia_corte_pago,
        url_contrato_pdf || null, url_pagare_pdf || null, url_llaves_entrega || null,
        url_inventario_pdf || null, url_id_inquilino || null,
        incluye_servicios,
        detalles_servicios ? JSON.stringify(detalles_servicios) : null,
        notas || null,
        comision_oficina_pct || null,
        num_local || null,
      ]
    );

    await client.query(
      `UPDATE inmuebles SET estatus = 'rentado', fecha_actualizacion = NOW() WHERE id = $1`,
      [inmueble_id]
    );

    await client.query('COMMIT');
    res.status(201).json(r.rows[0]);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ mensaje: 'Error al crear contrato.' });
  } finally {
    client.release();
  }
};

export const editarContrato = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      fecha_fin, monto_renta_mensual, dia_corte_pago,
      url_contrato_pdf, url_pagare_pdf, url_llaves_entrega, url_inventario_pdf, url_id_inquilino,
      incluye_servicios, detalles_servicios, estatus, notas, comision_oficina_pct, num_local,
    } = req.body;

    const r = await pool.query(
      `UPDATE contratos_arrendamiento SET
         fecha_fin            = COALESCE($1,  fecha_fin),
         monto_renta_mensual  = COALESCE($2,  monto_renta_mensual),
         dia_corte_pago       = COALESCE($3,  dia_corte_pago),
         url_contrato_pdf     = COALESCE($4,  url_contrato_pdf),
         url_pagare_pdf       = COALESCE($5,  url_pagare_pdf),
         url_llaves_entrega   = COALESCE($6,  url_llaves_entrega),
         url_inventario_pdf   = COALESCE($7,  url_inventario_pdf),
         url_id_inquilino     = COALESCE($8,  url_id_inquilino),
         incluye_servicios    = COALESCE($9,  incluye_servicios),
         detalles_servicios   = COALESCE($10, detalles_servicios),
         estatus              = COALESCE($11, estatus),
         notas                = COALESCE($12, notas),
         comision_oficina_pct = COALESCE($13, comision_oficina_pct),
         num_local            = COALESCE($14, num_local),
         fecha_actualizacion  = NOW()
       WHERE id = $15 RETURNING *`,
      [
        fecha_fin || null, monto_renta_mensual || null, dia_corte_pago || null,
        url_contrato_pdf || null, url_pagare_pdf || null, url_llaves_entrega || null,
        url_inventario_pdf || null, url_id_inquilino || null,
        incluye_servicios !== undefined ? incluye_servicios : null,
        detalles_servicios ? JSON.stringify(detalles_servicios) : null,
        estatus || null, notas || null,
        comision_oficina_pct || null,
        num_local || null,
        id,
      ]
    );
    if ((r.rowCount ?? 0) === 0) { res.status(404).json({ mensaje: 'Contrato no encontrado.' }); return; }
    res.json(r.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al editar contrato.' });
  }
};

// ================================================================
// CUENTAS POR COBRAR (COBROS DE RENTA)
// ================================================================
export const listarCobros = async (req: Request, res: Response): Promise<void> => {
  try {
    const { inmueble_id, mes, anio } = req.query;
    const conds: string[] = [];
    const vals: (string | number)[] = [];
    let i = 1;
    if (inmueble_id) { conds.push(`cpc.inmueble_id = $${i++}`);  vals.push(inmueble_id as string); }
    if (mes)         { conds.push(`cpc.periodo_mes = $${i++}`);  vals.push(Number(mes)); }
    if (anio)        { conds.push(`cpc.periodo_anio = $${i++}`); vals.push(Number(anio)); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    const r = await pool.query(
      `SELECT cpc.*, i.ubicacion_direccion
       FROM cuentas_por_cobrar cpc
       LEFT JOIN inmuebles i ON i.id = cpc.inmueble_id
       ${where}
       ORDER BY cpc.fecha_limite_cobro DESC`,
      vals
    );
    res.json(r.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al listar cobros.' });
  }
};

export const marcarCobrado = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { forma_cobro, notas } = req.body;

    await client.query('BEGIN');

    const r = await client.query(
      `UPDATE cuentas_por_cobrar SET
         estatus             = 'cobrado',
         fecha_cobro_real    = CURRENT_DATE,
         forma_cobro         = COALESCE($1, forma_cobro),
         notas               = COALESCE($2, notas),
         fecha_actualizacion = NOW()
       WHERE id = $3 AND estatus = 'pendiente' RETURNING *`,
      [forma_cobro || null, notas || null, id]
    );
    if ((r.rowCount ?? 0) === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ mensaje: 'Cobro no encontrado o ya cobrado.' }); return;
    }

    const cobro = r.rows[0];

    if (cobro.inmueble_id && cobro.contrato_id) {
      const inm = await client.query(
        `SELECT i.es_renta_externa, i.propietario_nombre, ca.comision_oficina_pct
         FROM inmuebles i
         JOIN contratos_arrendamiento ca ON ca.id = $2
         WHERE i.id = $1`,
        [cobro.inmueble_id, cobro.contrato_id]
      );
      const row = inm.rows[0];

      if (row?.es_renta_externa && row.comision_oficina_pct !== null) {
        const montoRenta       = parseFloat(cobro.monto);
        const comisionPct      = parseFloat(row.comision_oficina_pct);
        const montoPropietaria = montoRenta * (1 - comisionPct / 100);

        const cat = await client.query(
          `SELECT id FROM categorias_egresos WHERE nombre = 'Renta Externa' LIMIT 1`
        );
        if ((cat.rowCount ?? 0) > 0) {
          const nombre = row.propietario_nombre ?? 'Propietaria';
          await client.query(
            `INSERT INTO cuentas_por_pagar
               (inmueble_id, categoria_id, concepto, monto_total, fecha_limite_pago, notas, estatus)
             VALUES ($1,$2,$3,$4,CURRENT_DATE,$5,'pendiente')`,
            [
              cobro.inmueble_id,
              cat.rows[0].id,
              `Pago propietaria — ${nombre}`,
              montoPropietaria.toFixed(2),
              `Comisión oficina ${comisionPct}%. Renta: $${montoRenta.toFixed(2)}. Pago: $${montoPropietaria.toFixed(2)}. Origen: ${cobro.concepto}.`,
            ]
          );
        }
      }
    }

    await client.query('COMMIT');
    res.json(cobro);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ mensaje: 'Error al marcar cobro.' });
  } finally {
    client.release();
  }
};

// ================================================================
// LÓGICA ERP — GENERADORES
// ================================================================

// POST /inmuebles/generar-rentas
export const generarRentas = async (req: Request, res: Response): Promise<void> => {
  try {
    const mes  = parseInt(req.body.mes);
    const anio = parseInt(req.body.anio);
    if (!mes || !anio || mes < 1 || mes > 12) {
      res.status(400).json({ mensaje: 'mes (1-12) y anio son obligatorios.' }); return;
    }

    const contratos = await pool.query(`
      SELECT ca.id, ca.inmueble_id, ca.monto_renta_mensual, ca.dia_corte_pago,
             i.ubicacion_direccion
      FROM contratos_arrendamiento ca
      JOIN inmuebles i ON i.id = ca.inmueble_id
      WHERE ca.estatus = 'activo'
    `);

    let creados = 0;
    for (const c of contratos.rows) {
      const existe = await pool.query(
        `SELECT 1 FROM cuentas_por_cobrar WHERE contrato_id = $1 AND periodo_mes = $2 AND periodo_anio = $3`,
        [c.id, mes, anio]
      );
      if ((existe.rowCount ?? 0) > 0) continue;

      const diasEnMes = new Date(anio, mes, 0).getDate();
      const dia = Math.min(c.dia_corte_pago, diasEnMes);
      const fechaLimite = `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

      await pool.query(
        `INSERT INTO cuentas_por_cobrar
           (inmueble_id, contrato_id, concepto, monto, periodo_mes, periodo_anio, fecha_limite_cobro)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          c.inmueble_id, c.id,
          `Renta ${mes}/${anio} — ${c.ubicacion_direccion}`,
          c.monto_renta_mensual, mes, anio, fechaLimite,
        ]
      );
      creados++;
    }

    res.json({ mensaje: `${creados} cobro(s) de renta generados.`, creados, mes, anio });
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al generar rentas.' });
  }
};

// POST /inmuebles/generar-servicios
export const generarServicios = async (req: Request, res: Response): Promise<void> => {
  try {
    const mes  = parseInt(req.body.mes);
    const anio = parseInt(req.body.anio);
    if (!mes || !anio || mes < 1 || mes > 12) {
      res.status(400).json({ mensaje: 'mes (1-12) y anio son obligatorios.' }); return;
    }

    const catRes = await pool.query(
      `SELECT id FROM categorias_egresos WHERE nombre = 'Servicios' LIMIT 1`
    );
    if ((catRes.rowCount ?? 0) === 0) {
      res.status(400).json({ mensaje: 'Categoría "Servicios" no encontrada en catálogo de egresos.' }); return;
    }
    const categoriaId = catRes.rows[0].id;

    const contratos = await pool.query(`
      SELECT ca.inmueble_id, ca.detalles_servicios, i.ubicacion_direccion
      FROM contratos_arrendamiento ca
      JOIN inmuebles i ON i.id = ca.inmueble_id
      WHERE ca.estatus = 'activo'
        AND ca.incluye_servicios = TRUE
        AND ca.detalles_servicios IS NOT NULL
        AND jsonb_array_length(ca.detalles_servicios) > 0
    `);

    let creados = 0;
    const mesStr   = String(mes).padStart(2, '0');
    const inicioMes = `${anio}-${mesStr}-01`;

    for (const c of contratos.rows) {
      const servicios = c.detalles_servicios as {
        tipo: string; cuenta: string | null; dia_pago: number; frecuencia: string;
      }[];

      for (const s of servicios) {
        if (s.frecuencia === 'bimestral' && mes % 2 === 0) continue;

        const concepto = `${s.tipo} — ${c.ubicacion_direccion}`;
        const diasEnMes = new Date(anio, mes, 0).getDate();
        const dia = Math.min(s.dia_pago || 15, diasEnMes);
        const fechaLimite = `${anio}-${mesStr}-${String(dia).padStart(2, '0')}`;

        const existe = await pool.query(
          `SELECT 1 FROM cuentas_por_pagar
           WHERE inmueble_id = $1 AND concepto = $2
             AND fecha_limite_pago >= $3::date
             AND fecha_limite_pago <  $3::date + INTERVAL '1 month'`,
          [c.inmueble_id, concepto, inicioMes]
        );
        if ((existe.rowCount ?? 0) > 0) continue;

        await pool.query(
          `INSERT INTO cuentas_por_pagar
             (inmueble_id, categoria_id, concepto, monto_total, fecha_limite_pago, notas, estatus)
           VALUES ($1,$2,$3,1.00,$4,$5,'borrador')`,
          [
            c.inmueble_id, categoriaId, concepto, fechaLimite,
            `Auto-generado. Cuenta/Medidor: ${s.cuenta ?? 'N/A'}. Actualizar monto al recibir el recibo.`,
          ]
        );
        creados++;
      }
    }

    res.json({ mensaje: `${creados} borrador(es) de servicios generados.`, creados, mes, anio });
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al generar servicios.' });
  }
};

// GET /inmuebles/:id/roi
export const obtenerROI = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const [inm, fin] = await Promise.all([
      pool.query('SELECT * FROM inmuebles WHERE id = $1', [id]),
      pool.query(`
        WITH cobros AS (
          SELECT COALESCE(SUM(monto), 0)::NUMERIC AS total
          FROM cuentas_por_cobrar
          WHERE inmueble_id = $1 AND estatus = 'cobrado'
        ),
        pagos AS (
          SELECT COALESCE(SUM(monto_total), 0)::NUMERIC AS total
          FROM cuentas_por_pagar
          WHERE inmueble_id = $1 AND estatus = 'pagado'
        ),
        cobros_mes AS (
          SELECT TO_CHAR(fecha_cobro_real, 'YYYY-MM') AS periodo, SUM(monto)::NUMERIC AS monto
          FROM cuentas_por_cobrar
          WHERE inmueble_id = $1 AND estatus = 'cobrado' AND fecha_cobro_real IS NOT NULL
          GROUP BY periodo ORDER BY periodo
        ),
        pagos_mes AS (
          SELECT TO_CHAR(fecha_pago_real, 'YYYY-MM') AS periodo, SUM(monto_total)::NUMERIC AS monto
          FROM cuentas_por_pagar
          WHERE inmueble_id = $1 AND estatus = 'pagado' AND fecha_pago_real IS NOT NULL
          GROUP BY periodo ORDER BY periodo
        )
        SELECT
          cobros.total AS total_cobrado,
          pagos.total  AS total_pagado,
          (cobros.total - pagos.total) AS utilidad,
          COALESCE((SELECT json_agg(row_to_json(c)) FROM cobros_mes c), '[]'::json) AS cobros_por_mes,
          COALESCE((SELECT json_agg(row_to_json(p)) FROM pagos_mes  p), '[]'::json) AS pagos_por_mes
        FROM cobros, pagos
      `, [id]),
    ]);

    if ((inm.rowCount ?? 0) === 0) { res.status(404).json({ mensaje: 'Inmueble no encontrado.' }); return; }

    res.json({
      inmueble:      inm.rows[0],
      total_cobrado: parseFloat(fin.rows[0].total_cobrado),
      total_pagado:  parseFloat(fin.rows[0].total_pagado),
      utilidad:      parseFloat(fin.rows[0].utilidad),
      cobros_por_mes: fin.rows[0].cobros_por_mes,
      pagos_por_mes:  fin.rows[0].pagos_por_mes,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al calcular ROI.' });
  }
};

// GET /inmuebles/alertas — Contratos a ≤60 días de vencer
export const alertasContratos = async (_req: Request, res: Response): Promise<void> => {
  try {
    const r = await pool.query(`
      SELECT ca.*,
             i.ubicacion_direccion, i.ciudad,
             CONCAT(iq.nombres,' ',iq.apellidos) AS inquilino_nombre,
             (ca.fecha_fin - CURRENT_DATE)::INTEGER AS dias_para_vencer
      FROM contratos_arrendamiento ca
      JOIN inmuebles  i  ON i.id  = ca.inmueble_id
      JOIN inquilinos iq ON iq.id = ca.inquilino_id
      WHERE ca.estatus = 'activo'
        AND ca.fecha_fin <= CURRENT_DATE + INTERVAL '60 days'
      ORDER BY ca.fecha_fin ASC
    `);
    res.json({ contratos: r.rows, total: r.rowCount ?? 0 });
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al obtener alertas de contratos.' });
  }
};
