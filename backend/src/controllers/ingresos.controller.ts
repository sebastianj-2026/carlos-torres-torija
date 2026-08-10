import { Request, Response } from 'express';
import pool from '../config/database';

// Fallback for missing ingresos_hub objects (pensiones_estacionamiento,
// ingresos_directos, metricas_cancha, movimientos_extras_pension,
// marcar_pensiones_vencidas). Migration not applied — returns empty result
// instead of crashing the request.
const safeQuery = async (sql: string, params: any[] = []): Promise<{ rows: any[]; rowCount: number }> => {
  try {
    const r = await pool.query(sql, params);
    return { rows: r.rows, rowCount: r.rowCount ?? 0 };
  } catch (e: any) {
    if (e?.code === '42P01' || e?.code === '42883') {
      return { rows: [], rowCount: 0 };
    }
    throw e;
  }
};

// ================================================================
// INGRESOS DIRECTOS
// ================================================================
export const listarIngresosDirectos = async (req: Request, res: Response): Promise<void> => {
  try {
    const { unidad_negocio, desde, hasta } = req.query;
    const conds: string[] = [];
    const vals: (string | number)[] = [];
    let i = 1;

    if (unidad_negocio) { conds.push(`id.unidad_negocio = $${i++}`);    vals.push(unidad_negocio as string); }
    if (desde)          { conds.push(`id.semana_corte >= $${i++}`);     vals.push(desde as string); }
    if (hasta)          { conds.push(`id.semana_corte <= $${i++}`);     vals.push(hasta as string); }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    const r = await safeQuery(
      `SELECT id.*,
              mc.cantidad_rentas
       FROM ingresos_directos id
       LEFT JOIN metricas_cancha mc ON mc.ingreso_directo_id = id.id
       ${where}
       ORDER BY id.semana_corte DESC, id.fecha_registro DESC`,
      vals
    );
    res.json(r.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al listar ingresos directos.' });
  }
};

export const crearIngresoDirecto = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const registrado_por = req.usuario?.userId;
    const {
      unidad_negocio, monto_ingresado, semana_corte,
      metodo_pago, cuenta_destino, persona_nombre,
      notas_explicativas, url_comprobante,
      cantidad_rentas,
    } = req.body;

    if (!unidad_negocio || !monto_ingresado || !semana_corte || !metodo_pago) {
      res.status(400).json({ mensaje: 'unidad_negocio, monto_ingresado, semana_corte y metodo_pago son obligatorios.' });
      return;
    }
    if (!cuenta_destino?.trim()) {
      res.status(400).json({ mensaje: 'cuenta_destino es obligatorio para trazabilidad del dinero.' });
      return;
    }

    await client.query('BEGIN');

    const r = await client.query(
      `INSERT INTO ingresos_directos
         (unidad_negocio, monto_ingresado, semana_corte, metodo_pago,
          cuenta_destino, persona_nombre, notas_explicativas, url_comprobante, registrado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        unidad_negocio, monto_ingresado, semana_corte, metodo_pago,
        cuenta_destino.trim(), persona_nombre || null,
        notas_explicativas || null, url_comprobante || null, registrado_por || null,
      ]
    );

    if (unidad_negocio === 'cancha_futbol' && cantidad_rentas != null) {
      await client.query(
        `INSERT INTO metricas_cancha (ingreso_directo_id, cantidad_rentas) VALUES ($1,$2)`,
        [r.rows[0].id, parseInt(cantidad_rentas)]
      );
    }

    // Mirror into historial_ingresos: all direct income is 100% utilidad (no capital recovery)
    const ORIGEN_MAP: Record<string, string> = {
      cancha_futbol:            'Cancha',
      estacionamiento_coches:   'Estacionamiento',
      estacionamiento_banos:    'Estacionamiento',
      estacionamiento_tiendita: 'Estacionamiento',
      ingreso_atipico:          'Otros',
    };
    const origenHI = ORIGEN_MAP[unidad_negocio] ?? 'Otros';
    // Derive period from semana_corte ('YYYY-MM-DD') to avoid timezone drift
    const [pAnio, pMes] = (semana_corte as string).split('-').map(Number);
    await client.query(
      `INSERT INTO historial_ingresos
         (origen, referencia_id, monto_total_cobrado, monto_utilidad, monto_capital_recuperado,
          periodo_mes, periodo_anio, notas, registrado_por)
       VALUES ($1,$2,$3,$3,0,$4,$5,$6,$7)`,
      [origenHI, r.rows[0].id, monto_ingresado, pMes, pAnio, notas_explicativas || null, registrado_por || null]
    );

    await client.query('COMMIT');
    res.status(201).json({ ...r.rows[0], cantidad_rentas: cantidad_rentas ?? null });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ mensaje: 'Error al crear ingreso directo.' });
  } finally {
    client.release();
  }
};

export const editarIngresoDirecto = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      monto_ingresado, semana_corte, metodo_pago,
      cuenta_destino, persona_nombre, notas_explicativas, url_comprobante,
    } = req.body;
    const r = await pool.query(
      `UPDATE ingresos_directos SET
         monto_ingresado    = COALESCE($1, monto_ingresado),
         semana_corte       = COALESCE($2, semana_corte),
         metodo_pago        = COALESCE($3, metodo_pago),
         cuenta_destino     = COALESCE($4, cuenta_destino),
         persona_nombre     = COALESCE($5, persona_nombre),
         notas_explicativas = COALESCE($6, notas_explicativas),
         url_comprobante    = COALESCE($7, url_comprobante),
         fecha_actualizacion = NOW()
       WHERE id = $8 RETURNING *`,
      [
        monto_ingresado || null, semana_corte || null, metodo_pago || null,
        cuenta_destino || null, persona_nombre || null,
        notas_explicativas || null, url_comprobante || null, id,
      ]
    );
    if ((r.rowCount ?? 0) === 0) { res.status(404).json({ mensaje: 'Ingreso no encontrado.' }); return; }
    res.json(r.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al editar ingreso.' });
  }
};

// ================================================================
// STATS — Resumen por semana y por unidad
// GET /ingresos/stats?semanas=6
// ================================================================
export const statsIngresos = async (req: Request, res: Response): Promise<void> => {
  try {
    const semanas = parseInt(req.query.semanas as string) || 6;

    const [porSemana, porUnidad, porMetodo] = await Promise.all([
      safeQuery(`
        SELECT DATE_TRUNC('week', semana_corte)::DATE AS semana,
               unidad_negocio,
               SUM(monto_ingresado)::NUMERIC AS total,
               COUNT(*)::INTEGER AS registros
        FROM ingresos_directos
        WHERE semana_corte >= CURRENT_DATE - ($1 * INTERVAL '1 week')
        GROUP BY semana, unidad_negocio
        ORDER BY semana DESC, unidad_negocio
      `, [semanas]),

      safeQuery(`
        SELECT unidad_negocio,
               SUM(monto_ingresado)::NUMERIC AS total,
               COUNT(*)::INTEGER AS registros
        FROM ingresos_directos
        WHERE semana_corte >= CURRENT_DATE - ($1 * INTERVAL '1 week')
        GROUP BY unidad_negocio
        ORDER BY total DESC
      `, [semanas]),

      safeQuery(`
        SELECT metodo_pago,
               SUM(monto_ingresado)::NUMERIC AS total
        FROM ingresos_directos
        WHERE semana_corte >= CURRENT_DATE - ($1 * INTERVAL '1 week')
        GROUP BY metodo_pago
      `, [semanas]),
    ]);

    res.json({
      por_semana:  porSemana.rows,
      por_unidad:  porUnidad.rows,
      por_metodo:  porMetodo.rows,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al obtener stats.' });
  }
};

// ================================================================
// GET /ingresos/dashboard-central?mes=&anio=
// ================================================================
export const dashboardCentral = async (req: Request, res: Response): Promise<void> => {
  try {
    const hoy    = new Date();
    const mes    = parseInt(req.query.mes  as string) || (hoy.getMonth() + 1);
    const anio   = parseInt(req.query.anio as string) || hoy.getFullYear();
    const diaHoy = hoy.getDate();
    const mesPrev  = mes === 1 ? 12 : mes - 1;
    const anioPrev = mes === 1 ? anio - 1 : anio;

    const [
      cobradoRes, cobradoPrevRes,
      prestamosRes, rentasEstadoRes, pensionesEstadoRes,
      logRes, metodoRentasRes, metodoPrestamosRes, mejorDiaRes,
    ] = await Promise.all([

      pool.query(`
        SELECT origen,
          COALESCE(SUM(monto_utilidad), 0)::NUMERIC                           AS utilidad,
          COALESCE(SUM(monto_capital_recuperado), 0)::NUMERIC                  AS capital,
          COALESCE(SUM(monto_utilidad + monto_capital_recuperado), 0)::NUMERIC AS total
        FROM historial_ingresos_central
        WHERE periodo_mes = $1 AND periodo_anio = $2
        GROUP BY origen ORDER BY total DESC
      `, [mes, anio]),

      pool.query(`
        SELECT origen,
          COALESCE(SUM(monto_utilidad + monto_capital_recuperado), 0)::NUMERIC AS total
        FROM historial_ingresos_central
        WHERE periodo_mes = $1 AND periodo_anio = $2
        GROUP BY origen
      `, [mesPrev, anioPrev]),

      pool.query(`
        SELECT p.id,
          ROUND(p.saldo_pendiente * p.tasa_interes_mensual / 100, 2)::NUMERIC AS interes_mensual,
          EXTRACT(DAY FROM p.fecha_inicio)::INTEGER AS dia_pago,
          COALESCE((
            SELECT SUM(hp.monto) FROM historial_pagos_prestamo hp
            WHERE hp.prestamo_id = p.id AND hp.tipo_pago = 'interes'
              AND hp.periodo_mes = $1 AND hp.periodo_anio = $2
          ), 0)::NUMERIC AS ya_cobrado
        FROM prestamos p
        WHERE p.estatus IN ('activo','atrasado')
      `, [mes, anio]),

      // Módulo inmuebles eliminado: rentas siempre en cero (tabla cuentas_por_cobrar dropeada)
      Promise.resolve({ rows: [{}] as any[] }),

      safeQuery(`
        SELECT
          COUNT(*)::INT AS total,
          COUNT(*) FILTER (WHERE estatus = 'activa')::INT  AS activas,
          COUNT(*) FILTER (WHERE estatus = 'vencida')::INT AS vencidas,
          COALESCE(SUM(monto_mensual), 0)::NUMERIC AS monto_total,
          COALESCE(SUM(monto_mensual) FILTER (WHERE estatus = 'activa'),  0)::NUMERIC AS monto_activas,
          COALESCE(SUM(monto_mensual) FILTER (WHERE estatus = 'vencida'), 0)::NUMERIC AS monto_vencidas
        FROM pensiones_estacionamiento
      `),

      safeQuery(`
        SELECT
          hic.id, hic.origen, hic.fecha_cobro,
          (hic.monto_utilidad + hic.monto_capital_recuperado)::NUMERIC AS monto,
          hic.monto_capital_recuperado::NUMERIC AS capital,
          CASE hic.origen
            WHEN 'Prestamo'        THEN CONCAT(cl.nombres, ' ', cl.apellido_paterno)
            ELSE COALESCE(hic.notas, hic.origen)
          END AS descripcion,
          COALESCE(hpr.forma_pago, 'efectivo') AS metodo_pago
        FROM historial_ingresos_central hic
        LEFT JOIN prestamos pl   ON pl.id = hic.referencia_id AND hic.origen = 'Prestamo'
        LEFT JOIN clientes cl    ON cl.id = pl.cliente_id
        LEFT JOIN historial_pagos_prestamo hpr ON hpr.prestamo_id = hic.referencia_id
          AND hpr.periodo_mes = hic.periodo_mes AND hpr.periodo_anio = hic.periodo_anio
          AND hpr.tipo_pago = 'interes' AND hic.origen = 'Prestamo'
        WHERE hic.periodo_mes = $1 AND hic.periodo_anio = $2
        ORDER BY hic.fecha_cobro DESC, hic.fecha_registro DESC
        LIMIT 15
      `, [mes, anio]),

      safeQuery(`
        SELECT COALESCE(pr.metodo_pago,'efectivo') AS metodo,
               COALESCE(pr.cuenta_destino,'')      AS cuenta,
               COALESCE(SUM(hic.monto_utilidad), 0)::NUMERIC AS monto
        FROM historial_ingresos_central hic
        JOIN pagos_rentas pr ON pr.contrato_id = hic.referencia_id
          AND pr.mes_correspondiente  = hic.periodo_mes
          AND pr.anio_correspondiente = hic.periodo_anio
        WHERE hic.origen = 'Inmueble'
          AND hic.periodo_mes = $1 AND hic.periodo_anio = $2
        GROUP BY pr.metodo_pago, pr.cuenta_destino
      `, [mes, anio]),

      pool.query(`
        SELECT COALESCE(forma_pago,'efectivo') AS metodo,
               COALESCE(SUM(monto), 0)::NUMERIC AS monto
        FROM historial_pagos_prestamo
        WHERE tipo_pago = 'interes'
          AND periodo_mes = $1 AND periodo_anio = $2
        GROUP BY forma_pago
      `, [mes, anio]),

      pool.query(`
        SELECT fecha_cobro, origen,
          COALESCE(SUM(monto_utilidad + monto_capital_recuperado), 0)::NUMERIC AS total
        FROM historial_ingresos_central
        WHERE periodo_mes = $1 AND periodo_anio = $2
          AND fecha_cobro IS NOT NULL
        GROUP BY fecha_cobro, origen
      `, [mes, anio]),
    ]);

    // ── Cobrado ─────────────────────────────────────────────────
    const porOrigenCobrado = cobradoRes.rows.map((r: any) => ({
      origen:   r.origen,
      utilidad: parseFloat(r.utilidad),
      capital:  parseFloat(r.capital),
      total:    parseFloat(r.total),
    }));
    const totalCobrado  = porOrigenCobrado.reduce((s, r) => s + r.total,    0);
    const totalUtilidad = porOrigenCobrado.reduce((s, r) => s + r.utilidad, 0);
    const totalCapital  = porOrigenCobrado.reduce((s, r) => s + r.capital,  0);

    // ── Estado préstamos ────────────────────────────────────────
    const prestRows = (prestamosRes.rows as any[]).map(p => {
      const interes   = parseFloat(p.interes_mensual);
      const cobrado   = parseFloat(p.ya_cobrado);
      const pendiente = Math.max(0, interes - cobrado);
      const atrasado  = pendiente > 0 && parseInt(p.dia_pago) <= diaHoy;
      return { interes, cobrado, pendiente, atrasado };
    });
    const estadoPrestamos = {
      count_total:      prestRows.length,
      count_pagados:    prestRows.filter(p => p.pendiente === 0).length,
      count_pendientes: prestRows.filter(p => p.pendiente > 0).length,
      count_atrasados:  prestRows.filter(p => p.atrasado).length,
      monto_esperado:   parseFloat(prestRows.reduce((s, p) => s + p.interes,   0).toFixed(2)),
      monto_cobrado:    parseFloat(prestRows.reduce((s, p) => s + p.cobrado,   0).toFixed(2)),
      monto_pendiente:  parseFloat(prestRows.reduce((s, p) => s + p.pendiente, 0).toFixed(2)),
      monto_atrasado:   parseFloat(prestRows.filter(p => p.atrasado).reduce((s, p) => s + p.pendiente, 0).toFixed(2)),
    };

    // ── Estado rentas ───────────────────────────────────────────
    const rr = rentasEstadoRes.rows[0] ?? {};
    const estadoRentas = {
      count_total:      parseInt(rr.total     ?? 0),
      count_pagados:    parseInt(rr.cobradas  ?? 0),
      count_pendientes: parseInt(rr.pendientes ?? 0),
      count_atrasados:  parseInt(rr.atrasadas ?? 0),
      monto_esperado:   parseFloat(rr.monto_total     ?? 0),
      monto_cobrado:    parseFloat(rr.monto_cobrado   ?? 0),
      monto_pendiente:  parseFloat(rr.monto_pendiente ?? 0),
      monto_atrasado:   parseFloat(rr.monto_atrasado  ?? 0),
    };

    // ── Estado pensiones ────────────────────────────────────────
    const pe = pensionesEstadoRes.rows[0] ?? {};
    const estadoPensiones = {
      count_total:      parseInt(pe.total   ?? 0),
      count_pagados:    parseInt(pe.activas ?? 0),
      count_pendientes: parseInt(pe.vencidas ?? 0),
      count_atrasados:  parseInt(pe.vencidas ?? 0),
      monto_esperado:   parseFloat(pe.monto_total    ?? 0),
      monto_cobrado:    parseFloat(pe.monto_activas  ?? 0),
      monto_pendiente:  parseFloat(pe.monto_vencidas ?? 0),
      monto_atrasado:   parseFloat(pe.monto_vencidas ?? 0),
    };

    const granTotalEsperado  = estadoPrestamos.monto_esperado + estadoRentas.monto_esperado + estadoPensiones.monto_esperado;
    const granTotalCobrado   = estadoPrestamos.monto_cobrado  + estadoRentas.monto_cobrado  + estadoPensiones.monto_cobrado;
    const granTotalPendiente = parseFloat((granTotalEsperado - granTotalCobrado).toFixed(2));
    const granTotalAtrasado  = parseFloat((estadoPrestamos.monto_atrasado + estadoRentas.monto_atrasado + estadoPensiones.monto_atrasado).toFixed(2));

    // ── Método de pago ──────────────────────────────────────────
    const efectivoCanchaEst = porOrigenCobrado
      .filter(r => r.origen === 'Cancha' || r.origen === 'Estacionamiento')
      .reduce((s, r) => s + r.total, 0);

    const rentasPorMetodo: Record<string, number> = {};
    const tarjetaDetalle:  { cuenta: string; monto: number }[] = [];
    for (const r of metodoRentasRes.rows as any[]) {
      const metodo = r.metodo ?? 'efectivo';
      const monto  = parseFloat(r.monto);
      rentasPorMetodo[metodo] = (rentasPorMetodo[metodo] ?? 0) + monto;
      if (metodo === 'tarjeta' && r.cuenta) {
        const ex = tarjetaDetalle.find(d => d.cuenta === r.cuenta);
        if (ex) ex.monto += monto; else tarjetaDetalle.push({ cuenta: r.cuenta, monto });
      }
    }
    const prestamosEfectivo = (metodoPrestamosRes.rows as any[]).reduce((s, r) => s + parseFloat(r.monto), 0);
    const totalEfectivo = efectivoCanchaEst + (rentasPorMetodo['efectivo'] ?? 0) + prestamosEfectivo;
    const totalTarjeta  = rentasPorMetodo['tarjeta'] ?? 0;
    const efectivoDetalle = [
      { origen: 'Cancha + Estacionamiento', monto: parseFloat(efectivoCanchaEst.toFixed(2)) },
      { origen: 'Rentas',                   monto: parseFloat((rentasPorMetodo['efectivo'] ?? 0).toFixed(2)) },
      { origen: 'Préstamos',                monto: parseFloat(prestamosEfectivo.toFixed(2)) },
    ].filter(d => d.monto > 0);

    // ── Vs mes anterior ─────────────────────────────────────────
    const prevPorOrigen: Record<string, number> = {};
    let totalPrev = 0;
    for (const r of cobradoPrevRes.rows as any[]) {
      const t = parseFloat(r.total); prevPorOrigen[r.origen] = t; totalPrev += t;
    }
    const variacionPct = totalPrev > 0
      ? parseFloat(((totalCobrado - totalPrev) / totalPrev * 100).toFixed(1)) : 0;

    // ── Mejor día ───────────────────────────────────────────────
    type DiaEntry = { fecha: string; monto: number };
    const globalDia:   Record<string, number>   = {};
    const porOrigenDia: Record<string, DiaEntry> = {};
    for (const r of mejorDiaRes.rows as any[]) {
      const fecha = r.fecha_cobro instanceof Date
        ? r.fecha_cobro.toISOString().split('T')[0]
        : String(r.fecha_cobro).split('T')[0];
      const monto = parseFloat(r.total);
      globalDia[fecha] = (globalDia[fecha] ?? 0) + monto;
      if (!porOrigenDia[r.origen] || monto > porOrigenDia[r.origen].monto)
        porOrigenDia[r.origen] = { fecha, monto };
    }
    let mejorDiaGlobal: DiaEntry | null = null;
    for (const [fecha, monto] of Object.entries(globalDia))
      if (!mejorDiaGlobal || monto > mejorDiaGlobal.monto) mejorDiaGlobal = { fecha, monto };

    res.json({
      periodo: { mes, anio },
      cobrado: {
        total:           parseFloat(totalCobrado.toFixed(2)),
        utilidad:        parseFloat(totalUtilidad.toFixed(2)),
        retorno_capital: parseFloat(totalCapital.toFixed(2)),
        por_origen:      porOrigenCobrado,
      },
      estado_mes: {
        prestamos:             estadoPrestamos,
        rentas:                estadoRentas,
        pensiones:             estadoPensiones,
        gran_total_esperado:   parseFloat(granTotalEsperado.toFixed(2)),
        gran_total_cobrado:    parseFloat(granTotalCobrado.toFixed(2)),
        gran_total_pendiente:  granTotalPendiente,
        gran_total_atrasado:   granTotalAtrasado,
      },
      log_pagos: (logRes.rows as any[]).map(r => ({
        id:          r.id,
        origen:      r.origen,
        fecha:       r.fecha_cobro instanceof Date ? r.fecha_cobro.toISOString().split('T')[0] : String(r.fecha_cobro ?? '').split('T')[0],
        descripcion: r.descripcion ?? r.origen,
        monto:       parseFloat(r.monto),
        capital:     parseFloat(r.capital),
        metodo_pago: r.metodo_pago ?? 'efectivo',
      })),
      metodo_pago: {
        efectivo: { total: parseFloat(totalEfectivo.toFixed(2)), detalle: efectivoDetalle },
        tarjeta:  { total: parseFloat(totalTarjeta.toFixed(2)),  detalle: tarjetaDetalle.sort((a, b) => b.monto - a.monto) },
      },
      vs_mes_anterior: {
        cobrado_actual:   parseFloat(totalCobrado.toFixed(2)),
        cobrado_anterior: parseFloat(totalPrev.toFixed(2)),
        variacion_pct:    variacionPct,
        por_origen: porOrigenCobrado.map(r => ({
          origen:   r.origen,
          actual:   r.total,
          anterior: prevPorOrigen[r.origen] ?? 0,
          delta:    parseFloat((r.total - (prevPorOrigen[r.origen] ?? 0)).toFixed(2)),
        })),
      },
      mejor_dia: {
        global:     mejorDiaGlobal,
        por_origen: Object.entries(porOrigenDia).map(([origen, d]) => ({ origen, ...d })),
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al obtener dashboard central.' });
  }
};

// ================================================================
// GET /ingresos/cxc-prestamos?mes=4&anio=2026
// Reads the cxc_prestamos VIEW and cross-references historial_pagos_prestamo
// for the requested period. Ordered by dia_pago ASC (día 1–31).
// ================================================================
export const cxcPrestamos = async (req: Request, res: Response): Promise<void> => {
  try {
    const hoy  = new Date();
    const mes  = parseInt(req.query.mes  as string) || (hoy.getMonth() + 1);
    const anio = parseInt(req.query.anio as string) || hoy.getFullYear();

    if (mes < 1 || mes > 12 || anio < 2000) {
      res.status(400).json({ mensaje: 'mes (1-12) y anio (≥2000) son requeridos.' }); return;
    }

    const r = await pool.query(`
      SELECT
        cp.*,
        COALESCE((
          SELECT SUM(hp.monto)
          FROM historial_pagos_prestamo hp
          WHERE hp.prestamo_id  = cp.id
            AND hp.tipo_pago    = 'interes'
            AND hp.periodo_mes  = $1
            AND hp.periodo_anio = $2
        ), 0)::NUMERIC AS ya_cobrado_interes,
        COALESCE((
          SELECT SUM(hp.monto)
          FROM historial_pagos_prestamo hp
          WHERE hp.prestamo_id  = cp.id
            AND hp.tipo_pago    = 'capital'
            AND hp.periodo_mes  = $1
            AND hp.periodo_anio = $2
        ), 0)::NUMERIC AS ya_cobrado_capital
      FROM cxc_prestamos cp
      ORDER BY cp.dia_pago ASC
    `, [mes, anio]);

    const prestamos = r.rows.map((p: any) => {
      const interes = parseFloat(p.monto_interes);
      const yaCobI  = parseFloat(p.ya_cobrado_interes);
      const yaCobK  = parseFloat(p.ya_cobrado_capital);
      return {
        id:                   p.id,
        folio:                p.folio,
        cliente_id:           p.cliente_id,
        cliente_nombre:       p.cliente_nombre,
        monto_capital:        parseFloat(p.monto_capital),
        monto_interes:        interes,
        dia_pago:             p.dia_pago,
        tasa_interes_mensual: parseFloat(p.tasa_interes_mensual),
        estatus:              p.estatus,
        ya_cobrado_interes:   yaCobI,
        ya_cobrado_capital:   yaCobK,
        pendiente_interes:    parseFloat(Math.max(0, interes - yaCobI).toFixed(2)),
        cobrado_completo:     yaCobI >= interes && interes > 0,
      };
    });

    const totales = {
      monto_interes_esperado: parseFloat(prestamos.reduce((s: number, p: any) => s + p.monto_interes,   0).toFixed(2)),
      ya_cobrado:             parseFloat(prestamos.reduce((s: number, p: any) => s + p.ya_cobrado_interes, 0).toFixed(2)),
      pendiente:              parseFloat(prestamos.reduce((s: number, p: any) => s + p.pendiente_interes, 0).toFixed(2)),
      cobrados_completos:     prestamos.filter((p: any) => p.cobrado_completo).length,
      total_prestamos:        prestamos.length,
    };

    res.json({ periodo: { mes, anio }, prestamos, totales });
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al obtener CxC préstamos.' });
  }
};

// ================================================================
// GET /ingresos/cxc-prestamos/proyeccion?mes=4&anio=2026
// Reads master prestamos table (not the VIEW) + LEFT JOIN obligaciones
// to determine Cobrado / Pendiente / Por Generar per period.
// ================================================================
export const proyeccionCxCPrestamos = async (req: Request, res: Response): Promise<void> => {
  try {
    const hoy  = new Date();
    const mes  = parseInt(req.query.mes  as string) || (hoy.getMonth() + 1);
    const anio = parseInt(req.query.anio as string) || hoy.getFullYear();

    if (mes < 1 || mes > 12 || anio < 2000) {
      res.status(400).json({ mensaje: 'mes (1-12) y anio (≥2000) son requeridos.' }); return;
    }

    const r = await pool.query(`
      SELECT
        p.id,
        p.folio,
        p.cliente_id,
        CONCAT(c.nombres, ' ', c.apellido_paterno,
          CASE WHEN c.apellido_materno IS NOT NULL THEN ' ' || c.apellido_materno ELSE '' END
        )                                                                 AS cliente_nombre,
        p.saldo_pendiente                                                 AS capital_prestado,
        p.tasa_interes_mensual,
        ROUND(p.saldo_pendiente * p.tasa_interes_mensual / 100, 2)        AS monto_interes,
        CASE WHEN $1 = 2
          THEN LEAST(EXTRACT(DAY FROM p.fecha_inicio)::INTEGER, 28)
          ELSE EXTRACT(DAY FROM p.fecha_inicio)::INTEGER
        END                                                               AS dia_pago,
        p.estatus,
        COALESCE((
          SELECT SUM(hp.monto) FROM historial_pagos_prestamo hp
          WHERE hp.prestamo_id = p.id AND hp.tipo_pago = 'interes'
            AND hp.periodo_mes = $1 AND hp.periodo_anio = $2
        ), 0)::NUMERIC                                                    AS ya_cobrado_interes,
        (SELECT ocp.id FROM obligaciones_cobro_prestamo ocp
         WHERE ocp.prestamo_id = p.id
           AND ocp.periodo_mes = $1 AND ocp.periodo_anio = $2
         LIMIT 1)                                                          AS obligacion_id
      FROM prestamos p
      JOIN clientes c ON c.id = p.cliente_id
      WHERE p.estatus IN ('activo', 'atrasado')
      ORDER BY
        CASE WHEN $1 = 2
          THEN LEAST(EXTRACT(DAY FROM p.fecha_inicio)::INTEGER, 28)
          ELSE EXTRACT(DAY FROM p.fecha_inicio)::INTEGER
        END ASC
    `, [mes, anio]);

    const prestamos = r.rows.map((p: any) => {
      const monto_interes   = parseFloat(p.monto_interes);
      const ya_cobrado      = parseFloat(p.ya_cobrado_interes);
      const tiene_obligacion = !!p.obligacion_id;

      let estatus_proyeccion: 'Cobrado' | 'Pendiente' | 'Por Generar';
      if (monto_interes > 0 && ya_cobrado >= monto_interes) {
        estatus_proyeccion = 'Cobrado';
      } else if (tiene_obligacion) {
        estatus_proyeccion = 'Pendiente';
      } else {
        estatus_proyeccion = 'Por Generar';
      }

      return {
        id:                   p.id,
        folio:                p.folio,
        cliente_id:           p.cliente_id,
        cliente_nombre:       p.cliente_nombre,
        capital_prestado:     parseFloat(p.capital_prestado),
        tasa_interes_mensual: parseFloat(p.tasa_interes_mensual),
        monto_interes,
        dia_pago:             parseInt(p.dia_pago),
        estatus:              p.estatus,
        ya_cobrado_interes:   ya_cobrado,
        pendiente_interes:    parseFloat(Math.max(0, monto_interes - ya_cobrado).toFixed(2)),
        estatus_proyeccion,
        obligacion_id:        p.obligacion_id ?? null,
      };
    });

    const totales = {
      total_esperado:  parseFloat(prestamos.reduce((s, p) => s + p.monto_interes,     0).toFixed(2)),
      total_cobrado:   parseFloat(prestamos.reduce((s, p) => s + p.ya_cobrado_interes, 0).toFixed(2)),
      total_pendiente: parseFloat(prestamos.reduce((s, p) => s + p.pendiente_interes,  0).toFixed(2)),
      por_generar:     prestamos.filter(p => p.estatus_proyeccion === 'Por Generar').length,
      pendientes:      prestamos.filter(p => p.estatus_proyeccion === 'Pendiente').length,
      cobrados:        prestamos.filter(p => p.estatus_proyeccion === 'Cobrado').length,
      total_prestamos: prestamos.length,
    };

    res.json({ periodo: { mes, anio }, prestamos, totales });
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al calcular proyección CxC préstamos.' });
  }
};

// ================================================================
// POST /ingresos/cxc-prestamos/generar-mes
// Body: { mes, anio }
// Inserts one obligaciones_cobro_prestamo per active prestamo (idempotent).
// ================================================================
export const generarMesCxCPrestamos = async (req: Request, res: Response): Promise<void> => {
  try {
    const registrado_por = req.usuario?.userId;
    const mes  = parseInt(req.body.mes);
    const anio = parseInt(req.body.anio);

    if (!mes || !anio || mes < 1 || mes > 12 || anio < 2000) {
      res.status(400).json({ mensaje: 'mes (1-12) y anio (≥2000) son requeridos.' }); return;
    }

    const prestamosRes = await pool.query(`
      SELECT
        p.id,
        ROUND(p.saldo_pendiente * p.tasa_interes_mensual / 100, 2) AS monto_interes,
        CASE WHEN $1 = 2
          THEN LEAST(EXTRACT(DAY FROM p.fecha_inicio)::INTEGER, 28)
          ELSE EXTRACT(DAY FROM p.fecha_inicio)::INTEGER
        END                                                          AS dia_pago
      FROM prestamos p
      WHERE p.estatus IN ('activo', 'atrasado')
    `, [mes]);

    let creados = 0;
    let omitidos = 0;

    for (const p of prestamosRes.rows) {
      const ins = await pool.query(`
        INSERT INTO obligaciones_cobro_prestamo
          (prestamo_id, periodo_mes, periodo_anio, dia_pago, monto_interes, registrado_por)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (prestamo_id, periodo_mes, periodo_anio) DO NOTHING
        RETURNING id
      `, [p.id, mes, anio, p.dia_pago, p.monto_interes, registrado_por ?? null]);

      if ((ins.rowCount ?? 0) > 0) creados++;
      else omitidos++;
    }

    res.status(201).json({
      mensaje:        `${creados} obligaciones generadas, ${omitidos} ya existían.`,
      creados,
      omitidos,
      total_prestamos: prestamosRes.rowCount ?? 0,
      periodo:        { mes, anio },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al generar obligaciones de cobro.' });
  }
};

