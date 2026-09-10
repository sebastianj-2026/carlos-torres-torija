import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import pool from '../config/database';
import { sumaMontos, comparaMontos } from '../lib/dinero';

// ================================================================
// UTILIDAD DE FECHAS — Regla de ajuste por mes
// ================================================================

// Days in each month (1-indexed). February is always 28 per business rule.
const DIAS_MES = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const NOMBRE_MES = [
  '', 'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

/**
 * Calculates due date applying the business date rule:
 *  - February is capped at 28 (leap years ignored per business decision).
 *  - 30-day months cap at 30 when dia_pacto === 31.
 */
const calcularFechaVencimiento = (diaPacto: number, mes: number, anio: number): string => {
  const limite = DIAS_MES[mes];
  const dia    = Math.min(diaPacto, limite);
  return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
};

// ================================================================
// CATEGORÍAS DE EGRESOS
// ================================================================

const MODULOS_VALIDOS_CAT = ['Oficina', 'Abril'] as const;

export const listarCategorias = async (req: Request, res: Response): Promise<void> => {
  try {
    const modulo = (req.query.modulo as string) || '';
    const filtrarPorModulo = MODULOS_VALIDOS_CAT.includes(modulo as any);

    const r = await pool.query(
      filtrarPorModulo
        ? `SELECT * FROM categorias_egresos WHERE activo = true AND modulo = $1 ORDER BY nombre ASC`
        : `SELECT * FROM categorias_egresos WHERE activo = true ORDER BY nombre ASC`,
      filtrarPorModulo ? [modulo] : []
    );
    res.json(r.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al obtener categorías.' });
  }
};

export const crearCategoria = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, tipo_frecuencia = 'variable', color, modulo = 'Oficina' } = req.body;
    if (!nombre?.trim()) {
      res.status(400).json({ mensaje: 'El nombre es obligatorio.' });
      return;
    }
    if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) {
      res.status(400).json({ mensaje: 'El color debe ser un hex válido (#rrggbb).' });
      return;
    }
    const moduloFinal = MODULOS_VALIDOS_CAT.includes(modulo as any) ? modulo : 'Oficina';
    const r = await pool.query(
      `INSERT INTO categorias_egresos (nombre, tipo_frecuencia, color, modulo)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (nombre, modulo) DO UPDATE SET activo = true, color = EXCLUDED.color
       RETURNING *`,
      [nombre.trim(), tipo_frecuencia, color ?? '#94a3b8', moduloFinal]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al crear categoría.' });
  }
};

// ================================================================
// PROVEEDORES / BENEFICIARIOS
// ================================================================

