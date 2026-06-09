import { Request, Response } from 'express';
import pool from '../config/database';
import {
  CrearPrestamoDto,
  EditarPrestamoDto,
  RegistrarPagoDto,
  ActualizarDocumentosDto,
  RenovarPrestamoDto,
  EstatusPrestamo,
  TipoDocumentoPrestamo,
  TipoArchivoPrestamo,
  ParticipanteDto,
} from '../models/prestamo.model';

const DIRECCIONES_VALIDAS = ['ASC', 'DESC'] as const;

const escapeLikeWildcards = (s: string): string => s.replace(/[\\%_]/g, '\\$&');

const TIPOS_ARCHIVO_VALIDOS: TipoArchivoPrestamo[] = [
  'avaluo', 'gastos_notariales', 'escritura', 'contrato_firmado',
  'pagare_firmado', 'documento_propiedad', 'contrato_terminos',
];

const archivosRequeridosPorTipo = (tipoGarantia: string): string[] => {
  if (tipoGarantia === 'pagare') return ['pagare_firmado', 'contrato_firmado'];
  if (tipoGarantia === 'otra')   return ['documento_propiedad', 'contrato_terminos'];
  return ['avaluo', 'gastos_notariales', 'escritura', 'contrato_firmado'];
};

// ================================================================
// UTILIDADES
// ================================================================

// Genera folio con formato PREST-YYYY-NNN
const generarFolio = async (): Promise<string> => {
  const anio = new Date().getFullYear();
  const resultado = await pool.query(
    `SELECT COUNT(*) FROM prestamos WHERE folio LIKE $1`,
    [`PREST-${anio}-%`]
  );
  const siguiente = parseInt(resultado.rows[0].count, 10) + 1;
  return `PREST-${anio}-${String(siguiente).padStart(3, '0')}`;
};

// ================================================================
// PRÉSTAMOS
// ================================================================

