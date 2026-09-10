import { Request, Response } from 'express';
import pool from '../config/database';
import { aplicarPagoFifo, DevengoSlot } from '../modules/motor/aplicacion';

const esUuid = (s: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

// Plain money: up to 2 decimals, > 0 (M16: string all the way)
const esMonto = (s: unknown): s is string =>
  typeof s === 'string' && /^\d+(\.\d{1,2})?$/.test(s.trim()) && s.trim() !== '0' && !/^0\.0?0?$/.test(s.trim());

// ================================================================
// PAGOS DE DEVENGOS — cuentas por pagar inversionistas/referenciadores
// M17: los pendientes aceptan concepto `comision` además de `rendimiento`.
// Una LÍNEA = beneficiario + concepto + origen (R16); dentro de la línea el
// periodo va FIFO (R15). Un pago cubre UN concepto, nunca se juntan (R17) —
// por eso la respuesta ya viene partida por línea. Registrar el pago (R19)
// llega en M19. Montos como string: el NUMERIC de pg no se toca (M16).
// ================================================================

// ----------------------------------------------------------------
// Pendientes agrupados por línea
// GET /api/pagos-devengo/pendientes
//   ?concepto=rendimiento|comision  (opcional; sin él van ambos, separados)
//   ?inversionista_id=... | ?referenciador_id=...  (opcional)
// ----------------------------------------------------------------
export const listarPendientes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { concepto, inversionista_id, referenciador_id } = req.query;

    if (concepto !== undefined && concepto !== 'rendimiento' && concepto !== 'comision') {
      res.status(400).json({ success: false, data: null, error: 'concepto debe ser rendimiento o comision.' });
      return;
    }

    const condiciones: string[] = [`d.estado IN ('pendiente', 'parcial')`];
    const params: string[] = [];
    if (concepto) {
      params.push(String(concepto));
      condiciones.push(`d.concepto = $${params.length}`);
    }
    if (inversionista_id) {
      params.push(String(inversionista_id));
      condiciones.push(`d.inversionista_id = $${params.length}`);
    }
    if (referenciador_id) {
      params.push(String(referenciador_id));
      condiciones.push(`d.referenciador_id = $${params.length}`);
    }

    const { rows } = await pool.query(
      `SELECT d.id, d.inversionista_id, d.referenciador_id, d.concepto,
              d.origen_tipo, d.origen_id, d.periodo_mes, d.periodo_anio,
              d.base_capital::text, d.tasa::text,
              d.monto_devengado::text, d.monto_pagado::text, d.estado,
              (d.monto_devengado - d.monto_pagado)::text AS pendiente,
              COALESCE(
                TRIM(i.nombres || ' ' || i.apellido_paterno),
                TRIM(r.nombres || ' ' || r.apellido_paterno)
              ) AS beneficiario_nombre
         FROM devengos d
         LEFT JOIN inversionistas i ON i.id = d.inversionista_id
         LEFT JOIN referenciadores r ON r.id = d.referenciador_id
        WHERE ${condiciones.join(' AND ')}
        ORDER BY COALESCE(d.inversionista_id, d.referenciador_id),
                 d.concepto, d.origen_tipo, d.origen_id,
                 d.periodo_anio, d.periodo_mes`,
      params,
    );

    // Group into lines; slot order inside each line is already FIFO (R15).
    interface Linea {
      beneficiario_tipo: 'inversionista' | 'referenciador';
      beneficiario_id: string;
      beneficiario_nombre: string;
      concepto: string;
      origen_tipo: string;
      origen_id: string;
      total_pendiente: string;
      devengos: typeof rows;
    }
    const lineas = new Map<string, Linea>();
    for (const d of rows) {
      const clave = `${d.inversionista_id ?? d.referenciador_id}|${d.concepto}|${d.origen_tipo}|${d.origen_id}`;
      let linea = lineas.get(clave);
      if (!linea) {
        linea = {
          beneficiario_tipo: d.inversionista_id ? 'inversionista' : 'referenciador',
          beneficiario_id: d.inversionista_id ?? d.referenciador_id,
          beneficiario_nombre: d.beneficiario_nombre,
          concepto: d.concepto,
          origen_tipo: d.origen_tipo,
          origen_id: d.origen_id,
          total_pendiente: '0.00',
          devengos: [],
        };
        lineas.set(clave, linea);
      }
      linea.devengos.push(d);
    }

    // Exact totals in integer cents — never floats (M16).
    const aCentavos = (s: string): bigint => {
      const [e, dec = ''] = s.split('.');
      return BigInt(e) * 100n + BigInt((dec + '00').slice(0, 2));
    };
    for (const linea of lineas.values()) {
      const total = linea.devengos.reduce((s, d) => s + aCentavos(d.pendiente), 0n);
      linea.total_pendiente = `${total / 100n}.${(total % 100n).toString().padStart(2, '0')}`;
    }

    res.json({ success: true, data: { lineas: [...lineas.values()] }, error: null });
  } catch (error) {
    console.error('Error al listar pendientes:', error);
    res.status(500).json({ success: false, data: null, error: 'Error interno al listar los pendientes.' });
  }
};

