/**
 * Characterization tests for dashboard.controller display aggregates
 * (M43c, docs/DINERO.md D4): every total must equal the exact sum of its
 * rows — computed in cents, never float + toFixed. Ratios (ocupación,
 * cobranza, morosidad) are not money and keep float + toFixed(1).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('../config/database', () => ({
  default: { query: vi.fn(), connect: vi.fn() },
}));

import pool from '../config/database';
import { getKpis, getBossKpis, getAnalytics } from './dashboard.controller';

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

// Every scalar a dashboard query might read, as pg would return it (NUMERIC → string)
const FILA_CERO = {
  liquidez_total: '0.00', pendiente_cobro: '0.00', pasivo_total: '0.00', contratos_por_vencer: 0,
  vencido: '0.00', total_exigible: '0.00', dinero_total: '0.00',
  total: '0.00', rentas: '0.00', estacionamiento: '0.00', cancha: '0.00', prestamos: '0.00',
  total_egresos_op: '0.10', costo_nomina: '0.20', pago_creditos_mes: '0.30',
  juicios_count: 0, dinero_congelado: '0.00', monto_urgente: '0.00', count_urgente: 0,
  rentas_propias: '0.10', rentas_externas: '0.20', otros: '0.30',
  rentas_cobradas: '0.00', rentas_esperadas: '0.00', intereses_cobrados: '0.60', intereses_esperados: '0.00',
};

describe('getKpis — totales del mes exactos (D4)', () => {
  it('ingresos 0.10+0.20+0.30 = 0.60, egresos 0.10+0.20 = 0.30, utilidad 0.30', async () => {
    mockQuery.mockImplementation((sql: string) => {
      const s = String(sql);
      if (s.includes('GROUP BY origen')) {
        return Promise.resolve({ rows: [
          { origen: 'Inmueble', total: '0.10' }, { origen: 'Cancha', total: '0.20' }, { origen: 'Prestamo', total: '0.30' },
        ] });
      }
      if (s.includes('UNION ALL')) {
        return Promise.resolve({ rows: [{ centro_costo: 'Oficina', total: '0.10' }, { centro_costo: 'Extras', total: '0.20' }] });
      }
      return Promise.resolve({ rows: [FILA_CERO] });
    });
    const res = mkRes();
    await getKpis(mkReq(), res);
    const b = res.body as { total_ingresos: number; total_egresos: number; utilidad_neta: number };
    expect(b.total_ingresos).toBe(0.6);
    expect(b.total_egresos).toBe(0.3);
    expect(b.utilidad_neta).toBe(0.3);
  });
});

describe('getBossKpis — salidas y utilidad exactas (D4)', () => {
  it('salidas 0.10+0.20+0.30 = 0.60; utilidad = ingresos − salidas', async () => {
    mockQuery.mockImplementation(() => Promise.resolve({ rows: [{ ...FILA_CERO, total: '1.00' }] }));
    const res = mkRes();
    await getBossKpis(mkReq(), res);
    const b = res.body as { bloque2: { total_salidas: number; utilidad_neta: number } };
    expect(b.bloque2.total_salidas).toBe(0.6);
    expect(b.bloque2.utilidad_neta).toBe(0.4);
  });
});

describe('getAnalytics — bloques exactos (D4)', () => {
  it('total_ingresos, total_egresos, utilidad y capital_atorado al centavo', async () => {
    mockQuery.mockImplementation((sql: string) => {
      const s = String(sql);
      if (s.includes('SELECT categoria')) {
        return Promise.resolve({ rows: [{ categoria: 'Oficina', monto: '0.10' }, { categoria: 'Inversionistas', monto: '0.20' }] });
      }
      if (s.includes('FROM   juicios j')) {
        return Promise.resolve({ rows: [
          { id: 'j1', cliente_nombre: 'A', etapa_procesal: 'x', saldo_pendiente: '0.10', notas: null },
          { id: 'j2', cliente_nombre: 'B', etapa_procesal: 'x', saldo_pendiente: '0.20', notas: null },
          { id: 'j3', cliente_nombre: 'C', etapa_procesal: 'x', saldo_pendiente: '0.30', notas: null },
        ] });
      }
      if (s.includes('LIMIT 5')) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [FILA_CERO] });
    });
    const res = mkRes();
    await getAnalytics(mkReq(), res);
    const b = res.body as {
      bloque_a: { total_ingresos: number; total_egresos: number; utilidad_mensual: number };
      bloque_e: { utilidad_oficina_inversion: number };
      bloque_f: { capital_atorado: number };
    };
    expect(b.bloque_a.total_ingresos).toBe(0.6);   // 0.10 + 0.20 + 0 + 0 + 0 + 0.30
    expect(b.bloque_a.total_egresos).toBe(0.3);
    expect(b.bloque_a.utilidad_mensual).toBe(0.3);
    expect(b.bloque_e.utilidad_oficina_inversion).toBe(0.4); // 0.60 − 0.20
    expect(b.bloque_f.capital_atorado).toBe(0.6);
  });
});