// ----------------------------------------------------------------
// Auditoría de capital — todos los préstamos para diff vs Excel
// GET /api/prestamos/auditoria
// ----------------------------------------------------------------
export const auditoriaCapital = async (_req: Request, res: Response): Promise<void> => {
  try {
    const r = await pool.query(`
      SELECT
        p.id,
        p.folio,
        CONCAT(c.nombres, ' ', c.apellido_paterno,
          CASE WHEN c.apellido_materno IS NOT NULL THEN ' ' || c.apellido_materno ELSE '' END
        )                              AS cliente_nombre,
        p.monto_prestado::NUMERIC      AS capital_original,
        p.saldo_pendiente::NUMERIC     AS saldo_actual,
        p.tasa_interes_mensual::NUMERIC AS tasa,
        p.estatus,
        p.fecha_inicio::TEXT           AS fecha_inicio
      FROM prestamos p
      JOIN clientes c ON c.id = p.cliente_id
      WHERE p.estatus NOT IN ('cancelado', 'liquidado')
      ORDER BY c.apellido_paterno, c.nombres
    `);
    res.json(r.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al obtener datos de auditoría.' });
  }
};

// ----------------------------------------------------------------
// Estadísticas del dashboard
// GET /api/prestamos/stats
// ----------------------------------------------------------------
export const estadisticasPrestamos = async (req: Request, res: Response): Promise<void> => {
  try {
    const [carteraResult, utilidadResult, ytdResult, moratoriosResult, estatusResult] = await Promise.all([
      pool.query(`
        SELECT
          COALESCE(SUM(CASE WHEN estatus IN ('activo','atrasado') THEN saldo_pendiente ELSE 0 END), 0) AS capital_activo,
          COUNT(CASE WHEN estatus IN ('activo','atrasado') THEN 1 END)                                  AS cantidad_creditos,
          COALESCE(
            SUM(CASE WHEN estatus IN ('activo','atrasado') THEN saldo_pendiente * tasa_interes_mensual ELSE 0 END)
            / NULLIF(SUM(CASE WHEN estatus IN ('activo','atrasado') THEN saldo_pendiente ELSE 0 END), 0),
            0
          )                                                                                             AS tasa_ponderada,
          COALESCE(SUM(CASE WHEN estatus IN ('activo','atrasado')
            THEN saldo_pendiente * tasa_interes_mensual / 100 ELSE 0 END), 0)                          AS interes_proyectado
        FROM prestamos
      `),

      // Utilidad neta mensual (spread en pesos):
      // A) Capital desplegado en préstamos: (tasa_cliente − tasa_inversionista) / 100 × capital
      // B) Capital ocioso (capital_disponible): (tasa_prom_cartera − tasa_inversionista) / 100 × capital
      pool.query(`
        WITH
          tasa_cartera AS (
            SELECT COALESCE(
              SUM(p.saldo_pendiente * p.tasa_interes_mensual)
              / NULLIF(SUM(p.saldo_pendiente), 0), 0
            ) AS tasa
            FROM prestamos p WHERE p.estatus IN ('activo', 'atrasado')
          ),
          spread_a AS (
            SELECT COALESCE(SUM(
              (p.tasa_interes_mensual - pp.tasa_rendimiento) / 100 * pp.monto_aportado
            ), 0) AS monto
            FROM participantes_prestamo pp
            JOIN prestamos p ON pp.prestamo_id = p.id
            WHERE pp.es_oficina = false AND p.estatus IN ('activo', 'atrasado')
          ),
          tasa_inv AS (
            SELECT inversionista_id,
              SUM(monto_actual * tasa_interes_mensual) / NULLIF(SUM(monto_actual), 0) AS tasa_promedio
            FROM inversiones WHERE estatus = 'activo'
            GROUP BY inversionista_id
          ),
          spread_b AS (
            SELECT COALESCE(SUM(
              (tc.tasa - ti.tasa_promedio) / 100 * i.capital_disponible
            ), 0) AS monto
            FROM inversionistas i
            JOIN tasa_inv ti ON ti.inversionista_id = i.id
            CROSS JOIN tasa_cartera tc
            WHERE i.capital_disponible > 0
          )
        SELECT spread_a.monto + spread_b.monto AS utilidad_oficina
        FROM spread_a, spread_b
      `),

      // Interés cobrado en el año en curso (YTD)
      pool.query(`
        SELECT COALESCE(SUM(hpp.monto), 0) AS interes_ytd
        FROM historial_pagos_prestamo hpp
        WHERE hpp.tipo_pago = 'interes'
          AND hpp.fecha_pago >= date_trunc('year', CURRENT_DATE)
      `),

      // Cartera vencida = interés no cobrado (meses_mora × interés_mensual)
      // Capital NUNCA se incluye — sólo el interés devengado sin pagar
      pool.query(`
        SELECT COALESCE(SUM(
          GREATEST(0,
            CASE WHEN p.fecha_inicio <= CURRENT_DATE THEN
              EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.fecha_inicio))::INTEGER * 12 +
              EXTRACT(MONTH FROM AGE(CURRENT_DATE, p.fecha_inicio))::INTEGER + 1
            ELSE 0 END
            -
            COALESCE((
              SELECT COUNT(*)
              FROM historial_pagos_prestamo hpp
              WHERE hpp.prestamo_id = p.id AND hpp.tipo_pago = 'interes'
            ), 0)
          ) * p.saldo_pendiente * p.tasa_interes_mensual / 100
        ), 0) AS cartera_vencida
        FROM prestamos p
        WHERE p.estatus IN ('atrasado', 'en_juicio')
      `),

      pool.query(`
        SELECT estatus, COUNT(*)::INTEGER AS total
        FROM prestamos
        GROUP BY estatus
      `),
    ]);

    const c = carteraResult.rows[0];

    const por_estatus: Record<string, number> = {};
    for (const row of estatusResult.rows) {
      por_estatus[row.estatus] = row.total;
    }

    res.json({
      capital_activo:     parseFloat(c.capital_activo),
      cantidad_creditos:  parseInt(c.cantidad_creditos, 10),
      interes_ytd:        parseFloat(ytdResult.rows[0].interes_ytd),
      tasa_ponderada:     parseFloat(c.tasa_ponderada),
      interes_proyectado: parseFloat(c.interes_proyectado),
      utilidad_oficina:   parseFloat(utilidadResult.rows[0].utilidad_oficina),
      cartera_vencida:    parseFloat(moratoriosResult.rows[0].cartera_vencida),
      por_estatus,
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de préstamos:', error);
    res.status(500).json({ mensaje: 'Error interno al obtener estadísticas.' });
  }
};

// ----------------------------------------------------------------
// Auto-sincronización de estatus por mora calendario
// POST /api/prestamos/sincronizar-estatus
// ----------------------------------------------------------------
export const sincronizarEstatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(`
      WITH meses_calc AS (
        SELECT
          p.id,
          p.estatus,
          GREATEST(0,
            CASE WHEN p.fecha_inicio <= CURRENT_DATE THEN
              EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.fecha_inicio))::INTEGER * 12 +
              EXTRACT(MONTH FROM AGE(CURRENT_DATE, p.fecha_inicio))::INTEGER + 1
            ELSE 0 END
            -
            COALESCE((
              SELECT COUNT(*)
              FROM historial_pagos_prestamo hpp
              WHERE hpp.prestamo_id = p.id
                AND hpp.tipo_pago = 'interes'
            ), 0)
          ) AS meses_sin_pago
        FROM prestamos p
        WHERE p.estatus IN ('activo', 'atrasado')
      ),
      cambios AS (
        UPDATE prestamos
        SET estatus = CASE
          WHEN mc.meses_sin_pago > 0 AND mc.estatus = 'activo'   THEN 'atrasado'
          WHEN mc.meses_sin_pago = 0 AND mc.estatus = 'atrasado' THEN 'activo'
          ELSE mc.estatus
        END
        FROM meses_calc mc
        WHERE prestamos.id = mc.id
          AND (
            (mc.meses_sin_pago > 0 AND mc.estatus = 'activo')
            OR (mc.meses_sin_pago = 0 AND mc.estatus = 'atrasado')
          )
        RETURNING prestamos.id
      )
      SELECT COUNT(*)::INTEGER AS actualizados FROM cambios
    `);

    res.json({ actualizados: result.rows[0].actualizados });
  } catch (error) {
    console.error('Error al sincronizar estatus de préstamos:', error);
    res.status(500).json({ mensaje: 'Error interno al sincronizar estatus.' });
  }
};

// Columnas permitidas para ORDER BY (whitelist anti-injection)
const COLUMNAS_ORDEN: Record<string, string> = {
  cliente_nombre:       'cliente_nombre',
  monto_prestado:       'p.monto_prestado',
  tasa_interes_mensual: 'p.tasa_interes_mensual',
  dia_pago:             'dia_pago',
  progreso:             'pagos_realizados',
};

// ----------------------------------------------------------------
// Listar préstamos con filtros, paginación y orden dinámico
// GET /api/prestamos
// Query: buscar, estatus, pagina, limite, ordenarPor, direccion
// ----------------------------------------------------------------
export const listarPrestamos = async (req: Request, res: Response): Promise<void> => {
  try {
    const buscar     = (req.query.buscar     as string) || '';
    const estatus    = (req.query.estatus    as string) || '';
    const pagina     = Math.max(1, parseInt(req.query.pagina as string, 10) || 1);
    const limite     = Math.min(100, Math.max(1, parseInt(req.query.limite as string, 10) || 20));
    const offset     = (pagina - 1) * limite;
    const ordenarPor = (req.query.ordenarPor as string) || 'cliente_nombre';
    const direccionRaw = (req.query.direccion as string)?.toUpperCase();
    const direccion  = DIRECCIONES_VALIDAS.includes(direccionRaw as typeof DIRECCIONES_VALIDAS[number])
      ? direccionRaw
      : 'DESC';
    const columna    = COLUMNAS_ORDEN[ordenarPor] ?? 'cliente_nombre';

    const condiciones: string[] = [];
    const valores: (string | number)[] = [];
    let indice = 1;

    if (buscar) {
      condiciones.push(`(
        p.folio ILIKE $${indice} ESCAPE '\\'
        OR CONCAT(c.nombres, ' ', c.apellido_paterno, ' ', c.apellido_materno) ILIKE $${indice} ESCAPE '\\'
        OR c.apellido_paterno ILIKE $${indice} ESCAPE '\\'
      )`);
      valores.push(`%${escapeLikeWildcards(String(buscar))}%`);
      indice++;
    }

    if (estatus) {
      condiciones.push(`p.estatus = $${indice}`);
      valores.push(estatus);
      indice++;
    }

    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    const totalResult = await pool.query(
      `SELECT COUNT(*)
       FROM prestamos p
       JOIN clientes c ON c.id = p.cliente_id
       ${where}`,
      valores
    );
    const total = parseInt(totalResult.rows[0].count, 10);

    const resultado = await pool.query(
      `SELECT
          p.id,
          p.folio,
          p.cliente_id,
          CONCAT(c.nombres, ' ', c.apellido_paterno,
            CASE WHEN c.apellido_materno IS NOT NULL THEN ' ' || c.apellido_materno ELSE '' END
          ) AS cliente_nombre,
          p.monto_prestado,
          p.saldo_pendiente,
          p.tasa_interes_mensual,
          ROUND(p.saldo_pendiente * p.tasa_interes_mensual / 100, 2)  AS interes_mensual,
          EXTRACT(DAY FROM p.fecha_inicio)::INTEGER                    AS dia_pago,
          p.fecha_inicio,
          p.fecha_vencimiento,
          p.plazo_meses,
          p.estatus,
          (SELECT COUNT(*) FROM historial_pagos_prestamo hp
           WHERE hp.prestamo_id = p.id
             AND hp.tipo_pago != 'interes_anticipado')::INTEGER         AS pagos_realizados,
          GREATEST(0,
            CASE WHEN p.fecha_inicio <= CURRENT_DATE THEN
              EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.fecha_inicio))::INTEGER * 12 +
              EXTRACT(MONTH FROM AGE(CURRENT_DATE, p.fecha_inicio))::INTEGER + 1
            ELSE 0 END
            -
            COALESCE((
              SELECT COUNT(*) FROM historial_pagos_prestamo hp2
              WHERE hp2.prestamo_id = p.id AND hp2.tipo_pago = 'interes'
            ), 0)
          )::INTEGER                                                    AS meses_sin_pago
        FROM prestamos p
        JOIN clientes c ON c.id = p.cliente_id
        ${where}
        ORDER BY ${columna} ${direccion}
        LIMIT $${indice} OFFSET $${indice + 1}`,
      [...valores, limite, offset]
    );

    res.json({
      prestamos: resultado.rows,
      total,
      pagina,
      limite,
      totalPaginas: Math.ceil(total / limite),
    });
  } catch (error) {
    console.error('Error al listar préstamos:', error);
    res.status(500).json({ mensaje: 'Error interno al obtener préstamos.' });
  }
};

// ----------------------------------------------------------------
// Obtener expediente completo de un préstamo
// GET /api/prestamos/:id
// ----------------------------------------------------------------
export const obtenerPrestamo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const prestamoResult = await pool.query(
      `SELECT
          p.*,
          CONCAT(c.nombres, ' ', c.apellido_paterno,
            CASE WHEN c.apellido_materno IS NOT NULL THEN ' ' || c.apellido_materno ELSE '' END
          ) AS cliente_nombre,
          c.telefono_celular AS cliente_telefono
        FROM prestamos p
        JOIN clientes c ON c.id = p.cliente_id
        WHERE p.id = $1`,
      [id]
    );

    if (prestamoResult.rowCount === 0) {
      res.status(404).json({ mensaje: 'Préstamo no encontrado.' });
      return;
    }

    const [documentosResult, pagosResult, moratoriosResult, participantesResult] = await Promise.all([
      pool.query(
        'SELECT * FROM documentos_prestamo WHERE prestamo_id = $1 ORDER BY tipo',
        [id]
      ),
      pool.query(
        'SELECT * FROM historial_pagos_prestamo WHERE prestamo_id = $1 ORDER BY fecha_pago DESC',
        [id]
      ),
      pool.query(
        'SELECT * FROM moratorios_prestamo WHERE prestamo_id = $1 ORDER BY fecha_calculo DESC',
        [id]
      ),
      pool.query(
        `SELECT pp.*,
            CASE WHEN inv.id IS NOT NULL
              THEN CONCAT(inv.nombres, ' ', inv.apellido_paterno)
            END AS inversionista_nombre
          FROM participantes_prestamo pp
          LEFT JOIN inversionistas inv ON inv.id = pp.inversionista_id
          WHERE pp.prestamo_id = $1
          ORDER BY pp.es_oficina DESC, pp.fecha_registro ASC`,
        [id]
      ),
    ]);

    res.json({
      ...prestamoResult.rows[0],
      participantes: participantesResult.rows,
      documentos:    documentosResult.rows,
      pagos:         pagosResult.rows,
      moratorios:    moratoriosResult.rows,
    });
  } catch (error) {
    console.error('Error al obtener préstamo:', error);
    res.status(500).json({ mensaje: 'Error interno al obtener el préstamo.' });
  }
};