export const listarProveedores = async (_req: Request, res: Response): Promise<void> => {
  try {
    const r = await pool.query(
      `SELECT * FROM proveedores_beneficiarios WHERE activo = true ORDER BY nombre_razon_social ASC`
    );
    res.json(r.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al obtener proveedores.' });
  }
};

export const crearProveedor = async (req: Request, res: Response): Promise<void> => {
  try {
    const registrado_por = req.usuario?.userId;
    const { nombre_razon_social, rfc, banco, clabe, moneda_defecto = 'MXN' } = req.body;
    if (!nombre_razon_social?.trim()) {
      res.status(400).json({ mensaje: 'El nombre/razón social es obligatorio.' });
      return;
    }
    const r = await pool.query(
      `INSERT INTO proveedores_beneficiarios
         (nombre_razon_social, rfc, banco, clabe, moneda_defecto, registrado_por)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [nombre_razon_social.trim(), rfc || null, banco || null, clabe || null, moneda_defecto, registrado_por || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al crear proveedor.' });
  }
};

export const editarProveedor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { nombre_razon_social, rfc, banco, clabe, moneda_defecto } = req.body;
    const r = await pool.query(
      `UPDATE proveedores_beneficiarios SET
         nombre_razon_social = COALESCE($1, nombre_razon_social),
         rfc                 = COALESCE($2, rfc),
         banco               = COALESCE($3, banco),
         clabe               = COALESCE($4, clabe),
         moneda_defecto      = COALESCE($5, moneda_defecto),
         fecha_actualizacion = NOW()
       WHERE id = $6 RETURNING *`,
      [nombre_razon_social || null, rfc || null, banco || null, clabe || null, moneda_defecto || null, id]
    );
    if (r.rowCount === 0) { res.status(404).json({ mensaje: 'Proveedor no encontrado.' }); return; }
    res.json(r.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al editar proveedor.' });
  }
};

export const eliminarProveedor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await pool.query(
      `UPDATE proveedores_beneficiarios SET activo = false, fecha_actualizacion = NOW() WHERE id = $1`,
      [id]
    );
    res.json({ mensaje: 'Proveedor desactivado.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al eliminar proveedor.' });
  }
};

// ================================================================
// CUENTAS POR PAGAR
// ================================================================

export const listarCuentasPorPagar = async (req: Request, res: Response): Promise<void> => {
  try {
    const hoy          = new Date();
    const estatus      = (req.query.estatus      as string) || '';
    const categoria    = (req.query.categoria    as string) || '';
    const centro_costo = (req.query.centro_costo as string) || '';
    const mes          = parseInt(req.query.mes  as string, 10) || (hoy.getMonth() + 1);
    const anio         = parseInt(req.query.anio as string, 10) || hoy.getFullYear();
    const desde        = (req.query.desde        as string) || '';
    const hasta        = (req.query.hasta        as string) || '';
    const pagina       = Math.max(1, parseInt(req.query.pagina as string) || 1);
    const limite       = Math.min(100, parseInt(req.query.limite as string) || 20);
    const offset       = (pagina - 1) * limite;

    const CENTROS_VALIDOS = ['Oficina', 'Abril', 'Inversionistas', 'Bancos'];

    const conds: string[] = [];
    const vals: (string | number)[] = [];
    let i = 1;

    if (estatus)                               { conds.push(`cpp.estatus = $${i++}`);                             vals.push(estatus); }
    if (categoria)                             { conds.push(`cpp.categoria_id = $${i++}`);                        vals.push(categoria); }
    if (centro_costo && CENTROS_VALIDOS.includes(centro_costo)) {
                                                 conds.push(`cpp.centro_costo = $${i++}`);                        vals.push(centro_costo); }
    conds.push(`EXTRACT(MONTH FROM cpp.fecha_limite_pago) = $${i++}`); vals.push(mes);
    conds.push(`EXTRACT(YEAR  FROM cpp.fecha_limite_pago) = $${i++}`); vals.push(anio);
    if (desde)                                 { conds.push(`cpp.fecha_limite_pago >= $${i++}`);                  vals.push(desde); }
    if (hasta)                                 { conds.push(`cpp.fecha_limite_pago <= $${i++}`);                  vals.push(hasta); }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    const total = parseInt(
      (await pool.query(`SELECT COUNT(*) FROM cuentas_por_pagar cpp ${where}`, vals)).rows[0].count, 10
    );

    const r = await pool.query(
      `SELECT
         cpp.*,
         p.nombre_razon_social  AS proveedor_nombre,
         c.nombre               AS categoria_nombre,
         c.color                AS categoria_color,
         c.es_fijo              AS categoria_es_fijo
       FROM cuentas_por_pagar cpp
       LEFT JOIN proveedores_beneficiarios p ON p.id = cpp.proveedor_id
       LEFT JOIN categorias_egresos c        ON c.id = cpp.categoria_id
       ${where}
       ORDER BY cpp.fecha_limite_pago ASC
       LIMIT $${i} OFFSET $${i + 1}`,
      [...vals, limite, offset]
    );

    res.json({ cuentas: r.rows, total, pagina, limite, totalPaginas: Math.ceil(total / limite), mes, anio });
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al obtener cuentas por pagar.' });
  }
};

export const obtenerCuentaPorPagar = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const r = await pool.query(
      `SELECT cpp.*,
         p.nombre_razon_social AS proveedor_nombre,
         c.nombre              AS categoria_nombre
       FROM cuentas_por_pagar cpp
       LEFT JOIN proveedores_beneficiarios p ON p.id = cpp.proveedor_id
       LEFT JOIN categorias_egresos c        ON c.id = cpp.categoria_id
       WHERE cpp.id = $1`,
      [id]
    );
    if (r.rowCount === 0) { res.status(404).json({ mensaje: 'Cuenta no encontrada.' }); return; }
    res.json(r.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al obtener cuenta.' });
  }
};

// Derive centro_costo when not explicitly provided:
// 1. deuda_id presente        → 'Bancos'
// 2. concepto/categoría Abril → 'Abril'
// 3. categoría Rendimientos   → 'Inversionistas'
// 4. default                  → 'Oficina'
const inferirCentroCosto = (
  body: Record<string, unknown>,
  categoriaNombre: string,
): string => {
  const CENTROS_VALIDOS = ['Oficina', 'Abril', 'Inversionistas', 'Bancos'];
  if (body.centro_costo && CENTROS_VALIDOS.includes(body.centro_costo as string)) {
    return body.centro_costo as string;
  }
  if (body.deuda_id) return 'Bancos';
  const lower = (categoriaNombre + ' ' + String(body.concepto ?? '')).toLowerCase();
  if (lower.includes('abril'))                             return 'Abril';
  if (lower.includes('rendimiento') || lower.includes('inversionista')) return 'Inversionistas';
  return 'Oficina';
};

export const crearCuentaPorPagar = async (req: Request, res: Response): Promise<void> => {
  try {
    const registrado_por = req.usuario?.userId;
    const {
      proveedor_id, categoria_id, deuda_id, concepto,
      monto_total, moneda = 'MXN', tipo_cambio = 1,
      monto_capital = 0, monto_interes = 0, monto_iva = 0,
      fecha_limite_pago, notas, metodo_pago,
    } = req.body;

    if (!categoria_id || !concepto?.trim() || !monto_total || !fecha_limite_pago) {
      res.status(400).json({ mensaje: 'categoria_id, concepto, monto_total y fecha_limite_pago son obligatorios.' });
      return;
    }

    const METODOS_VALIDOS = ['efectivo', 'transferencia', 'tarjeta'];
    if (!metodo_pago || !METODOS_VALIDOS.includes(metodo_pago)) {
      res.status(400).json({ mensaje: 'metodo_pago es obligatorio (efectivo / transferencia / tarjeta).' });
      return;
    }

    if (deuda_id) {
      // Exact cents (deuda 5): the old float check tolerated ±$0.01 drift
      const suma = sumaMontos([
        Number(monto_capital).toFixed(2),
        Number(monto_interes).toFixed(2),
        Number(monto_iva).toFixed(2),
      ]);
      if (comparaMontos(suma, Number(monto_total).toFixed(2)) !== 0) {
        res.status(400).json({ mensaje: 'El desglose capital+interés+IVA debe ser igual a monto_total.' });
        return;
      }
    }

    // Resolve categoria nombre for centro_costo inference
    const catRes = await pool.query(
      `SELECT nombre FROM categorias_egresos WHERE id = $1`, [categoria_id]
    );
    const categoriaNombre = catRes.rows[0]?.nombre ?? '';
    const centro_costo = inferirCentroCosto(req.body, categoriaNombre);

    const r = await pool.query(
      `INSERT INTO cuentas_por_pagar
         (proveedor_id, categoria_id, deuda_id, concepto,
          monto_total, moneda, tipo_cambio,
          monto_capital, monto_interes, monto_iva,
          fecha_limite_pago, centro_costo, metodo_pago, notas, registrado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [
        proveedor_id || null, categoria_id, deuda_id || null, concepto.trim(),
        monto_total, moneda, tipo_cambio,
        monto_capital, monto_interes, monto_iva,
        fecha_limite_pago, centro_costo, metodo_pago, notas || null, registrado_por || null,
      ]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al crear cuenta por pagar.' });
  }
};

export const editarCuentaPorPagar = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      concepto, monto_total, tipo_cambio,
      monto_capital, monto_interes, monto_iva,
      fecha_limite_pago, url_factura_pdf, url_factura_xml, notas,
    } = req.body;

    const r = await pool.query(
      `UPDATE cuentas_por_pagar SET
         concepto            = COALESCE($1,  concepto),
         monto_total         = COALESCE($2,  monto_total),
         tipo_cambio         = COALESCE($3,  tipo_cambio),
         monto_capital       = COALESCE($4,  monto_capital),
         monto_interes       = COALESCE($5,  monto_interes),
         monto_iva           = COALESCE($6,  monto_iva),
         fecha_limite_pago   = COALESCE($7,  fecha_limite_pago),
         url_factura_pdf     = COALESCE($8,  url_factura_pdf),
         url_factura_xml     = COALESCE($9,  url_factura_xml),
         notas               = COALESCE($10, notas),
         fecha_actualizacion = NOW()
       WHERE id = $11 AND estatus NOT IN ('pagado') RETURNING *`,
      [concepto || null, monto_total || null, tipo_cambio || null,
       monto_capital || null, monto_interes || null, monto_iva || null,
       fecha_limite_pago || null, url_factura_pdf || null, url_factura_xml || null,
       notas || null, id]
    );
    if (r.rowCount === 0) { res.status(404).json({ mensaje: 'Cuenta no encontrada o ya pagada.' }); return; }
    res.json(r.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al editar cuenta.' });
  }
};

// ----------------------------------------------------------------
// Cambiar estatus + amortización automática si hay deuda_id
// PATCH /egresos/cuentas/:id/estatus
// ----------------------------------------------------------------
export const cambiarEstatusCuenta = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const aprobado_por = req.usuario?.userId;
    const { estatus, url_comprobante_pago } = req.body as {
      estatus: string;
      url_comprobante_pago?: string;
    };

    const VALIDOS = ['borrador', 'por_aprobar', 'programado', 'pagado', 'vencido'];
    if (!VALIDOS.includes(estatus)) {
      res.status(400).json({ mensaje: 'Estatus no válido.', validos: VALIDOS });
      return;
    }

    await client.query('BEGIN');

    const cuentaRes = await client.query(
      `SELECT id, monto_capital, estatus FROM cuentas_por_pagar WHERE id = $1 FOR UPDATE`,
      [id]
    );
    if (cuentaRes.rowCount === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ mensaje: 'Cuenta no encontrada.' });
      return;
    }

    const cuenta = cuentaRes.rows[0];

    if (cuenta.estatus === 'pagado') {
      await client.query('ROLLBACK');
      res.status(400).json({ mensaje: 'La cuenta ya está pagada.' });
      return;
    }

    // Actualizar cuenta
    const r = await client.query(
      `UPDATE cuentas_por_pagar SET
         estatus              = $1,
         aprobado_por         = CASE WHEN $1 = 'pagado' THEN $2 ELSE aprobado_por END,
         fecha_pago_real      = CASE WHEN $1 = 'pagado' THEN CURRENT_DATE ELSE fecha_pago_real END,
         url_comprobante_pago = COALESCE($3, url_comprobante_pago),
         fecha_actualizacion  = NOW()
       WHERE id = $4 RETURNING *`,
      [estatus, aprobado_por || null, url_comprobante_pago || null, id]
    );

    await client.query('COMMIT');
    res.json({ mensaje: 'Estatus actualizado.', cuenta: r.rows[0] });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ mensaje: 'Error al cambiar estatus.' });
  } finally {
    client.release();
  }
};

