import { Request, Response } from 'express';
import pool from '../config/database';
import { restaPiso0 } from '../lib/dinero';

const HORAS_SEMANA = 48;
const MULTIPLICADOR: Record<string, number> = { Normal: 1, Doble: 2, Triple: 3 };

// ================================================================
// GET  /nominas/empleados
// ================================================================
export const listarEmpleados = async (_req: Request, res: Response): Promise<void> => {
  try {
    const r = await pool.query(`
      SELECT e.*,
             CONCAT(c.nombres, ' ', c.apellido_paterno) AS cliente_nombre,
             p.folio          AS prestamo_folio,
             p.saldo_pendiente AS prestamo_saldo
      FROM empleados e
      LEFT JOIN clientes c ON c.id = e.cliente_id
      LEFT JOIN LATERAL (
        SELECT folio, saldo_pendiente FROM prestamos
        WHERE cliente_id = e.cliente_id
          AND estatus IN ('activo', 'atrasado')
        ORDER BY fecha_inicio DESC LIMIT 1
      ) p ON TRUE
      ORDER BY e.nombre ASC
    `);
    res.json(r.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al listar empleados.' });
  }
};

// ================================================================
// POST /nominas/empleados
// ================================================================
export const crearEmpleado = async (req: Request, res: Response): Promise<void> => {
  try {
    const registrado_por = req.usuario?.userId;
    const {
      nombre, puesto, sueldo_semanal,
      estatus, dias_vacaciones_totales,
      cliente_id, fecha_ingreso, notas,
    } = req.body;

    if (!nombre?.trim() || !puesto?.trim() || !sueldo_semanal) {
      res.status(400).json({ mensaje: 'nombre, puesto y sueldo_semanal son obligatorios.' }); return;
    }

    const r = await pool.query(`
      INSERT INTO empleados
        (nombre, puesto, sueldo_semanal, estatus, dias_vacaciones_totales,
         cliente_id, fecha_ingreso, notas, registrado_por)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
    `, [
      nombre.trim(), puesto.trim(), sueldo_semanal,
      estatus || 'Activo', dias_vacaciones_totales ?? 6,
      cliente_id || null, fecha_ingreso || null,
      notas?.trim() || null, registrado_por ?? null,
    ]);
    res.status(201).json(r.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al crear empleado.' });
  }
};

// ================================================================
// PUT /nominas/empleados/:id
// ================================================================
export const editarEmpleado = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      nombre, puesto, sueldo_semanal,
      estatus, dias_vacaciones_totales, dias_vacaciones_tomados,
      cliente_id, fecha_ingreso, notas,
      activo_imss, monto_imss,
    } = req.body;

    const r = await pool.query(`
      UPDATE empleados SET
        nombre                  = COALESCE($1,  nombre),
        puesto                  = COALESCE($2,  puesto),
        sueldo_semanal          = COALESCE($3,  sueldo_semanal),
        estatus                 = COALESCE($4,  estatus),
        dias_vacaciones_totales = COALESCE($5,  dias_vacaciones_totales),
        dias_vacaciones_tomados = COALESCE($6,  dias_vacaciones_tomados),
        cliente_id              = COALESCE($7,  cliente_id),
        fecha_ingreso           = COALESCE($8,  fecha_ingreso),
        notas                   = COALESCE($9,  notas),
        activo_imss             = COALESCE($10, activo_imss),
        monto_imss              = COALESCE($11, monto_imss),
        fecha_actualizacion     = NOW()
      WHERE id = $12
      RETURNING *
    `, [
      nombre?.trim()   || null,
      puesto?.trim()   || null,
      sueldo_semanal   ?? null,
      estatus          || null,
      dias_vacaciones_totales ?? null,
      dias_vacaciones_tomados ?? null,
      cliente_id       || null,
      fecha_ingreso    || null,
      notas?.trim()    || null,
      activo_imss !== undefined ? activo_imss : null,
      monto_imss  !== undefined ? monto_imss  : null,
      id,
    ]);

    if ((r.rowCount ?? 0) === 0) { res.status(404).json({ mensaje: 'Empleado no encontrado.' }); return; }
    res.json(r.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al editar empleado.' });
  }
};