// ----------------------------------------------------------------
// Crear préstamo
// POST /api/prestamos
// ----------------------------------------------------------------
export const crearPrestamo = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const registrado_por = req.usuario?.userId;
    const datos: CrearPrestamoDto = req.body;

    if (!datos.cliente_id) {
      res.status(400).json({ mensaje: 'El cliente es obligatorio.' });
      return;
    }
    if (!datos.monto_prestado || datos.monto_prestado <= 0) {
      res.status(400).json({ mensaje: 'El monto prestado debe ser mayor a cero.' });
      return;
    }
    if (!datos.tasa_interes_mensual || datos.tasa_interes_mensual <= 0) {
      res.status(400).json({ mensaje: 'La tasa de interés mensual debe ser mayor a cero.' });
      return;
    }
    if (!datos.plazo_meses || datos.plazo_meses <= 0) {
      res.status(400).json({ mensaje: 'El plazo en meses debe ser mayor a cero.' });
      return;
    }
    if (!datos.fecha_inicio) {
      res.status(400).json({ mensaje: 'La fecha de inicio es obligatoria.' });
      return;
    }

    await client.query('BEGIN');

    // Verificar que el cliente exista
    const clienteExiste = await client.query('SELECT id FROM clientes WHERE id = $1', [datos.cliente_id]);
    if (clienteExiste.rowCount === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ mensaje: 'Cliente no encontrado.' });
      return;
    }

    // Regla de oro: Oficina TS absorbe el remanente si la suma de inversionistas < monto
    const participantes: ParticipanteDto[] = datos.participantes ?? [];

    // Validar capital disponible de cada inversionista antes de crear el préstamo
    // FOR UPDATE bloquea las filas hasta el COMMIT/ROLLBACK para prevenir race conditions
    const invConWallet = participantes.filter((p) => !p.es_oficina && p.inversionista_id);
    for (const part of invConWallet) {
      const wRes = await client.query(
        'SELECT capital_disponible FROM inversionistas WHERE id = $1 FOR UPDATE',
        [part.inversionista_id]
      );
      if (wRes.rowCount === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ mensaje: `Inversionista ${part.inversionista_id} no encontrado.` });
        return;
      }
      const disponible = parseFloat(wRes.rows[0].capital_disponible);
      if (part.monto_aportado > disponible + 0.009) {
        await client.query('ROLLBACK');
        res.status(400).json({
          mensaje: `Capital insuficiente: el inversionista solo tiene $${disponible.toFixed(2)} disponible y se intentan asignar $${part.monto_aportado.toFixed(2)}.`,
        });
        return;
      }
    }

    const tipoGarantia = datos.tipo_garantia ?? 'hipotecaria';
    const esHipotecaria = tipoGarantia === 'hipotecaria';

    const apertura         = datos.apertura         ?? 0;
    const avaluo           = datos.avaluo           ?? 0;
    const gastosNotariales = datos.gastos_notariales ?? 0;

    const interesAnticipado = parseFloat(
      (datos.monto_prestado * (datos.tasa_interes_mensual / 100)).toFixed(2)
    );
    const cantidadEntregada = parseFloat(
      (datos.monto_prestado - interesAnticipado - apertura - avaluo - gastosNotariales).toFixed(2)
    );

    const fechaInicio      = new Date(datos.fecha_inicio + 'T12:00:00');
    const fechaVencimiento = new Date(fechaInicio);
    fechaVencimiento.setMonth(fechaVencimiento.getMonth() + datos.plazo_meses);
    fechaVencimiento.setDate(fechaVencimiento.getDate() - 1);
    const fechaVencimientoStr = fechaVencimiento.toISOString().split('T')[0];

    const folio = await generarFolio();

    const comisionGestionPct = datos.comision_gestion_pct ?? 0;

    const resultado = await client.query(
      `INSERT INTO prestamos (
          cliente_id, folio,
          tipo_garantia,
          monto_prestado, saldo_pendiente, valor_propiedad,
          tasa_interes_mensual, tasa_moratoria_mensual, comision_gestion_pct, plazo_meses,
          interes_anticipado, cantidad_entregada,
          apertura, avaluo, gastos_notariales,
          fecha_inicio, fecha_vencimiento,
          notaria, url_contrato,
          descripcion_garantia, url_evidencia_garantia,
          aval_nombre,
          notas, registrado_por,
          estatus
        ) VALUES (
          $1, $2, $3, $4, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, 'documentos_incompletos'
        ) RETURNING *`,
      [
        datos.cliente_id,                                                                 // $1
        folio,                                                                            // $2
        tipoGarantia,                                                                     // $3
        datos.monto_prestado,                                                             // $4 (monto y saldo)
        esHipotecaria ? (datos.valor_propiedad || null) : null,                           // $5
        datos.tasa_interes_mensual,                                                       // $6
        datos.tasa_moratoria_mensual ?? 0,                                                // $7
        comisionGestionPct,                                                               // $8
        datos.plazo_meses,                                                                // $9
        interesAnticipado,                                                                // $10
        cantidadEntregada,                                                                // $11
        apertura,                                                                         // $12
        avaluo,                                                                           // $13
        gastosNotariales,                                                                 // $14
        datos.fecha_inicio,                                                               // $15
        fechaVencimientoStr,                                                              // $16
        esHipotecaria ? (datos.notaria?.trim()      || null) : null,                      // $17
        esHipotecaria ? (datos.url_contrato?.trim() || null) : null,                      // $18
        tipoGarantia === 'otra' ? (datos.descripcion_garantia?.trim() || null) : null,    // $19
        !esHipotecaria ? (datos.url_evidencia_garantia?.trim() || null) : null,           // $20
        tipoGarantia === 'pagare' ? (datos.aval_nombre?.trim() || null) : null,           // $21
        datos.notas?.trim() || null,                                                      // $22
        registrado_por      || null,                                                      // $23
      ]
    );

    const prestamo = resultado.rows[0];

    // Regla de oro: Oficina TS absorbe el diferencial automáticamente
    const soloInversionistas = participantes.filter((p) => !p.es_oficina);
    const sumaInv = parseFloat(
      soloInversionistas.reduce((s, p) => s + p.monto_aportado, 0).toFixed(2)
    );
    const montoOficina = parseFloat((datos.monto_prestado - sumaInv).toFixed(2));

    const participantesAGuardar: ParticipanteDto[] = [
      ...(montoOficina > 0.009
        ? [{ inversionista_id: null, es_oficina: true, monto_aportado: montoOficina, tasa_rendimiento: datos.tasa_interes_mensual }]
        : []),
      ...soloInversionistas,
    ];

    for (const part of participantesAGuardar) {
      const interesMensual = parseFloat(
        (part.monto_aportado * (part.tasa_rendimiento / 100)).toFixed(2)
      );
      await client.query(
        `INSERT INTO participantes_prestamo
           (prestamo_id, inversionista_id, es_oficina, monto_aportado, tasa_rendimiento, interes_mensual, registrado_por)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          prestamo.id,
          part.inversionista_id || null,
          part.es_oficina,
          part.monto_aportado,
          part.tasa_rendimiento,
          interesMensual,
          registrado_por || null,
        ]
      );
    }

    // Descontar capital disponible de cada inversionista y registrar movimiento salida
    for (const part of invConWallet) {
      await client.query(
        `UPDATE inversionistas
         SET capital_disponible = capital_disponible - $1, fecha_actualizacion = NOW()
         WHERE id = $2`,
        [part.monto_aportado, part.inversionista_id]
      );
      await client.query(
        `INSERT INTO movimientos_inversionistas
           (inversionista_id, tipo, monto, concepto, prestamo_id, registrado_por)
         VALUES ($1, 'salida', $2, $3, $4, $5)`,
        [
          part.inversionista_id,
          part.monto_aportado,
          `Asignado a préstamo ${folio}`,
          prestamo.id,
          registrado_por || null,
        ]
      );
    }

    // Registrar el interés anticipado como primer pago automático
    await client.query(
      `INSERT INTO historial_pagos_prestamo
         (prestamo_id, tipo_pago, monto, notas, registrado_por)
       VALUES ($1, 'interes_anticipado', $2, 'Interés anticipado del primer mes', $3)`,
      [prestamo.id, interesAnticipado, registrado_por || null]
    );

    await client.query('COMMIT');

    res.status(201).json({
      mensaje: 'Préstamo registrado correctamente.',
      prestamo,
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error al crear préstamo:', error);
    res.status(500).json({ mensaje: 'Error interno al registrar el préstamo.' });
  } finally {
    client.release();
  }
};

// ----------------------------------------------------------------
// Editar préstamo
// PUT /api/prestamos/:id
// ----------------------------------------------------------------
export const editarPrestamo = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { id }         = req.params;
    const registrado_por = req.usuario?.userId;
    const datos: EditarPrestamoDto = req.body;

    await client.query('BEGIN');

    const existe = await client.query(
      'SELECT id, monto_prestado, tasa_interes_mensual, fecha_inicio, plazo_meses FROM prestamos WHERE id = $1',
      [id]
    );
    if (existe.rowCount === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ mensaje: 'Préstamo no encontrado.' });
      return;
    }

    const actual = existe.rows[0];

    // Recalcular fecha_vencimiento si cambia fecha_inicio o plazo_meses
    const fechaInicioFinal = datos.fecha_inicio
      ? datos.fecha_inicio.substring(0, 10)
      : String(actual.fecha_inicio).substring(0, 10);
    const plazoFinal = datos.plazo_meses ?? actual.plazo_meses;
    const fv = new Date(fechaInicioFinal + 'T12:00:00');
    fv.setMonth(fv.getMonth() + plazoFinal);
    fv.setDate(fv.getDate() - 1);
    const fechaVencimientoFinal = fv.toISOString().split('T')[0];

    const tipoGarantia  = datos.tipo_garantia ?? undefined;
    const esHipotecaria = (tipoGarantia ?? 'hipotecaria') === 'hipotecaria';

    const tipoGarantiaFinal = tipoGarantia ?? 'hipotecaria';

    const resultado = await client.query(
      `UPDATE prestamos SET
          tipo_garantia          = COALESCE($1, tipo_garantia),
          valor_propiedad        = $2,
          tasa_interes_mensual   = COALESCE($3, tasa_interes_mensual),
          tasa_moratoria_mensual = COALESCE($4, tasa_moratoria_mensual),
          plazo_meses            = $5,
          apertura               = COALESCE($6, apertura),
          avaluo                 = COALESCE($7, avaluo),
          gastos_notariales      = COALESCE($8, gastos_notariales),
          notaria                = $9,
          url_contrato           = $10,
          descripcion_garantia   = $11,
          url_evidencia_garantia = $12,
          notas                  = COALESCE($13, notas),
          aval_nombre            = $14,
          fecha_inicio           = $15,
          fecha_vencimiento      = $16,
          fecha_actualizacion    = NOW()
       WHERE id = $17
       RETURNING *`,
      [
        tipoGarantia || null,                                                        // $1
        esHipotecaria ? (datos.valor_propiedad ?? null) : null,                      // $2
        datos.tasa_interes_mensual || null,                                          // $3
        datos.tasa_moratoria_mensual ?? null,                                        // $4
        plazoFinal,                                                                  // $5
        datos.apertura ?? null,                                                      // $6
        datos.avaluo ?? null,                                                        // $7
        datos.gastos_notariales ?? null,                                             // $8
        esHipotecaria ? (datos.notaria?.trim() ?? null) : null,                      // $9
        esHipotecaria ? (datos.url_contrato?.trim() ?? null) : null,                 // $10
        tipoGarantiaFinal === 'otra'
          ? (datos.descripcion_garantia?.trim() ?? null) : null,                     // $11
        tipoGarantiaFinal !== 'hipotecaria'
          ? (datos.url_evidencia_garantia?.trim() ?? null) : null,                   // $12
        datos.notas?.trim() || null,                                                 // $13
        tipoGarantiaFinal === 'pagare'
          ? (datos.aval_nombre?.trim() ?? null) : null,                              // $14
        fechaInicioFinal,                                                            // $15
        fechaVencimientoFinal,                                                       // $16
        id,                                                                          // $17
      ]
    );

    // Actualizar participantes si se enviaron — Oficina TS absorbe el diferencial
    if (datos.participantes !== undefined) {
      const montoBase     = parseFloat(resultado.rows[0].monto_prestado);
      const tasaBase      = parseFloat(resultado.rows[0].tasa_interes_mensual);
      const soloInv       = (datos.participantes ?? []).filter((p) => !p.es_oficina);
      const sumaInv       = parseFloat(soloInv.reduce((s, p) => s + p.monto_aportado, 0).toFixed(2));
      const montoOficinaE = parseFloat((montoBase - sumaInv).toFixed(2));

      const participantesEdit: ParticipanteDto[] = [
        ...(montoOficinaE > 0.009
          ? [{ inversionista_id: null, es_oficina: true, monto_aportado: montoOficinaE, tasa_rendimiento: tasaBase }]
          : []),
        ...soloInv,
      ];

      // 1. Restaurar capital de inversionistas anteriores
      const prevParts = await client.query(
        `SELECT inversionista_id, monto_aportado FROM participantes_prestamo
         WHERE prestamo_id = $1 AND es_oficina = false AND inversionista_id IS NOT NULL`,
        [id]
      );
      for (const prev of prevParts.rows) {
        await client.query(
          `UPDATE inversionistas
           SET capital_disponible = capital_disponible + $1, fecha_actualizacion = NOW()
           WHERE id = $2`,
          [prev.monto_aportado, prev.inversionista_id]
        );
      }
      await client.query(
        `DELETE FROM movimientos_inversionistas WHERE prestamo_id = $1 AND tipo = 'salida'`,
        [id]
      );

      // 2. Validar capital disponible de los nuevos inversionistas
      // FOR UPDATE bloquea las filas hasta el COMMIT/ROLLBACK para prevenir race conditions
      const nuevosInvConWallet = soloInv.filter((p) => p.inversionista_id);
      for (const part of nuevosInvConWallet) {
        const wRes = await client.query(
          'SELECT capital_disponible FROM inversionistas WHERE id = $1 FOR UPDATE',
          [part.inversionista_id]
        );
        if (!wRes.rows[0]) continue;
        const disponible = parseFloat(wRes.rows[0].capital_disponible);
        if (part.monto_aportado > disponible + 0.009) {
          await client.query('ROLLBACK');
          res.status(400).json({
            mensaje: `Capital insuficiente: el inversionista solo tiene $${disponible.toFixed(2)} disponible y se intentan asignar $${part.monto_aportado.toFixed(2)}.`,
          });
          return;
        }
      }

      await client.query('DELETE FROM participantes_prestamo WHERE prestamo_id = $1', [id]);
      for (const part of participantesEdit) {
        const interesMensual = parseFloat(
          (part.monto_aportado * (part.tasa_rendimiento / 100)).toFixed(2)
        );
        await client.query(
          `INSERT INTO participantes_prestamo
             (prestamo_id, inversionista_id, es_oficina, monto_aportado, tasa_rendimiento, interes_mensual, registrado_por)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [id, part.inversionista_id || null, part.es_oficina, part.monto_aportado, part.tasa_rendimiento, interesMensual, registrado_por || null]
        );
      }

      // 3. Descontar capital de los nuevos inversionistas y registrar movimientos
      const prestamoFolio = resultado.rows[0].folio;
      for (const part of nuevosInvConWallet) {
        await client.query(
          `UPDATE inversionistas
           SET capital_disponible = capital_disponible - $1, fecha_actualizacion = NOW()
           WHERE id = $2`,
          [part.monto_aportado, part.inversionista_id]
        );
        await client.query(
          `INSERT INTO movimientos_inversionistas
             (inversionista_id, tipo, monto, concepto, prestamo_id, registrado_por)
           VALUES ($1, 'salida', $2, $3, $4, $5)`,
          [
            part.inversionista_id,
            part.monto_aportado,
            `Reasignado a préstamo ${prestamoFolio}`,
            id,
            registrado_por || null,
          ]
        );
      }
    }

    await client.query('COMMIT');

    res.json({
      mensaje: 'Préstamo actualizado correctamente.',
      prestamo: resultado.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error al editar préstamo:', error);
    res.status(500).json({ mensaje: 'Error interno al actualizar el préstamo.' });
  } finally {
    client.release();
  }
};

