/**
 * Unit tests for inversionistas.controller money math with a mocked pg pool.
 * M41: interest on capitalisation is half-up (docs/DINERO.md D1, C3), balances
 * are exact cent strings, and DTO amounts are never rounded (>2 decimals → 400).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('../config/database', () => ({
  default: { query: vi.fn(), connect: vi.fn() },
}));

import pool from '../config/database';
import { registrarMovimiento, transferirAOficina } from './inversionistas.controller';

const mockQuery = pool.query as unknown as ReturnType<typeof vi.fn>;
const mockConnect = pool.connect as unknown as ReturnType<typeof vi.fn>;

const mkReq = (over: Record<string, unknown> = {}): Request =>
  ({ query: {}, params: { id: 'i1' }, body: {}, usuario: { userId: 'admin-1' }, ...over } as unknown as Request);

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

describe('registrarMovimiento — interés y saldo exactos', () => {
  const mkInversion = (row: Record<string, unknown>) => {
    mockQuery.mockImplementation((sql: string) => {
      const s = String(sql);
      if (s.includes('FROM inversiones')) return Promise.resolve({ rowCount: 1, rows: [{ id: 'i1', estatus: 'activo', ...row }] });
      if (s.includes('INSERT INTO historial_inversiones')) return Promise.resolve({ rows: [{ id: 'h1' }] });
      return Promise.resolve({ rowCount: 1, rows: [] });
    });
  };

  it('interés calculado half-up: 100.50 × 1.00% → 1.01 (C3)', async () => {
    mkInversion({ monto_actual: '100.50', tasa_interes_mensual: '1.00' });
    const res = mkRes();
    await registrarMovimiento(mkReq({ body: { tipo: 'pago_interes', monto: 1.01 } }), res);
    expect(res.statusCode).toBe(201);
    expect((res.body as { monto_interes_calculado: number }).monto_interes_calculado).toBe(1.01);
  });

  it('aporte 0.20 sobre 100.10 deja monto_actual como string exacto 100.30', async () => {
    mkInversion({ monto_actual: '100.10', tasa_interes_mensual: '1.00' });
    const res = mkRes();
    await registrarMovimiento(mkReq({ body: { tipo: 'aporte_capital', monto: 0.2 } }), res);

    const update = mockQuery.mock.calls.find((c) => String(c[0]).includes('UPDATE inversiones'));
    expect(update?.[1]?.[0]).toBe('100.30');
    expect((res.body as { monto_actual_nuevo: number }).monto_actual_nuevo).toBe(100.3);
  });

  it('400 con monto de más de 2 decimales, sin INSERT', async () => {
    mkInversion({ monto_actual: '100.10', tasa_interes_mensual: '1.00' });
    const res = mkRes();
    await registrarMovimiento(mkReq({ body: { tipo: 'aporte_capital', monto: 10.005 } }), res);
    expect(res.statusCode).toBe(400);
    expect(mockQuery.mock.calls.some((c) => String(c[0]).includes('INSERT'))).toBe(false);
  });
});

describe('transferirAOficina — comparación exacta al centavo', () => {
  it('400 cuando el monto excede el disponible por un centavo (fuera el épsilon 0.009)', async () => {
    const cliente = { query: vi.fn(), release: vi.fn() };
    cliente.query.mockImplementation((sql: string) => {
      const s = String(sql);
      if (s.includes('FROM inversionistas')) return Promise.resolve({ rowCount: 1, rows: [{ id: 'i1', capital_disponible: '100.00' }] });
      return Promise.resolve({ rowCount: 1, rows: [] });
    });
    mockConnect.mockResolvedValueOnce(cliente);
    const res = mkRes();
    await transferirAOficina(mkReq({ body: { monto: 100.01 } }), res);

    expect(res.statusCode).toBe(400);
    expect(cliente.query.mock.calls.some((c) => String(c[0]).includes('UPDATE inversionistas'))).toBe(false);
  });
});
