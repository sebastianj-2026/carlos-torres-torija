import { Request, Response } from 'express';
import pool from '../config/database';

// ============================================================================
// Módulo comisiones — T-005: corte del periodo (generación de devengos).
// Ver docs/modulos/comisiones/{MODULO,REGLAS,DATOS}.md.
//
// El corte DEVENGA SIEMPRE (R11): no depende de lo cobrado, solo de las
// aportaciones activas. Genera, por cada aportación activa:
//   - un devengo de 'rendimiento' para el inversionista
//   - un devengo de 'comision' para el referenciador (si existe)
//
// El monto se calcula en SQL NUMERIC (round(base*tasa, 2)) — nunca en JS —
// para no romper la regla dinero-sin-float. La regla de cálculo (base*tasa,
// 2 decimales) es la misma de reparto.ts (R1/R23).
//
// R18: base_capital y tasa quedan CONGELADOS en la fila del devengo.
// R20: idempotencia por el UNIQUE corte_idempotente + ON CONFLICT DO NOTHING —
//      correr el mismo periodo dos veces no duplica (caso 7).
// ============================================================================

const PERIODO_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/; // 'YYYY-MM'

// GET /api/comisiones/cortes/:periodo/preview — qué se generaría, sin insertar.
export const previewCorte = async (req: Request, res: Response): Promise<void> => {
  const rawPeriodo = req.params.periodo;
  const periodo = Array.isArray(rawPeriodo) ? rawPeriodo[0] : rawPeriodo;
  if (!periodo || !PERIODO_REGEX.test(periodo)) {
    res.status(400).json({ mensaje: 'periodo inválido. Formato esperado: YYYY-MM.' });
    return;
  }
  const periodoDate = `${periodo}-01`;
  try {
    const rows = await pool.query(
      `SELECT p.id AS persona_id, p.nombre, p.apellido_paterno, p.apellido_materno,
              'rendimiento' AS concepto, a.id AS origen_id,
              a.monto AS base_capital, a.tasa_inversionista AS tasa,
              round(a.monto * a.tasa_inversionista, 2) AS monto_devengado
         FROM aportaciones a JOIN personas p ON p.id = a.inversionista_id
        WHERE a.estado = 'activa'
          AND NOT EXISTS (SELECT 1 FROM devengos d
                           WHERE d.persona_id=a.inversionista_id AND d.concepto='rendimiento'
                             AND d.origen_tipo='aportacion' AND d.origen_id=a.id AND d.periodo=$1)
       UNION ALL
       SELECT p.id, p.nombre, p.apellido_paterno, p.apellido_materno,
              'comision', a.id, a.monto, a.tasa_referenciador,
              round(a.monto * a.tasa_referenciador, 2)
         FROM aportaciones a JOIN personas p ON p.id = a.referenciador_id
        WHERE a.estado = 'activa' AND a.referenciador_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM devengos d
                           WHERE d.persona_id=a.referenciador_id AND d.concepto='comision'
                             AND d.origen_tipo='aportacion' AND d.origen_id=a.id AND d.periodo=$1)
        ORDER BY concepto, persona_id`,
      [periodoDate]
    );
    const existe = await pool.query('SELECT EXISTS(SELECT 1 FROM devengos WHERE periodo=$1) AS e', [periodoDate]);
    res.json({
      periodo,
      por_generar: rows.rows,
      total: rows.rowCount ?? 0,
      ya_tiene_devengos: existe.rows[0].e,
    });
  } catch (error) {
    console.error('Error en preview de corte:', error);
    res.status(500).json({ mensaje: 'Error interno al previsualizar el corte.' });
  }
};