// ================================================================
// STATS / ANALÍTICA
// GET /egresos/stats?centro_costo=Oficina|Abril
// ================================================================
export const obtenerStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const hoy          = new Date();
    const centro_costo = (req.query.centro_costo as string) || '';
    const mes          = parseInt(req.query.mes  as string, 10) || (hoy.getMonth() + 1);
    const anio         = parseInt(req.query.anio as string, 10) || hoy.getFullYear();
    const CENTROS_VALIDOS = ['Oficina', 'Abril', 'Inversionistas', 'Bancos'];
    const mesSafe  = Number.isFinite(mes)  && mes  >= 1 && mes  <= 12   ? mes  : (hoy.getMonth() + 1);
    const anioSafe = Number.isFinite(anio) && anio >= 1900 && anio <= 9999 ? anio : hoy.getFullYear();

    // Build parameterized filters for categoria/proveedor queries (uses cpp.* aliased)
    const paramsCpp: any[] = [mesSafe, anioSafe];
    let cFilterCpp = '';
    if (centro_costo && CENTROS_VALIDOS.includes(centro_costo)) {
      paramsCpp.push(centro_costo);
      cFilterCpp = `AND cpp.centro_costo = $${paramsCpp.length}`;
    }
    const mFilterCpp = `AND EXTRACT(MONTH FROM cpp.fecha_limite_pago) = $1
                        AND EXTRACT(YEAR  FROM cpp.fecha_limite_pago) = $2`;

    // Build parameterized filter for the mensual query (no cpp. alias)
    const paramsMensual: any[] = [];
    let cFilterMensual = '';
    if (centro_costo && CENTROS_VALIDOS.includes(centro_costo)) {
      paramsMensual.push(centro_costo);
      cFilterMensual = `AND centro_costo = $${paramsMensual.length}`;
    }

    const [porCategoria, porProveedor, proximos30, totalMes] = await Promise.all([
      pool.query(`
        SELECT c.nombre AS categoria, c.color, COALESCE(SUM(cpp.monto_total), 0) AS total
        FROM cuentas_por_pagar cpp
        JOIN categorias_egresos c ON c.id = cpp.categoria_id
        WHERE cpp.estatus = 'pagado' ${cFilterCpp} ${mFilterCpp}
        GROUP BY c.nombre, c.color ORDER BY SUM(cpp.monto_total) DESC
      `, paramsCpp),
      pool.query(`
        SELECT COALESCE(p.nombre_razon_social, 'Sin proveedor') AS proveedor,
               COALESCE(SUM(cpp.monto_total), 0) AS total
        FROM cuentas_por_pagar cpp
        LEFT JOIN proveedores_beneficiarios p ON p.id = cpp.proveedor_id
        WHERE cpp.estatus = 'pagado' ${cFilterCpp} ${mFilterCpp}
        GROUP BY proveedor ORDER BY total DESC LIMIT 10
      `, paramsCpp),
      pool.query(`
        SELECT COALESCE(SUM(monto_total), 0) AS total, COUNT(*) AS cantidad
        FROM cuentas_por_pagar
        WHERE estatus IN ('borrador','por_aprobar','programado')
          AND fecha_limite_pago BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
      `),
      pool.query(`
        SELECT TO_CHAR(fecha_pago_real, 'YYYY-MM') AS mes,
               COALESCE(SUM(monto_total), 0) AS total
        FROM cuentas_por_pagar
        WHERE estatus = 'pagado'
          AND fecha_pago_real >= NOW() - INTERVAL '6 months'
          ${cFilterMensual}
        GROUP BY mes ORDER BY mes ASC
      `, paramsMensual),
    ]);

    res.json({
      gasto_por_categoria:    porCategoria.rows,
      gasto_por_proveedor:    porProveedor.rows,
      compromisos_proximos30: proximos30.rows[0],
      gasto_mensual:          totalMes.rows,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al obtener estadísticas.' });
  }
};