// ----------------------------------------------------------------
// Registrar pago de UNA línea (M19)
// POST /api/pagos-devengo
//   Aplica FIFO dentro de la línea (R15, el sistema decide el periodo),
//   nunca cruza líneas (R16), un concepto por pago (R17), comprobante y
//   autorización obligatorios (R19). Todo o nada: transacción.
// ----------------------------------------------------------------
export const registrarPago = async (req: Request, res: Response): Promise<void> => {
  const {
    inversionista_id, referenciador_id, concepto, origen_tipo, origen_id,
    monto, forma_pago, numero_cuenta, banco, url_comprobante, notas,
  } = req.body ?? {};

  const rechazo = (msg: string): void => {
    res.status(400).json({ success: false, data: null, error: msg });
  };

  // R19: quién autorizó queda registrado — el admin con sesión.
  const autorizadoPor = req.usuario?.userId;
  if (!autorizadoPor) {
    res.status(401).json({ success: false, data: null, error: 'Sesión no válida.' });
    return;
  }

  // Exactly one beneficiary, matching the line (R16/R17)
  const benInv = typeof inversionista_id === 'string' && inversionista_id.trim() !== '';
  const benRef = typeof referenciador_id === 'string' && referenciador_id.trim() !== '';
  if (benInv === benRef) { rechazo('Indica exactamente un beneficiario: inversionista_id o referenciador_id.'); return; }
  const beneficiarioId = (benInv ? inversionista_id : referenciador_id).trim();
  if (!esUuid(beneficiarioId)) { rechazo('El id del beneficiario no es un UUID válido.'); return; }

  if (concepto !== 'rendimiento' && concepto !== 'comision') { rechazo('concepto debe ser rendimiento o comision.'); return; }
  if (origen_tipo !== 'inversion' && origen_tipo !== 'prestamo') { rechazo('origen_tipo debe ser inversion o prestamo.'); return; }
  if (typeof origen_id !== 'string' || !esUuid(origen_id)) { rechazo('origen_id no es un UUID válido.'); return; }
  if (!esMonto(monto)) { rechazo('El monto debe ser un decimal mayor a cero con hasta 2 decimales.'); return; }
  if (forma_pago !== 'efectivo' && forma_pago !== 'transferencia' && forma_pago !== 'deposito') {
    rechazo('forma_pago debe ser efectivo, transferencia o deposito.'); return;
  }
  // Mirror of pago_cuenta_coherente: 400 legible en vez de 23514
  if (forma_pago !== 'efectivo' && !(typeof numero_cuenta === 'string' && numero_cuenta.trim())) {
    rechazo('Si el pago no fue en efectivo, el número de cuenta es obligatorio.'); return;
  }
  if (!(typeof url_comprobante === 'string' && url_comprobante.trim())) {
    rechazo('El comprobante es obligatorio (R19).'); return;
  }

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');

    // Lock the line's pending accruals; FIFO order comes from the engine.
    const campoBen = benInv ? 'inversionista_id' : 'referenciador_id';
    const { rows: slots } = await cliente.query<DevengoSlot>(
      `SELECT id, concepto, origen_tipo, origen_id, periodo_mes, periodo_anio,
              monto_devengado::text, monto_pagado::text
         FROM devengos
        WHERE ${campoBen} = $1 AND concepto = $2 AND origen_tipo = $3 AND origen_id = $4
          AND estado IN ('pendiente', 'parcial')
        FOR UPDATE`,
      [beneficiarioId, concepto, origen_tipo, origen_id],
    );
    if (slots.length === 0) {
      await cliente.query('ROLLBACK');
      rechazo('La línea no tiene devengos pendientes.'); return;
    }

    const resultado = aplicarPagoFifo(slots, String(monto).trim());
    if (resultado.sobrante !== '0.00') {
      await cliente.query('ROLLBACK');
      rechazo(`El monto excede el pendiente de la línea por $${resultado.sobrante}. ` +
              'El dinero de un origen no cubre lo de otro (R16): ajusta el monto.');
      return;
    }

    const pago = await cliente.query(
      `INSERT INTO pagos_devengo
         (inversionista_id, referenciador_id, concepto, monto, fecha_pago,
          forma_pago, numero_cuenta, banco, url_comprobante, autorizado_por, notas)
       VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [benInv ? beneficiarioId : null, benRef ? beneficiarioId : null, concepto,
       String(monto).trim(), forma_pago,
       numero_cuenta?.trim() || null, banco?.trim() || null,
       url_comprobante.trim(), autorizadoPor, notas?.trim() || null],
    );

    for (const ap of resultado.aplicaciones) {
      await cliente.query(
        `INSERT INTO pago_aplicaciones (pago_id, devengo_id, monto) VALUES ($1, $2, $3)`,
        [pago.rows[0].id, ap.devengo_id, ap.monto],
      );
      await cliente.query(
        `UPDATE devengos
            SET monto_pagado = monto_pagado + $1, estado = $2
          WHERE id = $3`,
        [ap.monto, ap.estado_resultante, ap.devengo_id],
      );
    }

    await cliente.query('COMMIT');
    res.status(201).json({
      success: true,
      data: { pago: pago.rows[0], aplicaciones: resultado.aplicaciones },
      error: null,
    });
  } catch (error) {
    await cliente.query('ROLLBACK').catch(() => undefined);
    console.error('Error al registrar pago:', error);
    res.status(500).json({ success: false, data: null, error: 'Error interno al registrar el pago.' });
  } finally {
    cliente.release();
  }
};
