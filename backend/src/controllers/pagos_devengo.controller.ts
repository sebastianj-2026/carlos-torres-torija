import { Request, Response } from 'express';
import pool from '../config/database';

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
