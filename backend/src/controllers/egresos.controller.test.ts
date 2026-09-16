/**
 * Unit tests for egresos.controller money math with a mocked pg pool.
 * M41: investor yields are half-up exact cents (docs/DINERO.md D1, C2/C3)
 * and DTO amounts are never rounded on input (>2 decimals → 400).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('../config/database', () => ({
  default: { query: vi.fn(), connect: vi.fn() },
}));

import pool from '../config/database';
import {
  generarRendimientosInversionistas,
  crearCuentaPorPagar,
  crearSerie,
} from './egresos.controller';

const mockQuery = pool.query as unknown as ReturnType<typeof vi.fn>;
const mockConnect = pool.connect as unknown as ReturnType<typeof vi.fn>;

const mkReq = (over: Record<string, unknown> = {}): Request =>
  ({ query: {}, params: {}, body: {}, usuario: { userId: 'admin-1' }, ...over } as unknown as Request);

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

describe('generarRendimientosInversionistas — rendimiento half-up (D1)', () => {
  const mkCliente = (inversion: Record<string, unknown>) => {
    const cliente = { query: vi.fn(), release: vi.fn() };
    cliente.query.mockImplementation((sql: string) => {
      const s = String(sql);
      if (s.includes('FROM categorias_egresos')) return Promise.resolve({ rowCount: 1, rows: [{ id: 'cat-1' }] });
      if (s.includes('FROM inversiones inv'))    return Promise.resolve({ rowCount: 1, rows: [inversion] });
      if (s.includes('SELECT id FROM cuentas_por_pagar')) return Promise.resolve({ rowCount: 0, rows: [] });
      return Promise.resolve({ rowCount: 1, rows: [] });
    });
    mockConnect.mockResolvedValueOnce(cliente);
    return cliente;
  };
  const base = { inversion_id: 'inv-1', dia_pago: '30', nombres: 'Ana', apellido_paterno: 'Pérez' };
  const insertDe = (cliente: { query: ReturnType<typeof vi.fn> }) =>
    cliente.query.mock.calls.find((c) => String(c[0]).includes('INSERT INTO cuentas_por_pagar'));

  it('100.50 × 1.00% = 1.005 → inserta 1.01 (C3; toFixed daba 1.00)', async () => {
    const cliente = mkCliente({ ...base, monto_actual: '100.50', tasa_interes_mensual: '1.00' });
    const res = mkRes();
    await generarRendimientosInversionistas(mkReq({ body: { mes: 3, anio: 2026 } }), res);

    expect(insertDe(cliente)?.[1]?.[2]).toBe('1.01');
    expect((res.body as { generados: number }).generados).toBe(1);
  });

  it('10001.00 × 1.75% = 175.0175 → inserta 175.02 (C2)', async () => {
    const cliente = mkCliente({ ...base, monto_actual: '10001.00', tasa_interes_mensual: '1.75' });
    await generarRendimientosInversionistas(mkReq({ body: { mes: 3, anio: 2026 } }), mkRes());
    expect(insertDe(cliente)?.[1]?.[2]).toBe('175.02');
  });

  it('tasa 0.00 → omitido, sin INSERT', async () => {
    const cliente = mkCliente({ ...base, monto_actual: '5000.00', tasa_interes_mensual: '0.00' });
    const res = mkRes();
    await generarRendimientosInversionistas(mkReq({ body: { mes: 3, anio: 2026 } }), res);
    expect(insertDe(cliente)).toBeUndefined();
    expect((res.body as { omitidos: number }).omitidos).toBe(1);
  });
});

describe('crearCuentaPorPagar — desglose sin redondear entrada', () => {
  it('400 con monto_capital de más de 2 decimales', async () => {
    const res = mkRes();
    await crearCuentaPorPagar(mkReq({ body: {
      categoria_id: 'cat-1', concepto: 'Pago', monto_total: 100, fecha_limite_pago: '2026-03-01',
      metodo_pago: 'efectivo', deuda_id: 'd-1',
      monto_capital: 10.005, monto_interes: 89.995, monto_iva: 0,
    } }), res);
    expect(res.statusCode).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });
});

describe('crearSerie — monto_por_cuota sin redondear entrada', () => {
  it('400 con monto_por_cuota de más de 2 decimales', async () => {
    const cliente = { query: vi.fn().mockResolvedValue({ rows: [] }), release: vi.fn() };
    mockConnect.mockResolvedValueOnce(cliente);
    const res = mkRes();
    await crearSerie(mkReq({ body: {
      categoria_id: 'cat-1', concepto: 'Renta', monto_por_cuota: 10.005, total_cuotas: 3,
      fecha_inicio: '2026-03-01', centro_costo: 'Oficina',
    } }), res);
    expect(res.statusCode).toBe(400);
    expect(cliente.query.mock.calls.some((c) => String(c[0]).includes('INSERT'))).toBe(false);
  });
});