// ================================================================
// ALERTAS
// GET /egresos/alertas
// ================================================================
export const obtenerAlertas = async (_req: Request, res: Response): Promise<void> => {
  try {
    const r = await pool.query(`
      SELECT
        cpp.*,
        p.nombre_razon_social AS proveedor_nombre,
        c.nombre              AS categoria_nombre,
        (cpp.fecha_limite_pago - CURRENT_DATE) AS dias_restantes
      FROM cuentas_por_pagar cpp
      LEFT JOIN proveedores_beneficiarios p ON p.id = cpp.proveedor_id
      LEFT JOIN categorias_egresos c        ON c.id = cpp.categoria_id
      WHERE cpp.estatus IN ('borrador','por_aprobar','programado','vencido')
        AND cpp.fecha_limite_pago <= CURRENT_DATE + INTERVAL '5 days'
      ORDER BY cpp.fecha_limite_pago ASC
    `);

    const vencidas   = r.rows.filter((x: any) => x.dias_restantes < 0);
    const hoy        = r.rows.filter((x: any) => x.dias_restantes === 0);
    const maniana    = r.rows.filter((x: any) => x.dias_restantes === 1);
    const proximas   = r.rows.filter((x: any) => x.dias_restantes > 1);

    res.json({ vencidas, hoy, maniana, proximas, total: r.rowCount });
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al obtener alertas.' });
  }
};