// ================================================================
// GET /nominas/pre-calculo?empleado_id=X&dias_vacaciones=N
// ================================================================
export const preCalculo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { empleado_id, dias_vacaciones } = req.query;
    if (!empleado_id) { res.status(400).json({ mensaje: 'empleado_id es requerido.' }); return; }

    const empRes = await pool.query(`
      SELECT e.*,
             CONCAT(c.nombres, ' ', c.apellido_paterno) AS cliente_nombre
      FROM empleados e
      LEFT JOIN clientes c ON c.id = e.cliente_id
      WHERE e.id = $1
    `, [empleado_id]);

    if ((empRes.rowCount ?? 0) === 0) { res.status(404).json({ mensaje: 'Empleado no encontrado.' }); return; }

    const emp   = empRes.rows[0];
    const sueldo = parseFloat(emp.sueldo_semanal);
    const dias   = parseInt(dias_vacaciones as string) || 0;

    let prima_vacacional = 0;
    if (emp.estatus === 'Vacaciones' && dias > 0) {
      prima_vacacional = parseFloat(((sueldo / 6) * dias * 0.25).toFixed(2));
    }

    const dias_disponibles = Math.max(0, emp.dias_vacaciones_totales - emp.dias_vacaciones_tomados);
    const tarifa_hora = parseFloat((sueldo / HORAS_SEMANA).toFixed(4));
    const tarifas_extra = {
      Normal: parseFloat((tarifa_hora * MULTIPLICADOR.Normal).toFixed(2)),
      Doble:  parseFloat((tarifa_hora * MULTIPLICADOR.Doble ).toFixed(2)),
      Triple: parseFloat((tarifa_hora * MULTIPLICADOR.Triple).toFixed(2)),
    };

    let prestamo_activo = null;
    if (emp.cliente_id) {
      const pRes = await pool.query(`
        SELECT id, folio, saldo_pendiente, tasa_interes_mensual,
               ROUND(saldo_pendiente * tasa_interes_mensual / 100, 2) AS interes_mensual
        FROM prestamos
        WHERE cliente_id = $1 AND estatus IN ('activo', 'atrasado')
        ORDER BY fecha_inicio DESC LIMIT 1
      `, [emp.cliente_id]);
      if ((pRes.rowCount ?? 0) > 0) prestamo_activo = pRes.rows[0];
    }

    res.json({
      empleado: {
        id: emp.id, nombre: emp.nombre, puesto: emp.puesto,
        sueldo_semanal: sueldo, estatus: emp.estatus,
        dias_vacaciones_totales: emp.dias_vacaciones_totales,
        dias_vacaciones_tomados: emp.dias_vacaciones_tomados,
        dias_disponibles,
        cliente_id: emp.cliente_id, cliente_nombre: emp.cliente_nombre,
        activo_imss: emp.activo_imss, monto_imss: parseFloat(emp.monto_imss),
      },
      calculo: { sueldo_base: sueldo, prima_vacacional, dias_vacaciones: dias, tarifas_hora_extra: tarifas_extra },
      prestamo_activo,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error en pre-cálculo de nómina.' });
  }
};