// ----------------------------------------------------------------
// Cambiar estatus del préstamo
// PATCH /api/prestamos/:id/estatus
// ----------------------------------------------------------------
export const cambiarEstatusPrestamo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { estatus } = req.body as { estatus: EstatusPrestamo };

    const estatusValidos: EstatusPrestamo[] = ['activo', 'atrasado', 'en_juicio', 'liquidado', 'cancelado', 'documentos_incompletos'];
    if (!estatusValidos.includes(estatus)) {
      res.status(400).json({ mensaje: 'Estatus no válido.', estatusValidos });
      return;
    }

    const resultado = await pool.query(
      `UPDATE prestamos
       SET estatus = $1, fecha_actualizacion = NOW()
       WHERE id = $2
       RETURNING id, estatus, fecha_actualizacion`,
      [estatus, id]
    );

    if (resultado.rowCount === 0) {
      res.status(404).json({ mensaje: 'Préstamo no encontrado.' });
      return;
    }

    res.json({ mensaje: 'Estatus actualizado correctamente.', ...resultado.rows[0] });
  } catch (error) {
    console.error('Error al cambiar estatus:', error);
    res.status(500).json({ mensaje: 'Error interno al cambiar el estatus.' });
  }
};

// ----------------------------------------------------------------
// Renovar préstamo
// POST /api/prestamos/:id/renovar
// ----------------------------------------------------------------
export const renovarPrestamo = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const registrado_por = req.usuario?.userId;
    const datos: RenovarPrestamoDto = req.body;

    await client.query('BEGIN');

    const prestamoAnterior = await client.query(
      'SELECT * FROM prestamos WHERE id = $1',
      [id]
    );
    if (prestamoAnterior.rowCount === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ mensaje: 'Préstamo no encontrado.' });
      return;
    }

    const anterior = prestamoAnterior.rows[0];

    const interesAnticipado = parseFloat(
      (datos.monto_prestado * (datos.tasa_interes_mensual / 100)).toFixed(2)
    );
    const cantidadEntregada = parseFloat(
      (datos.monto_prestado - interesAnticipado).toFixed(2)
    );

    const fechaInicioRen      = new Date(datos.fecha_inicio + 'T12:00:00');
    const fechaVencimientoRen = new Date(fechaInicioRen);
    fechaVencimientoRen.setMonth(fechaVencimientoRen.getMonth() + datos.plazo_meses);
    fechaVencimientoRen.setDate(fechaVencimientoRen.getDate() - 1);
    const fechaVencimientoStr = fechaVencimientoRen.toISOString().split('T')[0];

    const folio = await generarFolio();

    // Crear nuevo préstamo con referencia al anterior
    const nuevoPrestamo = await client.query(
      `INSERT INTO prestamos (
          cliente_id, folio,
          monto_prestado, saldo_pendiente, valor_propiedad,
          tasa_interes_mensual, tasa_moratoria_mensual, plazo_meses,
          interes_anticipado, cantidad_entregada, fecha_inicio, fecha_vencimiento,
          notaria, url_contrato, notas,
          renovado, prestamo_anterior_id, registrado_por
        ) VALUES (
          $1, $2, $3, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true, $15, $16
        ) RETURNING *`,
      [
        anterior.cliente_id,             // $1
        folio,                           // $2
        datos.monto_prestado,            // $3 (monto y saldo)
        anterior.valor_propiedad,        // $4
        datos.tasa_interes_mensual,      // $5
        datos.tasa_moratoria_mensual ?? anterior.tasa_moratoria_mensual, // $6
        datos.plazo_meses,               // $7
        interesAnticipado,               // $8
        cantidadEntregada,               // $9
        datos.fecha_inicio,              // $10
        fechaVencimientoStr,             // $11
        datos.notaria?.trim() || anterior.notaria, // $12
        datos.url_contrato?.trim() || null,        // $13
        datos.notas?.trim() || null,               // $14
        id,                                        // $15
        registrado_por || null,                    // $16
      ]
    );

    // Marcar el anterior como liquidado
    await client.query(
      `UPDATE prestamos
       SET estatus = 'liquidado', fecha_actualizacion = NOW()
       WHERE id = $1`,
      [id]
    );

    // Registrar interés anticipado del nuevo préstamo
    await client.query(
      `INSERT INTO historial_pagos_prestamo
         (prestamo_id, tipo_pago, monto, notas, registrado_por)
       VALUES ($1, 'interes_anticipado', $2, 'Interés anticipado — renovación', $3)`,
      [nuevoPrestamo.rows[0].id, interesAnticipado, registrado_por || null]
    );

    await client.query('COMMIT');

    res.status(201).json({
      mensaje: 'Préstamo renovado correctamente.',
      prestamo: nuevoPrestamo.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error al renovar préstamo:', error);
    res.status(500).json({ mensaje: 'Error interno al renovar el préstamo.' });
  } finally {
    client.release();
  }
};

