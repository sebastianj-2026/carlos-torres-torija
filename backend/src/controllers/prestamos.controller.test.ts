/**
 * Unit tests for prestamos.controller money math with a mocked pg pool.
 * M40: interest, moratorio and balances are half-up exact cents
 * (docs/DINERO.md D1, cases C2/C3) — never toFixed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('../config/database', () => ({
  default: { query: vi.fn(), connect: vi.fn() },
}));

import pool from '../config/database';
import { calcularMoratorio, registrarPago, renovarPrestamo } from './prestamos.controller';

const mockQuery = pool.query as unknown as ReturnType<typeof vi.fn>;
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

beforeEach(() => { mockQuery.mockReset(); mockConnect.mockReset(); });

describe('calcularMoratorio — half-up (D1, C3)', () => {
  it('saldo 100.50 × moratoria 1.00% = 1.005 → inserta 1.01 (toFixed daba 1.00)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'p1', saldo_pendiente: '100.50', tasa_moratoria_mensual: '1.00' }] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })          // no existe este mes
      .mockResolvedValueOnce({ rows: [{ id: 'm1', monto_calculado: '1.01' }] }); // INSERT
    const res = mkRes();
    await calcularMoratorio(mkReq(), res);

    const insert = mockQuery.mock.calls.find((c) => String(c[0]).includes('INSERT INTO moratorios_prestamo'));
    expect(insert?.[1]?.[1]).toBe('1.01');
    expect(res.statusCode).toBe(201);
  });
});

describe('registrarPago — saldos y proyección exactos', () => {
  const mkCliente = (prestamoRow: Record<string, unknown>) => {
    const cliente = { query: vi.fn(), release: vi.fn() };
    cliente.query.mockImplementation((sql: string) => {
      const s = String(sql);
      if (s.includes('FROM prestamos'))   return Promise.resolve({ rowCount: 1, rows: [prestamoRow] });
      if (s.includes('INSERT INTO historial_pagos_prestamo')) return Promise.resolve({ rows: [{ id: 'pg1' }] });
      return Promise.resolve({ rowCount: 1, rows: [] });
    });
    mockConnect.mockResolvedValueOnce(cliente);
    return cliente;
  };

  it('abono a capital deja el saldo como string exacto de 2 decimales', async () => {
    const cliente = mkCliente({ id: 'p1', saldo_pendiente: '100.10', tasa_interes_mensual: '1.00', estatus: 'activo' });
    const res = mkRes();
    await registrarPago(mkReq({ body: { tipo_pago: 'capital', monto: 100.09 } }), res);

    const update = cliente.query.mock.calls.find((c) => String(c[0]).includes('UPDATE prestamos'));
    expect(update?.[1]?.[0]).toBe('0.01');
    expect((res.body as { saldo_pendiente_nuevo: number }).saldo_pendiente_nuevo).toBe(0.01);
  });

  it('interés mensual proyectado half-up: 100.50 × 1.00% → 1.01 (C3)', async () => {
    mkCliente({ id: 'p1', saldo_pendiente: '100.50', tasa_interes_mensual: '1.00', estatus: 'activo' });
    const res = mkRes();
    await registrarPago(mkReq({ body: { tipo_pago: 'interes', monto: 1.01 } }), res);
    expect((res.body as { interes_mensual_calculado: number }).interes_mensual_calculado).toBe(1.01);
  });

  it('400 con monto de más de 2 decimales', async () => {
    const res = mkRes();
    await registrarPago(mkReq({ body: { tipo_pago: 'interes', monto: 10.005 } }), res);
    expect(res.statusCode).toBe(400);
    expect(mockConnect).not.toHaveBeenCalled();
  });
});

describe('renovarPrestamo — interés anticipado half-up (D1, C3)', () => {
  it('monto 100.50 × 1.00% → anticipado 1.01, entregado 99.49', async () => {
    const cliente = { query: vi.fn(), release: vi.fn() };
    cliente.query.mockImplementation((sql: string) => {
      const s = String(sql);
      if (s.includes('SELECT * FROM prestamos')) {
        return Promise.resolve({ rowCount: 1, rows: [{ id: 'p1', cliente_id: 'c1', valor_propiedad: null, tasa_moratoria_mensual: '0.00', notaria: null }] });
      }
      if (s.includes('INSERT INTO prestamos')) return Promise.resolve({ rows: [{ id: 'p2', folio: 'PREST-X' }] });
      return Promise.resolve({ rowCount: 1, rows: [] });
    });
    mockConnect.mockResolvedValueOnce(cliente);
    mockQuery.mockResolvedValue({ rows: [{ count: '0' }] }); // generarFolio

    const res = mkRes();
    await renovarPrestamo(mkReq({
      body: {
        monto_prestado: 100.50, tasa_interes_mensual: 1.00,
        plazo_meses: 12, fecha_inicio: '2026-09-11',
      },
    }), res);

    const insert = cliente.query.mock.calls.find((c) => String(c[0]).includes('INSERT INTO prestamos'));
    expect(insert?.[1]?.[7]).toBe('1.01');   // $8 interes_anticipado (toFixed daba 1.00)
    expect(insert?.[1]?.[8]).toBe('99.49');  // $9 cantidad_entregada
  });
});
