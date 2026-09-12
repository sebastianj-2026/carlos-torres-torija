/**
 * Unit tests for cobros.controller with a mocked pg pool.
 * M39: interest math is half-up exact cents (docs/DINERO.md D1/D2, C2/C3),
 * never toFixed. The recibo response keeps numbers at the edge; the DB
 * writes receive exact 2-decimal strings.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('../config/database', () => ({
  default: { query: vi.fn(), connect: vi.fn() },
}));

import pool from '../config/database';
import { registrarCobro } from './cobros.controller';

const mockConnect = pool.connect as unknown as ReturnType<typeof vi.fn>;

const mkReq = (over: Record<string, unknown> = {}): Request =>
  ({ query: {}, params: { id: 'p1' }, body: {}, usuario: { userId: 'admin-1' }, ...over } as unknown as Request);

const mkRes = () => {
  const res: { statusCode: number; body: unknown } & Partial<Response> = {
    statusCode: 200,
    body: null,
  };
  res.status = vi.fn((c: number) => { res.statusCode = c; return res as Response; }) as never;
  res.json = vi.fn((b: unknown) => { res.body = b; return res as Response; }) as never;
  return res as Response & { statusCode: number; body: never };
};

const prestamo = (over: Record<string, unknown> = {}) => ({
  id: 'p1', folio: 'F-001', cliente_nombre: 'María García',
  saldo_pendiente: '10001.00', tasa_interes_mensual: '1.75',
  ...over,
});

const mkCliente = (prestamoRow: Record<string, unknown>) => {
  const cliente = { query: vi.fn(), release: vi.fn() };
  cliente.query.mockImplementation((sql: string) => {
    if (String(sql).includes('FROM prestamos')) {
      return Promise.resolve({ rowCount: 1, rows: [prestamoRow] });
    }
    return Promise.resolve({ rowCount: 1, rows: [] });
  });
  mockConnect.mockResolvedValueOnce(cliente);
  return cliente;
};

beforeEach(() => { mockConnect.mockReset(); });

describe('registrarCobro — interés half-up (D1)', () => {
  it('C2: saldo 10001.00 × 1.75% = 175.0175 → interés sugerido 175.02', async () => {
    mkCliente(prestamo());
    const res = mkRes();
    await registrarCobro(mkReq({
      body: { interes_pagado: '175.02', forma_pago: 'efectivo', periodo_mes: 9, periodo_anio: 2026 },
    }), res);

    const { recibo } = res.body as { recibo: Record<string, number | string> };
    expect(recibo.interes_sugerido).toBe(175.02); // toFixed daba 175.01
    expect(recibo.faltante).toBe(0);
    expect(recibo.tipo_cobro).toBe('pago_total');
  });

  it('C3: saldo 100.50 × 1.00% = 1.005 → 1.01 (el empate que toFixed bajaba)', async () => {
    mkCliente(prestamo({ saldo_pendiente: '100.50', tasa_interes_mensual: '1.00' }));
    const res = mkRes();
    await registrarCobro(mkReq({
      body: { interes_pagado: '1.01', forma_pago: 'efectivo', periodo_mes: 9, periodo_anio: 2026 },
    }), res);

    const { recibo } = res.body as { recibo: Record<string, number> };
    expect(recibo.interes_sugerido).toBe(1.01); // (1.005).toFixed(2) === "1.00"
    expect(recibo.tipo_cobro).toBe('pago_total');
  });

  it('interés del próximo mes también half-up sobre el nuevo saldo', async () => {
    // saldo 10101.00 − abono 100.00 = 10001.00; × 1.75% → 175.02
    const cliente = mkCliente(prestamo({ saldo_pendiente: '10101.00' }));
    const res = mkRes();
    await registrarCobro(mkReq({
      body: {
        interes_pagado: '0', abono_capital: '100.00',
        forma_pago: 'efectivo', periodo_mes: 9, periodo_anio: 2026,
      },
    }), res);

    const { recibo } = res.body as { recibo: Record<string, number> };
    expect(recibo.nuevo_saldo).toBe(10001);
    expect(recibo.interes_proximo_mes).toBe(175.02);
    // el UPDATE del saldo va a la DB como string exacto de 2 decimales
    const update = cliente.query.mock.calls.find((c) => String(c[0]).includes('UPDATE prestamos'));
    expect(update?.[1]?.[0]).toBe('10001.00');
  });

  it('faltante exacto sin drift de float', async () => {
    mkCliente(prestamo({ saldo_pendiente: '10001.00' }));
    const res = mkRes();
    await registrarCobro(mkReq({
      body: { interes_pagado: '100.00', forma_pago: 'efectivo', periodo_mes: 9, periodo_anio: 2026 },
    }), res);

    const { recibo } = res.body as { recibo: Record<string, number | string> };
    expect(recibo.faltante).toBe(75.02); // 175.02 − 100.00
    expect(recibo.tipo_cobro).toBe('pago_parcial');
  });

  it('400 con monto de más de 2 decimales (dinero plano, D1)', async () => {
    const res = mkRes();
    await registrarCobro(mkReq({
      body: { interes_pagado: '10.005', forma_pago: 'efectivo', periodo_mes: 9, periodo_anio: 2026 },
    }), res);
    expect(res.statusCode).toBe(400);
  });

  it('400 si el abono supera el saldo (comparación exacta)', async () => {
    mkCliente(prestamo({ saldo_pendiente: '100.00' }));
    const res = mkRes();
    await registrarCobro(mkReq({
      body: {
        interes_pagado: '0', abono_capital: '100.01',
        forma_pago: 'efectivo', periodo_mes: 9, periodo_anio: 2026,
      },
    }), res);
    expect(res.statusCode).toBe(400);
  });
});
