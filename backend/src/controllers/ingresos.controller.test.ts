/**
 * Characterization tests for ingresos.controller display aggregates
 * (M43b, docs/DINERO.md D4): every total must equal the exact sum of its
 * rows — computed in cents, never float + toFixed. Written before the
 * refactor as a behaviour lock; the refactor must keep them green.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('../config/database', () => ({
  default: { query: vi.fn(), connect: vi.fn() },
}));

import pool from '../config/database';
import { dashboardCentral, cxcPrestamos, proyeccionCxCPrestamos } from './ingresos.controller';

const mockQuery = pool.query as unknown as ReturnType<typeof vi.fn>;

const mkReq = (over: Record<string, unknown> = {}): Request =>
  ({ query: { mes: '3', anio: '2026' }, params: {}, body: {}, usuario: { userId: 'admin-1' }, ...over } as unknown as Request);

const mkRes = () => {
  const res: { statusCode: number; body: unknown } & Partial<Response> = {
    statusCode: 200,
    body: null,
  };
  res.status = vi.fn((c: number) => { res.statusCode = c; return res as Response; }) as never;
  res.json = vi.fn((b: unknown) => { res.body = b; return res as Response; }) as never;
  return res as Response & { statusCode: number; body: never };
};

beforeEach(() => { mockQuery.mockReset(); });

// Three 2-decimal amounts whose float sum drifts (0.1 + 0.2 + 0.3 = 0.6000000000000001)
const tres = ['0.10', '0.20', '0.30'];

describe('cxcPrestamos — totales exactos (D4)', () => {
  it('suma de interés esperado, cobrado y pendiente al centavo', async () => {
    mockQuery.mockResolvedValueOnce({ rows: tres.map((m, i) => ({
      id: `p${i}`, folio: `F${i}`, cliente_id: 'c', cliente_nombre: 'X', monto_capital: '1000.00',
      monto_interes: m, dia_pago: 5, tasa_interes_mensual: '1.00', estatus: 'activo',
      ya_cobrado_interes: i === 0 ? '0.10' : '0.00', ya_cobrado_capital: '0.00',
    })) });
    const res = mkRes();
    await cxcPrestamos(mkReq(), res);
    const t = (res.body as { totales: Record<string, number> }).totales;
    expect(t.monto_interes_esperado).toBe(0.6);
    expect(t.ya_cobrado).toBe(0.1);
    expect(t.pendiente).toBe(0.5);
    expect(t.cobrados_completos).toBe(1);
  });

  it('pendiente nunca negativo: cobrado de más → 0', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{
      id: 'p1', folio: 'F1', cliente_id: 'c', cliente_nombre: 'X', monto_capital: '1000.00',
      monto_interes: '10.00', dia_pago: 5, tasa_interes_mensual: '1.00', estatus: 'activo',
      ya_cobrado_interes: '10.50', ya_cobrado_capital: '0.00',
    }] });
    const res = mkRes();
    await cxcPrestamos(mkReq(), res);
    const p = (res.body as { prestamos: Array<Record<string, unknown>> }).prestamos[0];
    expect(p.pendiente_interes).toBe(0);
    expect(p.cobrado_completo).toBe(true);
  });
});

describe('proyeccionCxCPrestamos — totales exactos (D4)', () => {
  it('suma esperado/cobrado/pendiente al centavo y clasifica', async () => {
    mockQuery.mockResolvedValueOnce({ rows: tres.map((m, i) => ({
      id: `p${i}`, folio: `F${i}`, cliente_id: 'c', cliente_nombre: 'X', capital_prestado: '1000.00',
      tasa_interes_mensual: '1.00', monto_interes: m, dia_pago: '5', estatus: 'activo',
      ya_cobrado_interes: i === 2 ? '0.30' : '0.00', obligacion_id: i === 1 ? 'o1' : null,
    })) });
    const res = mkRes();
    await proyeccionCxCPrestamos(mkReq(), res);
    const t = (res.body as { totales: Record<string, number> }).totales;
    expect(t.total_esperado).toBe(0.6);
    expect(t.total_cobrado).toBe(0.3);
    expect(t.total_pendiente).toBe(0.3);
    expect(t.cobrados).toBe(1);
    expect(t.pendientes).toBe(1);
    expect(t.por_generar).toBe(1);
  });
});

describe('dashboardCentral — estado de préstamos y cobrado exactos (D4)', () => {
  it('monto_esperado/pendiente son la suma exacta; cobrado.total suma por origen', async () => {
    mockQuery.mockImplementation((sql: string) => {
      const s = String(sql);
      if (s.includes('FROM prestamos p')) {
        return Promise.resolve({ rowCount: 3, rows: tres.map((m) => ({ interes_mensual: m, ya_cobrado: '0.00', dia_pago: 1 })) });
      }
      if (s.includes('AS utilidad')) {
        return Promise.resolve({ rowCount: 3, rows: tres.map((m, i) => ({ origen: `O${i}`, utilidad: m, capital: '0.00', total: m })) });
      }
      return Promise.resolve({ rowCount: 0, rows: [] });
    });
    const res = mkRes();
    await dashboardCentral(mkReq(), res);
    const b = res.body as { cobrado: Record<string, number>; estado_mes: { prestamos: Record<string, number>; gran_total_esperado: number; gran_total_pendiente: number } };
    expect(b.cobrado.total).toBe(0.6);
    expect(b.cobrado.utilidad).toBe(0.6);
    expect(b.estado_mes.prestamos.monto_esperado).toBe(0.6);
    expect(b.estado_mes.prestamos.monto_pendiente).toBe(0.6);
    expect(b.estado_mes.prestamos.count_pendientes).toBe(3);
    expect(b.estado_mes.gran_total_esperado).toBe(0.6);
    expect(b.estado_mes.gran_total_pendiente).toBe(0.6);
  });
});