// ================================================================
// GENERACIÓN MASIVA DE RENDIMIENTOS A INVERSIONISTAS
// POST /egresos/generar-rendimientos  { mes, anio }
// ================================================================
export const generarRendimientosInversionistas = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const mes  = parseInt(req.body.mes,  10);
    const anio = parseInt(req.body.anio, 10);
    const registrado_por = req.usuario?.userId ?? null;

    if (!mes || !anio || mes < 1 || mes > 12 || anio < 2000) {
      res.status(400).json({ mensaje: 'mes (1-12) y anio (≥2000) son obligatorios.' });
      return;
    }

    // Resolve "Rendimientos" category — must exist (seeded in migration_egresos_deuda.sql)
    const catRes = await client.query(
      `SELECT id FROM categorias_egresos WHERE nombre = 'Rendimientos' AND activo = true LIMIT 1`
    );
    if ((catRes.rowCount ?? 0) === 0) {
      res.status(400).json({ mensaje: "Categoría 'Rendimientos' no encontrada. Ejecuta la migración migration_centros_costo.sql." });
      return;
    }
    const categoriaId = catRes.rows[0].id;

    // Fetch all active investments with investor data
    const inversionesRes = await client.query(
      `SELECT
         inv.id           AS inversion_id,
         inv.monto_actual,
         inv.tasa_interes_mensual,
         COALESCE(inv.dia_pago, 30) AS dia_pago,
         i.nombres,
         i.apellido_paterno
       FROM inversiones inv
       JOIN inversionistas i ON i.id = inv.inversionista_id
       WHERE inv.estatus = 'activo'
         AND inv.monto_actual > 0`
    );

    if ((inversionesRes.rowCount ?? 0) === 0) {
      res.json({ mensaje: 'No hay inversiones activas.', generados: 0, omitidos: 0 });
      return;
    }

    await client.query('BEGIN');

    let generados = 0;
    let omitidos  = 0;

    for (const inv of inversionesRes.rows) {
      const diaPago      = parseInt(inv.dia_pago, 10);
      const fechaVenc    = calcularFechaVencimiento(diaPago, mes, anio);
      const rendimiento  = parseFloat(
        (parseFloat(inv.monto_actual) * parseFloat(inv.tasa_interes_mensual) / 100).toFixed(2)
      );
      // Skip investments that produce $0 (tasa = 0 or monto = 0)
      if (rendimiento <= 0) { omitidos++; continue; }

      const nombreInv = `${inv.nombres} ${inv.apellido_paterno}`;
      const concepto  = `Rendimiento ${NOMBRE_MES[mes]} ${anio} — ${nombreInv}`;

      // Guard: skip if a record with the same concepto + period already exists
      const dup = await client.query(
        `SELECT id FROM cuentas_por_pagar
         WHERE concepto = $1
           AND centro_costo = 'Inversionistas'
           AND EXTRACT(MONTH FROM fecha_limite_pago) = $2
           AND EXTRACT(YEAR  FROM fecha_limite_pago) = $3
         LIMIT 1`,
        [concepto, mes, anio]
      );

      if ((dup.rowCount ?? 0) > 0) {
        omitidos++;
        continue;
      }

      await client.query(
        `INSERT INTO cuentas_por_pagar
           (categoria_id, concepto, monto_total, fecha_limite_pago,
            centro_costo, notas, registrado_por)
         VALUES ($1, $2, $3, $4, 'Inversionistas', $5, $6)`,
        [
          categoriaId, concepto, rendimiento.toFixed(2), fechaVenc,
          `Inversión ID: ${inv.inversion_id}`,
          registrado_por,
        ]
      );
      generados++;
    }

    await client.query('COMMIT');
    res.json({
      mensaje:    `Rendimientos ${NOMBRE_MES[mes]} ${anio} procesados.`,
      generados,
      omitidos,
      periodo:    { mes, anio },
    });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ mensaje: 'Error al generar rendimientos.' });
  } finally {
    client.release();
  }
};