// ================================================================
// PAGOS
// ================================================================

// ----------------------------------------------------------------
// Listar historial de pagos de un préstamo
// GET /api/prestamos/:id/pagos
// ----------------------------------------------------------------
export const listarPagos = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const resultado = await pool.query(
      `SELECT * FROM historial_pagos_prestamo
       WHERE prestamo_id = $1
       ORDER BY fecha_pago DESC`,
      [id]
    );

    res.json(resultado.rows);
  } catch (error) {
    console.error('Error al listar pagos:', error);
    res.status(500).json({ mensaje: 'Error interno al obtener los pagos.' });
  }
};

// ----------------------------------------------------------------
// Registrar pago
// POST /api/prestamos/:id/pagos
// ----------------------------------------------------------------
export const registrarPago = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const registrado_por = req.usuario?.userId;
    const datos: RegistrarPagoDto = req.body;

    const prestamoResult = await pool.query(
      'SELECT id, saldo_pendiente, tasa_interes_mensual, estatus FROM prestamos WHERE id = $1',
      [id]
    );

    if (prestamoResult.rowCount === 0) {
      res.status(404).json({ mensaje: 'Préstamo no encontrado.' });
      return;
    }

    const prestamo = prestamoResult.rows[0];

    const tiposValidos = ['interes', 'capital', 'moratorio', 'interes_anticipado'];
    if (!tiposValidos.includes(datos.tipo_pago)) {
      res.status(400).json({ mensaje: 'Tipo de pago no válido.' });
      return;
    }

    if (!datos.monto || datos.monto <= 0) {
      res.status(400).json({ mensaje: 'El monto debe ser mayor a cero.' });
      return;
    }

    const pagoResult = await pool.query(
      `INSERT INTO historial_pagos_prestamo (
          prestamo_id, tipo_pago, monto, forma_pago,
          periodo_mes, periodo_anio, notas, url_evidencia, registrado_por
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
      [
        id,
        datos.tipo_pago,
        datos.monto,
        datos.forma_pago    || null,
        datos.periodo_mes   || null,
        datos.periodo_anio  || null,
        datos.notas?.trim() || null,
        datos.url_evidencia?.trim() || null,
        registrado_por      || null,
      ]
    );

    // Si es abono a capital, actualizar saldo pendiente
    let nuevoSaldo = parseFloat(prestamo.saldo_pendiente);
    if (datos.tipo_pago === 'capital') {
      nuevoSaldo = parseFloat((nuevoSaldo - datos.monto).toFixed(2));
      if (nuevoSaldo < 0) nuevoSaldo = 0;

      await pool.query(
        `UPDATE prestamos
         SET saldo_pendiente = $1,
             estatus = CASE WHEN $1 = 0 THEN 'liquidado' ELSE estatus END,
             fecha_actualizacion = NOW()
         WHERE id = $2`,
        [nuevoSaldo, id]
      );
    }

    const saldo  = parseFloat(prestamo.saldo_pendiente);
    const tasa   = parseFloat(prestamo.tasa_interes_mensual);
    const interesCalculado = parseFloat((saldo * (tasa / 100)).toFixed(2));

    res.status(201).json({
      mensaje: 'Pago registrado correctamente.',
      pago: pagoResult.rows[0],
      saldo_pendiente_nuevo: nuevoSaldo,
      interes_mensual_calculado: interesCalculado,
    });
  } catch (error) {
    console.error('Error al registrar pago:', error);
    res.status(500).json({ mensaje: 'Error interno al registrar el pago.' });
  }
};

// ================================================================
// MORATORIOS
// ================================================================

// ----------------------------------------------------------------
// Listar moratorios de un préstamo
// GET /api/prestamos/:id/moratorios
// ----------------------------------------------------------------
export const listarMoratorios = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const resultado = await pool.query(
      `SELECT * FROM moratorios_prestamo
       WHERE prestamo_id = $1
       ORDER BY fecha_calculo DESC`,
      [id]
    );

    res.json(resultado.rows);
  } catch (error) {
    console.error('Error al listar moratorios:', error);
    res.status(500).json({ mensaje: 'Error interno al obtener los moratorios.' });
  }
};

// ----------------------------------------------------------------
// Calcular moratorio del mes actual
// POST /api/prestamos/:id/moratorios/calcular
// ----------------------------------------------------------------
export const calcularMoratorio = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const prestamoResult = await pool.query(
      'SELECT id, saldo_pendiente, tasa_moratoria_mensual FROM prestamos WHERE id = $1',
      [id]
    );

    if (prestamoResult.rowCount === 0) {
      res.status(404).json({ mensaje: 'Préstamo no encontrado.' });
      return;
    }

    const prestamo = prestamoResult.rows[0];
    const saldo    = parseFloat(prestamo.saldo_pendiente);
    const tasa     = parseFloat(prestamo.tasa_moratoria_mensual);

    if (tasa <= 0) {
      res.status(400).json({ mensaje: 'Este préstamo no tiene tasa moratoria configurada.' });
      return;
    }

    const ahora    = new Date();
    const mes      = ahora.getMonth() + 1;
    const anio     = ahora.getFullYear();
    const monto    = parseFloat((saldo * (tasa / 100)).toFixed(2));

    // Evitar calcular dos veces el mismo mes
    const yaExiste = await pool.query(
      `SELECT id FROM moratorios_prestamo
       WHERE prestamo_id = $1 AND mes_atraso = $2 AND anio_atraso = $3`,
      [id, mes, anio]
    );

    if (yaExiste.rowCount! > 0) {
      res.status(409).json({ mensaje: 'Ya existe un moratorio calculado para este mes.' });
      return;
    }

    const resultado = await pool.query(
      `INSERT INTO moratorios_prestamo
         (prestamo_id, monto_calculado, mes_atraso, anio_atraso)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, monto, mes, anio]
    );

    res.status(201).json({
      mensaje: 'Moratorio calculado correctamente.',
      moratorio: resultado.rows[0],
    });
  } catch (error) {
    console.error('Error al calcular moratorio:', error);
    res.status(500).json({ mensaje: 'Error interno al calcular el moratorio.' });
  }
};