// ================================================================
// POST /nominas/pagar
// El frontend puede enviar montos ya calculados (override) o dejar
// que el backend los calcule desde las cantidades.
// ================================================================
export const pagarNomina = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const registrado_por = req.usuario?.userId;
    const {
      empleado_id, semana_inicio, semana_fin,
      horas_extras_cantidad, tipo_hora_extra,
      dias_vacaciones_periodo,
      bonos, faltas_cantidad,
      ajuste_monto, ajuste_concepto,
      descuento_prestamo,
      forma_pago, notas,
    } = req.body;

    if (!empleado_id || !semana_inicio || !semana_fin) {
      res.status(400).json({ mensaje: 'empleado_id, semana_inicio y semana_fin son obligatorios.' }); return;
    }

    const empRes = await client.query(`SELECT * FROM empleados WHERE id = $1 FOR UPDATE`, [empleado_id]);
    if ((empRes.rowCount ?? 0) === 0) { res.status(404).json({ mensaje: 'Empleado no encontrado.' }); return; }
    const emp    = empRes.rows[0];
    const sueldo = parseFloat(emp.sueldo_semanal);

    // ── Horas extras (acepta override de monto desde el cliente) ──
    const horas = parseFloat(horas_extras_cantidad) || 0;
    const tipo  = tipo_hora_extra || null;
    let monto_horas_extras: number;
    if (req.body.monto_horas_extras !== undefined && req.body.monto_horas_extras !== null) {
      monto_horas_extras = parseFloat(req.body.monto_horas_extras) || 0;
    } else if (horas > 0 && tipo && MULTIPLICADOR[tipo] !== undefined) {
      monto_horas_extras = parseFloat(((sueldo / HORAS_SEMANA) * horas * MULTIPLICADOR[tipo]).toFixed(2));
    } else {
      monto_horas_extras = 0;
    }

    // ── Prima vacacional (acepta override) ────────────────────────
    const dias_vac = parseInt(dias_vacaciones_periodo) || 0;
    let monto_prima: number;
    if (req.body.monto_prima_vacacional !== undefined && req.body.monto_prima_vacacional !== null) {
      monto_prima = parseFloat(req.body.monto_prima_vacacional) || 0;
    } else if (emp.estatus === 'Vacaciones' && dias_vac > 0) {
      monto_prima = parseFloat(((sueldo / 6) * dias_vac * 0.25).toFixed(2));
    } else {
      monto_prima = 0;
    }

    // ── Bonos ─────────────────────────────────────────────────────
    const monto_bonos = parseFloat(bonos) || 0;

    // ── Faltas (acepta override de monto) ─────────────────────────
    const faltas = parseFloat(faltas_cantidad) || 0;
    let monto_faltas: number;
    if (req.body.monto_faltas !== undefined && req.body.monto_faltas !== null) {
      monto_faltas = parseFloat(req.body.monto_faltas) || 0;
    } else {
      monto_faltas = faltas > 0 ? parseFloat(((sueldo / 6) * faltas).toFixed(2)) : 0;
    }

    // ── Ajuste libre ──────────────────────────────────────────────
    const ajuste = parseFloat(ajuste_monto) || 0;

    // ── Descuento préstamo ────────────────────────────────────────
    const descuento = parseFloat(descuento_prestamo) || 0;

    // ── Total neto ────────────────────────────────────────────────
    const total = parseFloat(
      Math.max(0, sueldo + monto_horas_extras + monto_prima + monto_bonos + ajuste - monto_faltas - descuento).toFixed(2)
    );

    await client.query('BEGIN');

    // 1. Insertar nómina
    const nomRes = await client.query(`
      INSERT INTO nominas_pagadas
        (empleado_id, semana_inicio, semana_fin, sueldo_base,
         horas_extras_cantidad, tipo_hora_extra, monto_horas_extras,
         dias_vacaciones_periodo, monto_prima_vacacional,
         bonos, faltas_cantidad, monto_faltas,
         ajuste_monto, ajuste_concepto,
         descuento_prestamo, monto_total_pagado,
         forma_pago, notas, registrado_por, fecha_pago)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,CURRENT_DATE)
      RETURNING *
    `, [
      empleado_id, semana_inicio, semana_fin, sueldo,
      horas, tipo || null, monto_horas_extras,
      dias_vac, monto_prima,
      monto_bonos, faltas, monto_faltas,
      ajuste, ajuste_concepto?.trim() || null,
      descuento, total,
      forma_pago || 'efectivo',
      notas?.trim() || null, registrado_por ?? null,
    ]);

    const nomina = nomRes.rows[0];

    // 2. Acumular días de vacaciones tomados
    if (dias_vac > 0) {
      await client.query(`
        UPDATE empleados SET dias_vacaciones_tomados = dias_vacaciones_tomados + $1, fecha_actualizacion = NOW()
        WHERE id = $2
      `, [dias_vac, empleado_id]);
    }

    // 3. Reducir saldo del préstamo vinculado
    if (descuento > 0 && emp.cliente_id) {
      const pRes = await client.query(`
        SELECT id, saldo_pendiente FROM prestamos
        WHERE cliente_id = $1 AND estatus IN ('activo', 'atrasado')
        ORDER BY fecha_inicio DESC LIMIT 1 FOR UPDATE
      `, [emp.cliente_id]);

      if ((pRes.rowCount ?? 0) > 0) {
        const p = pRes.rows[0];
        const nuevoSaldo = restaPiso0(String(p.saldo_pendiente), descuento.toFixed(2)); // exact cents (deuda 5)
        await client.query(`
          UPDATE prestamos SET saldo_pendiente = $1,
            estatus = CASE WHEN $1 = 0 THEN 'liquidado' ELSE estatus END,
            fecha_actualizacion = NOW()
          WHERE id = $2
        `, [nuevoSaldo, p.id]);
        await client.query(`
          INSERT INTO historial_pagos_prestamo (prestamo_id, tipo_pago, monto, notas, registrado_por)
          VALUES ($1, 'capital', $2, $3, $4)
        `, [p.id, descuento, `Descuento nómina sem. ${semana_inicio}`, registrado_por ?? null]);
      }
    }

    // 4. Salida en caja chica si es efectivo
    if ((forma_pago || 'efectivo') === 'efectivo' && total > 0) {
      await client.query(`
        INSERT INTO movimientos_caja (tipo, concepto, monto, fecha, encargado, registrado_por)
        VALUES ('salida', $1, $2, CURRENT_DATE, $3, $4)
      `, [
        `Nómina — ${emp.nombre} — ${semana_inicio} al ${semana_fin}`,
        total, emp.nombre, registrado_por ?? null,
      ]);
    }

    await client.query('COMMIT');
    res.status(201).json({
      nomina,
      desglose: { sueldo_base: sueldo, monto_horas_extras, monto_prima_vacacional: monto_prima, monto_bonos, monto_faltas, ajuste, descuento_prestamo: descuento, total_pagado: total },
    });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ mensaje: 'Error al procesar nómina.' });
  } finally {
    client.release();
  }
};