// ================================================================
// KPIs — reutilizable por centro_costo
// ================================================================
const obtenerKpisCentroCosto = async (
  centro: string,
  mes: number,
  anio: number,
): Promise<{
  total_gastado: number;
  total_movimientos: number;
  gasto_promedio: number;
  top_gastos: unknown[];
  desglose_metodos: unknown[];
}> => {
  const [resumen, topGastos] = await Promise.all([
    pool.query(
      `SELECT
         COALESCE(SUM(monto_total), 0) AS total_gastado,
         COUNT(*)::int                 AS total_movimientos,
         COALESCE(AVG(monto_total), 0) AS gasto_promedio
       FROM cuentas_por_pagar
       WHERE centro_costo = $3
         AND estatus = 'pagado'
         AND EXTRACT(MONTH FROM fecha_limite_pago) = $1
         AND EXTRACT(YEAR  FROM fecha_limite_pago) = $2`,
      [mes, anio, centro]
    ),
    pool.query(
      `SELECT cpp.concepto, cpp.monto_total, c.nombre AS categoria_nombre
       FROM cuentas_por_pagar cpp
       LEFT JOIN categorias_egresos c ON c.id = cpp.categoria_id
       WHERE cpp.centro_costo = $3
         AND cpp.estatus = 'pagado'
         AND EXTRACT(MONTH FROM cpp.fecha_limite_pago) = $1
         AND EXTRACT(YEAR  FROM cpp.fecha_limite_pago) = $2
       ORDER BY cpp.monto_total DESC
       LIMIT 3`,
      [mes, anio, centro]
    ),
  ]);

  const r = resumen.rows[0];
  return {
    total_gastado:     parseFloat(r.total_gastado),
    total_movimientos: r.total_movimientos,
    gasto_promedio:    parseFloat(r.gasto_promedio),
    top_gastos:        topGastos.rows,
    desglose_metodos:  [],
  };
};