// ----------------------------------------------------------------
// Perdonar moratorio — solo administrador
// PATCH /api/moratorios/:id/perdonar
// ----------------------------------------------------------------
export const perdonarMoratorio = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const perdonado_por = req.usuario?.userId;

    const existe = await pool.query(
      'SELECT id, perdonado FROM moratorios_prestamo WHERE id = $1',
      [id]
    );

    if (existe.rowCount === 0) {
      res.status(404).json({ mensaje: 'Moratorio no encontrado.' });
      return;
    }

    if (existe.rows[0].perdonado) {
      res.status(409).json({ mensaje: 'Este moratorio ya fue perdonado.' });
      return;
    }

    const resultado = await pool.query(
      `UPDATE moratorios_prestamo
       SET perdonado      = true,
           monto_perdonado = monto_calculado,
           perdonado_por  = $1,
           fecha_perdon   = NOW()
       WHERE id = $2
       RETURNING *`,
      [perdonado_por || null, id]
    );

    res.json({
      mensaje: 'Moratorio perdonado correctamente.',
      moratorio: resultado.rows[0],
    });
  } catch (error) {
    console.error('Error al perdonar moratorio:', error);
    res.status(500).json({ mensaje: 'Error interno al perdonar el moratorio.' });
  }
};

// ================================================================
// ARCHIVOS BINARIOS (PDF en BYTEA)
// ================================================================