// ================================================================
// GET /nominas/historial?empleado_id=X&limite=N
// ================================================================
export const historialNominas = async (req: Request, res: Response): Promise<void> => {
  try {
    const { empleado_id, limite } = req.query;
    const lim = Math.min(200, parseInt(limite as string) || 50);

    const cond  = empleado_id ? `WHERE n.empleado_id = $1` : '';
    const vals  = empleado_id ? [empleado_id, lim] : [lim];
    const param = empleado_id ? '$2' : '$1';

    const r = await pool.query(`
      SELECT n.*, e.nombre AS empleado_nombre, e.puesto
      FROM nominas_pagadas n
      JOIN empleados e ON e.id = n.empleado_id
      ${cond}
      ORDER BY n.semana_inicio DESC, n.fecha_registro DESC
      LIMIT ${param}
    `, vals);
    res.json(r.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al obtener historial de nóminas.' });
  }
};

// ================================================================
// POST /nominas/pagar-base
// Pago rápido: sueldo_semanal del empleado, sin extras ni bonos.
// descuento_prestamo es opcional (default 0).
// ================================================================
export const pagarBase = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const registrado_por = req.usuario?.userId;
    const { empleado_id, semana_inicio, semana_fin, descuento_prestamo, forma_pago, notas } = req.body;

    if (!empleado_id || !semana_inicio || !semana_fin) {
      res.status(400).json({ mensaje: 'empleado_id, semana_inicio y semana_fin son obligatorios.' }); return;
    }

    const empRes = await client.query(`SELECT * FROM empleados WHERE id = $1 FOR UPDATE`, [empleado_id]);
    if ((empRes.rowCount ?? 0) === 0) { res.status(404).json({ mensaje: 'Empleado no encontrado.' }); return; }

    const emp     = empRes.rows[0];
    const sueldo  = parseFloat(emp.sueldo_semanal);
    const descuento = parseFloat(descuento_prestamo) || 0;
    const total   = parseFloat(Math.max(0, sueldo - descuento).toFixed(2));
    const pago    = forma_pago || 'efectivo';

    await client.query('BEGIN');

    const nomRes = await client.query(`
      INSERT INTO nominas_pagadas
        (empleado_id, semana_inicio, semana_fin, sueldo_base,
         horas_extras_cantidad, monto_horas_extras,
         dias_vacaciones_periodo, monto_prima_vacacional,
         bonos, faltas_cantidad, monto_faltas,
         ajuste_monto, descuento_prestamo, monto_total_pagado,
         forma_pago, notas, registrado_por, fecha_pago)
      VALUES ($1,$2,$3,$4, 0,0, 0,0, 0,0,0, 0,$5,$6, $7,$8,$9,CURRENT_DATE)
      RETURNING *
    `, [empleado_id, semana_inicio, semana_fin, sueldo, descuento, total, pago, notas?.trim() || null, registrado_por ?? null]);

    if (descuento > 0 && emp.cliente_id) {
      const pRes = await client.query(`
        SELECT id, saldo_pendiente FROM prestamos
        WHERE cliente_id = $1 AND estatus IN ('activo', 'atrasado')
        ORDER BY fecha_inicio DESC LIMIT 1 FOR UPDATE
      `, [emp.cliente_id]);

      if ((pRes.rowCount ?? 0) > 0) {
        const p = pRes.rows[0];
        const nuevoSaldo = restaPiso0(String(p.saldo_pendiente), descuento.toFixed(2)); // exact cents (deuda 5)
        await client.query(`
          UPDATE prestamos SET saldo_pendiente = $1,
            estatus = CASE WHEN $1 = 0 THEN 'liquidado' ELSE estatus END,
            fecha_actualizacion = NOW()
          WHERE id = $2
        `, [nuevoSaldo, p.id]);
        await client.query(`
          INSERT INTO historial_pagos_prestamo (prestamo_id, tipo_pago, monto, notas, registrado_por)
          VALUES ($1, 'capital', $2, $3, $4)
        `, [p.id, descuento, `Descuento nómina sem. ${semana_inicio}`, registrado_por ?? null]);
      }
    }

    if (pago === 'efectivo' && total > 0) {
      await client.query(`
        INSERT INTO movimientos_caja (tipo, concepto, monto, fecha, encargado, registrado_por)
        VALUES ('salida', $1, $2, CURRENT_DATE, $3, $4)
      `, [`Nómina — ${emp.nombre} — ${semana_inicio} al ${semana_fin}`, total, emp.nombre, registrado_por ?? null]);
    }

    await client.query('COMMIT');
    res.status(201).json({ nomina: nomRes.rows[0], desglose: { sueldo_base: sueldo, descuento_prestamo: descuento, total_pagado: total } });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ mensaje: 'Error al procesar pago base.' });
  } finally {
    client.release();
  }
};

