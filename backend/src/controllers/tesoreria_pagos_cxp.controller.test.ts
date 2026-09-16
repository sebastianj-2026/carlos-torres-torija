/**
 * M43d — tesorería, pagos y cuentas por pagar: display exacto (D4) y
 * mensajes de error sin toFixed (D1). Entrada de dinero >2 decimales → 400.
 * Sums are characterization (green before and after); the 400s are new.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('../config/database', () => ({
  default: { query: vi.fn(), connect: vi.fn() },
}));

import pool from '../config/database';
import { deudaActivaCliente, registrarPago } from './pagos.controller';
import { resumenFlujoCaja, crearTraspaso } from './tesoreria.controller';
import { liquidarCuentaPagar } from './cuentas_pagar.controller';

const mockQuery = pool.query as unknown as ReturnType<typeof vi.fn>;
const mockConnect = pool.connect as unknown as ReturnType<typeof vi.fn>;

const mkReq = (over: Record<string, unknown> = {}): Request =>
  ({ query: {}, params: { id: 'x1', clienteId: 'c1' }, body: {}, usuario: { userId: 'admin-1', rol: 'admin' }, ...over } as unknown as Request);

const mkRes = () => {
  const res: { statusCode: number; body: unknown } & Partial<Response> = {
    statusCode: 200,
    body: null,
  };
  res.status = vi.fn((c: number) => { res.statusCode = c; return res as Response; }) as never;
  res.json = vi.fn((b: unknown) => { res.body = b; return res as Response; }) as never;
  return res as Response & { statusCode: number; body: never };
};

const mkCliente = (saldo: string) => {
  const cliente = { query: vi.fn(), release: vi.fn() };
  cliente.query.mockImplementation((sql: string) => {
    const s = String(sql);
    if (s.includes('FROM cuentas_bancarias')) return Promise.resolve({ rowCount: 1, rows: [{ saldo_actual: saldo }] });
    if (s.includes('FROM cuentas_pagar'))     return Promise.resolve({ rowCount: 1, rows: [{ id: 'x1', concepto: 'Luz', monto_estimado: '500.00', monto_pagado: '0.00', estatus: 'pendiente' }] });
    return Promise.resolve({ rowCount: 1, rows: [{ id: 'n' }] });
  });
  mockConnect.mockResolvedValue(cliente);
  return cliente;
};

beforeEach(() => { mockQuery.mockReset(); mockConnect.mockReset(); });

const tres = ['0.10', '0.20', '0.30'];

describe('pagos.deudaActivaCliente — total exacto (D4)', () => {
  it('0.10 + 0.20 + 0.30 = 0.60', async () => {
    mockQuery.mockResolvedValueOnce({ rows: tres.map((m, i) => ({ id: `p${i}`, folio: `F${i}`, saldo_pendiente: m, estatus: 'activo', fecha_proximo_pago: null })) });
    const res = mkRes();
    await deudaActivaCliente(mkReq(), res);
    const b = res.body as { total_prestamos: number; total_activo: number };
    expect(b.total_prestamos).toBe(0.6);
    expect(b.total_activo).toBe(0.6);
  });
});

describe('pagos.registrarPago — entrada sin redondear (D1)', () => {
  it('400 con monto_pagado de más de 2 decimales', async () => {
    const res = mkRes();
    await registrarPago(mkReq({ body: { modulo_origen: 'prestamo', referencia_id: 'r1', cliente_id: 'c1', monto_pagado: 10.005 } }), res);
    expect(res.statusCode).toBe(400);
    expect(mockConnect).not.toHaveBeenCalled();
  });
});

describe('tesoreria.resumenFlujoCaja — flujo neto e ingresos externos exactos (D4)', () => {
  it('entradas 0.30 − salidas 0.10 = 0.20; externos 0.10+0.20+0.30 = 0.60', async () => {
    mockQuery.mockImplementation((sql: string) => {
      const s = String(sql);
      if (s.includes('GROUP BY origen')) return Promise.resolve({ rows: tres.map((m, i) => ({ origen: `O${i}`, total: m, cantidad: 1 })) });
      if (s.includes('total_entradas'))  return Promise.resolve({ rows: [{ total_entradas: '0.30', total_salidas: '0.10', total_movimientos: 2 }] });
      return Promise.resolve({ rows: [] });
    });
    const res = mkRes();
    await resumenFlujoCaja(mkReq({ query: { mes: '3', anio: '2026' } }), res);
    const b = res.body as { flujo_neto: number; total_ingresos_externos: number };
    expect(b.flujo_neto).toBe(0.2);
    expect(b.total_ingresos_externos).toBe(0.6);
  });
});

describe('tesoreria.crearTraspaso — saldo exacto y mensaje sin toFixed', () => {
  it('400 "Saldo insuficiente" cuando excede por un centavo, con el saldo tal cual', async () => {
    mkCliente('100.00');
    const res = mkRes();
    await crearTraspaso(mkReq({ body: { monto: 100.01, cuenta_origen_id: 'a', cuenta_destino_id: 'b', concepto: 'x' } }), res);
    expect(res.statusCode).toBe(400);
    expect((res.body as { mensaje: string }).mensaje).toContain('100.00 MXN');
  });

  it('400 con monto de más de 2 decimales, sin tocar la DB', async () => {
    const res = mkRes();
    await crearTraspaso(mkReq({ body: { monto: 10.005, cuenta_origen_id: 'a', cuenta_destino_id: 'b' } }), res);
    expect(res.statusCode).toBe(400);
    expect(mockConnect).not.toHaveBeenCalled();
  });
});

describe('cuentas_pagar.liquidarCuentaPagar — saldo exacto y entrada sin redondear', () => {
  it('400 "Saldo insuficiente" con el saldo tal cual', async () => {
    mkCliente('100.00');
    const res = mkRes();
    await liquidarCuentaPagar(mkReq({ body: { monto_real: 100.01, quien_pago: 'Ana', fuente_fondos: 'cuenta_bancaria', cuenta_bancaria_id: 'a' } }), res);
    expect(res.statusCode).toBe(400);
    expect((res.body as { mensaje: string }).mensaje).toContain('100.00 MXN');
  });

  it('400 con monto_real de más de 2 decimales, sin tocar la DB', async () => {
    const res = mkRes();
    await liquidarCuentaPagar(mkReq({ body: { monto_real: 10.005, quien_pago: 'Ana', fuente_fondos: 'caja_chica' } }), res);
    expect(res.statusCode).toBe(400);
    expect(mockConnect).not.toHaveBeenCalled();
  });
});