// ================================================================
// KPIs GASTOS OFICINA
// GET /egresos/oficina/kpis?mes=&anio=
// ================================================================
export const obtenerKpisOficina = async (req: Request, res: Response): Promise<void> => {
  try {
    const hoy  = new Date();
    const mes  = parseInt(req.query.mes  as string) || (hoy.getMonth() + 1);
    const anio = parseInt(req.query.anio as string) || hoy.getFullYear();
    const data = await obtenerKpisCentroCosto('Oficina', mes, anio);
    res.json({ mes, anio, ...data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al obtener KPIs de Oficina.' });
  }
};

// ================================================================
// CREAR SERIE DE CUOTAS
// POST /egresos/cuentas/serie
// ================================================================
export const crearSerie = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const registrado_por = req.usuario?.userId;
    const {
      categoria_id, proveedor_id, concepto,
      monto_por_cuota, total_cuotas, fecha_inicio,
      frecuencia_dias = 30, centro_costo, notas,
    } = req.body;

    if (!categoria_id || !concepto?.trim() || !monto_por_cuota || !total_cuotas || !fecha_inicio || !centro_costo) {
      res.status(400).json({ mensaje: 'categoria_id, concepto, monto_por_cuota, total_cuotas, fecha_inicio y centro_costo son obligatorios.' });
      return;
    }
    const cuotas = parseInt(total_cuotas, 10);
    if (isNaN(cuotas) || cuotas < 2 || cuotas > 120) {
      res.status(400).json({ mensaje: 'total_cuotas debe ser entre 2 y 120.' });
      return;
    }
    const CENTROS_VALIDOS = ['Oficina', 'Abril'];
    if (!CENTROS_VALIDOS.includes(centro_costo)) {
      res.status(400).json({ mensaje: 'centro_costo debe ser Oficina o Abril.' });
      return;
    }

    const serie_id = randomUUID();
    const freqDias = parseInt(frecuencia_dias, 10) || 30;

    await client.query('BEGIN');

    const baseDate = new Date(fecha_inicio + 'T12:00:00');
    for (let i = 0; i < cuotas; i++) {
      const fechaCuota = new Date(baseDate);
      fechaCuota.setDate(fechaCuota.getDate() + i * freqDias);
      const fechaStr = fechaCuota.toISOString().split('T')[0];

      await client.query(
        `INSERT INTO cuentas_por_pagar
           (serie_id, num_cuota, total_cuotas, categoria_id, proveedor_id,
            concepto, monto_total, fecha_limite_pago, centro_costo, notas, registrado_por)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          serie_id, i + 1, cuotas, categoria_id,
          proveedor_id || null,
          concepto.trim(), parseFloat(monto_por_cuota), fechaStr,
          centro_costo, notas || null, registrado_por || null,
        ]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ serie_id, creadas: cuotas });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ mensaje: 'Error al crear serie.' });
  } finally {
    client.release();
  }
};