// ----------------------------------------------------------------
// Subir archivo PDF — POST /api/prestamos/:id/archivos/:tipo
// ----------------------------------------------------------------
export const subirArchivo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, tipo } = req.params;
    const registrado_por = req.usuario?.userId;
    const file = (req as Request & { file?: Express.Multer.File }).file;

    if (!file) {
      res.status(400).json({ mensaje: 'No se recibió ningún archivo PDF.' });
      return;
    }
    if (!TIPOS_ARCHIVO_VALIDOS.includes(tipo as TipoArchivoPrestamo)) {
      res.status(400).json({ mensaje: `Tipo '${tipo}' no válido.`, validos: TIPOS_ARCHIVO_VALIDOS });
      return;
    }

    const prestamoRow = await pool.query(
      'SELECT id, tipo_garantia FROM prestamos WHERE id = $1', [id]
    );
    if (prestamoRow.rowCount === 0) {
      res.status(404).json({ mensaje: 'Préstamo no encontrado.' });
      return;
    }

    const tipoGarantiaArchivo = prestamoRow.rows[0].tipo_garantia as string;
    const requeridos = archivosRequeridosPorTipo(tipoGarantiaArchivo);

    await pool.query(
      `INSERT INTO archivos_prestamo
         (prestamo_id, tipo, nombre_original, mime_type, contenido, tamano_bytes, registrado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (prestamo_id, tipo) DO UPDATE SET
         nombre_original = EXCLUDED.nombre_original,
         mime_type       = EXCLUDED.mime_type,
         contenido       = EXCLUDED.contenido,
         tamano_bytes    = EXCLUDED.tamano_bytes,
         fecha_registro  = NOW()`,
      [id, tipo, file.originalname, file.mimetype, file.buffer, file.size, registrado_por || null]
    );

    // Activar préstamo si ya tiene todos los archivos requeridos para su tipo de garantía
    const conteoResult = await pool.query(
      `SELECT COUNT(*) AS total FROM archivos_prestamo
       WHERE prestamo_id = $1 AND tipo = ANY($2::text[])`,
      [id, requeridos]
    );
    const totalArchivos = parseInt(conteoResult.rows[0].total, 10);
    if (totalArchivos >= requeridos.length) {
      await pool.query(
        `UPDATE prestamos SET estatus = 'activo', fecha_actualizacion = NOW()
         WHERE id = $1 AND estatus = 'documentos_incompletos'`,
        [id]
      );
    }

    res.json({ mensaje: 'Archivo guardado correctamente.', tipo, nombre: file.originalname });
  } catch (error) {
    console.error('Error al subir archivo:', error);
    res.status(500).json({ mensaje: 'Error interno al guardar el archivo.' });
  }
};