// ================================================================
// GET /nominas/empleado/:id/log
// Últimas 5 semanas con movimientos extra (horas, bonos, faltas, ajuste).
// Semanas normales (solo sueldo base) se omiten.
// ================================================================
export const logIncidencias = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const r = await pool.query(`
      SELECT n.*, e.nombre AS empleado_nombre, e.puesto
      FROM nominas_pagadas n
      JOIN empleados e ON e.id = n.empleado_id
      WHERE n.empleado_id = $1
        AND (
          n.horas_extras_cantidad > 0
          OR n.bonos               > 0
          OR n.faltas_cantidad     > 0
          OR (n.ajuste_concepto IS NOT NULL AND n.ajuste_concepto <> '')
        )
      ORDER BY n.semana_inicio DESC
      LIMIT 5
    `, [id]);
    res.json(r.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al obtener log de incidencias.' });
  }
};

// ================================================================
// GET /nominas/costo-real?mes=M&anio=A
// ================================================================
export const costoReal = async (req: Request, res: Response): Promise<void> => {
  try {
    const mes  = parseInt(req.query.mes  as string) || new Date().getMonth() + 1;
    const anio = parseInt(req.query.anio as string) || new Date().getFullYear();

    const [nomRes, imssRes, semRes] = await Promise.all([
      pool.query(`
        SELECT
          COALESCE(SUM(n.sueldo_base), 0)            AS total_sueldos,
          COALESCE(SUM(n.monto_horas_extras), 0)     AS total_extras,
          COALESCE(SUM(n.bonos), 0)                  AS total_bonos,
          COALESCE(SUM(n.monto_prima_vacacional), 0) AS total_primas,
          COALESCE(SUM(n.monto_faltas), 0)           AS total_faltas,
          COALESCE(SUM(n.monto_total_pagado), 0)     AS total_pagado,
          COUNT(DISTINCT n.id)                        AS registros,
          COUNT(DISTINCT n.empleado_id)               AS empleados_distintos
        FROM nominas_pagadas n
        WHERE EXTRACT(MONTH FROM n.semana_inicio) = $1
          AND EXTRACT(YEAR  FROM n.semana_inicio) = $2
      `, [mes, anio]),

      pool.query(`
        SELECT
          COUNT(*)                             AS empleados_con_imss,
          COALESCE(SUM(monto_imss), 0)         AS total_imss
        FROM empleados
        WHERE activo_imss = true AND estatus != 'Inactivo'
      `),

      pool.query(`
        SELECT
          n.semana_inicio,
          COALESCE(SUM(n.monto_total_pagado), 0) AS total,
          COUNT(DISTINCT n.empleado_id)            AS num_empleados
        FROM nominas_pagadas n
        WHERE EXTRACT(MONTH FROM n.semana_inicio) = $1
          AND EXTRACT(YEAR  FROM n.semana_inicio) = $2
        GROUP BY n.semana_inicio
        ORDER BY n.semana_inicio
      `, [mes, anio]),
    ]);

    const n = nomRes.rows[0];
    const i = imssRes.rows[0];

    const total_pagado = parseFloat(n.total_pagado);
    const total_imss   = parseFloat(i.total_imss);

    res.json({
      periodo: { mes, anio },
      totales: {
        total_sueldos:       parseFloat(n.total_sueldos),
        total_extras:        parseFloat(n.total_extras),
        total_bonos:         parseFloat(n.total_bonos),
        total_primas:        parseFloat(n.total_primas),
        total_faltas:        parseFloat(n.total_faltas),
        total_pagado,
        registros:           parseInt(n.registros),
        empleados_distintos: parseInt(n.empleados_distintos),
      },
      imss: {
        empleados_con_imss: parseInt(i.empleados_con_imss),
        total_imss,
      },
      por_semana: semRes.rows.map(s => ({
        semana_inicio:  s.semana_inicio,
        total:          parseFloat(s.total),
        num_empleados:  parseInt(s.num_empleados),
      })),
      costo_real: parseFloat((total_pagado + total_imss).toFixed(2)),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al calcular costo real.' });
  }
};