export const generarCorte = async (req: Request, res: Response): Promise<void> => {
  const rawPeriodo = req.params.periodo;
  const periodo = Array.isArray(rawPeriodo) ? rawPeriodo[0] : rawPeriodo;
  if (!periodo || !PERIODO_REGEX.test(periodo)) {
    res.status(400).json({ mensaje: 'periodo inválido. Formato esperado: YYYY-MM.' });
    return;
  }
  const periodoDate = `${periodo}-01`; // primer día del mes (devengos.periodo es DATE)

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Rendimiento del inversionista.
    const rend = await client.query(
      `INSERT INTO devengos
         (persona_id, concepto, origen_tipo, origen_id, periodo, base_capital, tasa, monto_devengado)
       SELECT a.inversionista_id, 'rendimiento', 'aportacion', a.id, $1::date,
              a.monto, a.tasa_inversionista, round(a.monto * a.tasa_inversionista, 2)
         FROM aportaciones a
        WHERE a.estado = 'activa'
       ON CONFLICT (persona_id, concepto, origen_tipo, origen_id, periodo) DO NOTHING
       RETURNING id`,
      [periodoDate]
    );

    // Comisión del referenciador (solo aportaciones con referidor).
    const comi = await client.query(
      `INSERT INTO devengos
         (persona_id, concepto, origen_tipo, origen_id, periodo, base_capital, tasa, monto_devengado)
       SELECT a.referenciador_id, 'comision', 'aportacion', a.id, $1::date,
              a.monto, a.tasa_referenciador, round(a.monto * a.tasa_referenciador, 2)
         FROM aportaciones a
        WHERE a.estado = 'activa' AND a.referenciador_id IS NOT NULL
       ON CONFLICT (persona_id, concepto, origen_tipo, origen_id, periodo) DO NOTHING
       RETURNING id`,
      [periodoDate]
    );

    await client.query('COMMIT');

    const generadosRend = rend.rowCount ?? 0;
    const generadosComi = comi.rowCount ?? 0;
    res.status(201).json({
      periodo,
      generados_rendimiento: generadosRend,
      generados_comision: generadosComi,
      total_generados: generadosRend + generadosComi,
      // Si ambos son 0, el periodo ya se había corrido (idempotencia R20).
      ya_corrido: generadosRend === 0 && generadosComi === 0,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al generar el corte:', error);
    res.status(500).json({ mensaje: 'Error interno al generar el corte del periodo.' });
  } finally {
    client.release();
  }
};

// ============================================================================
// T-006: registrar un pago y aplicarlo FIFO sobre la línea (persona+concepto+
// origen). R15: FIFO por periodo ascendente. R16: no cruza orígenes (la línea
// ya viene acotada por origen). R17: un pago por concepto. R19: gobernanza.
// R22: no absorbe faltante — solo aplica lo que se paga; el resto sigue devengado.
//
// La asignación FIFO se calcula en SQL NUMERIC (window function), NO en JS:
// aplicado_i = min(pendiente_i, max(0, monto - sum(pendiente antes de i))).
// Es la misma regla de fifo.ts (unit-testeado, casos 4/8), sin dinero-float.
// ============================================================================

const MONEY_REGEX = /^(?:0*[1-9][0-9]*|0*[1-9][0-9]*\.[0-9]{1,2}|0*0?\.(?:0[1-9]|[1-9][0-9]?))$/;
const isNonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const isIntId = (v: unknown): boolean => /^[1-9][0-9]*$/.test(`${v}`);

// ============================================================================
// T-007: lecturas (solo lectura). Sin aritmética de dinero en JS: los montos
// NUMERIC se devuelven como texto tal cual vienen de la DB.
// Nota: "disponible" (efectivo en caja) es tesorería, fuera del slice.
// ============================================================================

// GET /api/comisiones/devengos?persona_id=  — estado de cuenta de una persona.
export const estadoCuenta = async (req: Request, res: Response): Promise<void> => {
  const raw = req.query.persona_id;
  const personaId = typeof raw === 'string' ? raw : '';
  if (!/^[1-9][0-9]*$/.test(personaId)) {
    res.status(400).json({ mensaje: 'persona_id (query) inválido.' });
    return;
  }
  try {
    const saldo = await pool.query(
      `SELECT concepto, devengado, pagado, acumulado
         FROM saldo_por_persona WHERE persona_id = $1 ORDER BY concepto`,
      [personaId]
    );
    const detalle = await pool.query(
      `SELECT id, concepto, origen_tipo, origen_id, periodo,
              base_capital, tasa, monto_devengado, monto_pagado, estado
         FROM devengos WHERE persona_id = $1
        ORDER BY periodo DESC, concepto`,
      [personaId]
    );
    res.json({ persona_id: Number(personaId), saldo: saldo.rows, devengos: detalle.rows });
  } catch (error) {
    console.error('Error al obtener el estado de cuenta:', error);
    res.status(500).json({ mensaje: 'Error interno al obtener el estado de cuenta.' });
  }
};

// GET /api/comisiones/pendientes — líneas con acumulado > 0 (pantalla de Carlos).
export const pendientes = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT d.persona_id, p.nombre, p.apellido_paterno, p.apellido_materno,
              d.concepto, d.origen_tipo, d.origen_id,
              SUM(d.monto_devengado - d.monto_pagado) AS acumulado,
              COUNT(*)  AS meses,
              MIN(d.periodo) AS desde
         FROM devengos d
         JOIN personas p ON p.id = d.persona_id
        WHERE d.estado <> 'pagado'
        GROUP BY d.persona_id, p.nombre, p.apellido_paterno, p.apellido_materno,
                 d.concepto, d.origen_tipo, d.origen_id
       HAVING SUM(d.monto_devengado - d.monto_pagado) > 0
        ORDER BY desde ASC, acumulado DESC`
    );
    res.json({ pendientes: result.rows });
  } catch (error) {
    console.error('Error al obtener pendientes:', error);
    res.status(500).json({ mensaje: 'Error interno al obtener los pendientes.' });
  }
};

export const registrarPago = async (req: Request, res: Response): Promise<void> => {
  const {
    persona_id, concepto, origen_tipo, origen_id, monto, fecha,
    autorizado_por, comprobante_doc_id, nota,
  } = req.body;

  if (!isIntId(persona_id)) { res.status(400).json({ mensaje: 'persona_id inválido.' }); return; }
  if (concepto !== 'rendimiento' && concepto !== 'comision') {
    res.status(400).json({ mensaje: "concepto debe ser 'rendimiento' o 'comision'." }); return;
  }
  if (origen_tipo !== 'aportacion' && origen_tipo !== 'credito') {
    res.status(400).json({ mensaje: "origen_tipo debe ser 'aportacion' o 'credito'." }); return;
  }
  if (!isIntId(origen_id)) { res.status(400).json({ mensaje: 'origen_id inválido.' }); return; }
  if (!isNonEmpty(monto) || !MONEY_REGEX.test(monto.trim())) {
    res.status(400).json({ mensaje: 'monto debe ser un importe positivo con hasta 2 decimales (texto).' }); return;
  }
  if (!isNonEmpty(fecha)) { res.status(400).json({ mensaje: 'fecha es obligatoria.' }); return; }
  if (!isNonEmpty(autorizado_por)) { res.status(400).json({ mensaje: 'autorizado_por es obligatorio (R19).' }); return; }
  if (comprobante_doc_id !== undefined && comprobante_doc_id !== null && !isIntId(comprobante_doc_id)) {
    res.status(400).json({ mensaje: 'comprobante_doc_id inválido.' }); return;
  }

  const linea = [`${persona_id}`, concepto, origen_tipo, `${origen_id}`];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Pendiente total de la línea (para rechazar sobrepago del pago completo).
    const pendRes = await client.query(
      `SELECT COALESCE(SUM(monto_devengado - monto_pagado), 0) AS pendiente
         FROM devengos
        WHERE persona_id=$1 AND concepto=$2 AND origen_tipo=$3 AND origen_id=$4 AND estado <> 'pagado'`,
      linea
    );
    const pendiente = pendRes.rows[0].pendiente as string;
    if (Number(pendiente) <= 0) {
      await client.query('ROLLBACK');
      res.status(400).json({ mensaje: 'No hay devengos pendientes en esa línea.' });
      return;
    }
    // Comparación de importe delegada a NUMERIC en la DB para no usar float en JS.
    const excedeRes = await client.query('SELECT ($1::numeric > $2::numeric) AS excede', [monto.trim(), pendiente]);
    if (excedeRes.rows[0].excede) {
      await client.query('ROLLBACK');
      res.status(400).json({ mensaje: `El pago excede lo pendiente de la línea (${pendiente}).` });
      return;
    }

    // Registrar el pago (R17: un pago por concepto; R19: gobernanza).
    const pagoRes = await client.query(
      `INSERT INTO pagos (persona_id, concepto, monto, fecha, autorizado_por, comprobante_doc_id, nota)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, persona_id, concepto, monto, fecha, autorizado_por, comprobante_doc_id, creado_en`,
      [`${persona_id}`, concepto, monto.trim(), fecha.trim(), autorizado_por.trim(),
       comprobante_doc_id ?? null, nota ?? null]
    );
    const pago = pagoRes.rows[0];

    // Asignación FIFO en SQL NUMERIC (periodo ascendente).
    const alloc = await client.query(
      `WITH pend AS (
         SELECT id, (monto_devengado - monto_pagado) AS pendiente,
                SUM(monto_devengado - monto_pagado) OVER (ORDER BY periodo, id) AS acum
           FROM devengos
          WHERE persona_id=$1 AND concepto=$2 AND origen_tipo=$3 AND origen_id=$4 AND estado <> 'pagado'
       )
       SELECT id,
              LEAST(pendiente, GREATEST(0::numeric, $5::numeric - (acum - pendiente))) AS aplicado
         FROM pend
        WHERE LEAST(pendiente, GREATEST(0::numeric, $5::numeric - (acum - pendiente))) > 0
        ORDER BY id`,
      [...linea, monto.trim()]
    );

    const aplicaciones = [];
    for (const row of alloc.rows) {
      await client.query(
        `INSERT INTO pago_aplicaciones (pago_id, devengo_id, monto) VALUES ($1, $2, $3)`,
        [pago.id, row.id, row.aplicado]
      );
      await client.query(
        `UPDATE devengos
            SET monto_pagado = monto_pagado + $2::numeric,
                estado = CASE
                  WHEN monto_pagado + $2::numeric >= monto_devengado THEN 'pagado'
                  WHEN monto_pagado + $2::numeric > 0                 THEN 'parcial'
                  ELSE estado END
          WHERE id = $1`,
        [row.id, row.aplicado]
      );
      aplicaciones.push({ devengo_id: row.id, monto: row.aplicado });
    }

    await client.query('COMMIT');
    res.status(201).json({ pago, aplicaciones });
  } catch (error: any) {
    await client.query('ROLLBACK');
    if (error?.code === '23503') { res.status(400).json({ mensaje: 'persona o comprobante no existe.' }); return; }
    if (error?.code === '23514') { res.status(400).json({ mensaje: 'El pago viola una restricción (p.ej. sobrepago de un devengo).' }); return; }
    console.error('Error al registrar el pago:', error);
    res.status(500).json({ mensaje: 'Error interno al registrar el pago.' });
  } finally {
    client.release();
  }
};