// ----------------------------------------------------------------
// Descargar / previsualizar archivo — GET /api/prestamos/:id/archivos/:tipo
// ----------------------------------------------------------------
export const descargarArchivo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, tipo } = req.params;

    const resultado = await pool.query(
      `SELECT contenido, nombre_original, mime_type
       FROM archivos_prestamo
       WHERE prestamo_id = $1 AND tipo = $2`,
      [id, tipo]
    );

    if (resultado.rowCount === 0) {
      res.status(404).json({ mensaje: 'Archivo no encontrado.' });
      return;
    }

    const { contenido, nombre_original, mime_type } = resultado.rows[0];
    res.setHeader('Content-Type', mime_type || 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${nombre_original || tipo + '.pdf'}"`
    );
    res.send(contenido);
  } catch (error) {
    console.error('Error al descargar archivo:', error);
    res.status(500).json({ mensaje: 'Error interno al obtener el archivo.' });
  }
};

// ----------------------------------------------------------------
// Listar metadatos de archivos (sin binario) — GET /api/prestamos/:id/archivos
// ----------------------------------------------------------------
export const listarArchivos = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const resultado = await pool.query(
      `SELECT id, prestamo_id, tipo, nombre_original, tamano_bytes, fecha_registro
       FROM archivos_prestamo
       WHERE prestamo_id = $1
       ORDER BY tipo`,
      [id]
    );

    res.json(resultado.rows);
  } catch (error) {
    console.error('Error al listar archivos:', error);
    res.status(500).json({ mensaje: 'Error interno al listar los archivos.' });
  }
};

// ================================================================
// DOCUMENTOS
// ================================================================

// ----------------------------------------------------------------
// Actualizar checklist de documentos
// PUT /api/prestamos/:id/documentos
// ----------------------------------------------------------------
export const actualizarDocumentos = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const registrado_por = req.usuario?.userId;
    const { documentos }: ActualizarDocumentosDto = req.body;

    if (!Array.isArray(documentos)) {
      res.status(400).json({ mensaje: 'El campo documentos debe ser un arreglo.' });
      return;
    }

    const existe = await pool.query('SELECT id FROM prestamos WHERE id = $1', [id]);
    if (existe.rowCount === 0) {
      res.status(404).json({ mensaje: 'Préstamo no encontrado.' });
      return;
    }

    const tiposValidos: TipoDocumentoPrestamo[] = [
      'constancia_no_adeudo', 'predial', 'titulo_propiedad', 'escrituras',
      'ine', 'comprobante_domicilio', 'curp', 'constancia_fiscal',
      'acta_nacimiento', 'acta_matrimonio', 'contrato',
    ];

    for (const doc of documentos) {
      if (!tiposValidos.includes(doc.tipo)) continue;

      // Upsert por tipo
      await pool.query(
        `INSERT INTO documentos_prestamo
           (prestamo_id, tipo, entregado, digitalizado, url_archivo, registrado_por)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (prestamo_id, tipo) DO UPDATE SET
           entregado    = EXCLUDED.entregado,
           digitalizado = EXCLUDED.digitalizado,
           url_archivo  = EXCLUDED.url_archivo`,
        [
          id,
          doc.tipo,
          doc.entregado   ?? false,
          doc.digitalizado ?? false,
          doc.url_archivo?.trim() || null,
          registrado_por || null,
        ]
      );
    }

    const actualizados = await pool.query(
      'SELECT * FROM documentos_prestamo WHERE prestamo_id = $1 ORDER BY tipo',
      [id]
    );

    res.json({
      mensaje: 'Documentos actualizados correctamente.',
      documentos: actualizados.rows,
    });
  } catch (error) {
    console.error('Error al actualizar documentos:', error);
    res.status(500).json({ mensaje: 'Error interno al actualizar los documentos.' });
  }
};
