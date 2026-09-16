/**
 * Unit tests for nominas.controller money math with a mocked pg pool.
 * M42: payroll amounts are half-up with a SINGLE rounding at the end
 * (docs/DINERO.md D1/D2, cases C4/C5) — no toFixed(4) intermediate rate.
 * Note: the weekly base in code is 48 h (C4 in the doc illustrates with 40);
 * the base is a business rule and is NOT changed here — only the rounding.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('../config/database', () => ({
  default: { query: vi.fn(), connect: vi.fn() },
}));

import pool from '../config/database';
import { preCalculo, pagarNomina, pagarBase, costoReal } from './nominas.controller';

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

const empleado = (over: Record<string, unknown> = {}) => ({
  id: 'e1', nombre: 'Luis', puesto: 'Cajero', estatus: 'Activo',
  dias_vacaciones_totales: 6, dias_vacaciones_tomados: 0,
  cliente_id: null, cliente_nombre: null, activo_imss: false, monto_imss: '0.00',
  sueldo_semanal: '100.00', ...over,
});

beforeEach(() => { mockQuery.mockReset(); mockConnect.mockReset(); });

describe('preCalculo — tarifas y prima con un solo redondeo (D2)', () => {
  it('sueldo 120.24 ÷ 48 h = 2.505 → tarifa Normal 2.51 (C4 sobre base 48)', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [empleado({ sueldo_semanal: '120.24' })] });
    const res = mkRes();
    await preCalculo(mkReq({ query: { empleado_id: 'e1' } }), res);
    const t = (res.body as { calculo: { tarifas_hora_extra: Record<string, number> } }).calculo.tarifas_hora_extra;
    expect(t.Normal).toBe(2.51);
    expect(t.Doble).toBe(5.01);
    expect(t.Triple).toBe(7.52);
  });

  it('prima 3 días sobre 1000.00 = 125.00 exacto, sin redondear el intermedio (C5)', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [empleado({ sueldo_semanal: '1000.00', estatus: 'Vacaciones' })] });
    const res = mkRes();
    await preCalculo(mkReq({ query: { empleado_id: 'e1', dias_vacaciones: '3' } }), res);
    expect((res.body as { calculo: { prima_vacacional: number } }).calculo.prima_vacacional).toBe(125);
  });
});

describe('pagarNomina — montos half-up y total exacto', () => {
  const mkCliente = (emp: Record<string, unknown>, prestamo?: Record<string, unknown>) => {
    const cliente = { query: vi.fn(), release: vi.fn() };
    cliente.query.mockImplementation((sql: string) => {
      const s = String(sql);
      if (s.includes('FROM empleados'))  return Promise.resolve({ rowCount: 1, rows: [empleado(emp)] });
      if (s.includes('FROM prestamos'))  return Promise.resolve({ rowCount: prestamo ? 1 : 0, rows: prestamo ? [prestamo] : [] });
      if (s.includes('INSERT INTO nominas_pagadas')) return Promise.resolve({ rows: [{ id: 'n1' }] });
      return Promise.resolve({ rowCount: 1, rows: [] });
    });
    mockConnect.mockResolvedValueOnce(cliente);
    return cliente;
  };
  const insertNomina = (cliente: { query: ReturnType<typeof vi.fn> }) =>
    cliente.query.mock.calls.find((c) => String(c[0]).includes('INSERT INTO nominas_pagadas'))?.[1] as unknown[];
  const base = { empleado_id: 'e1', semana_inicio: '2026-03-02', semana_fin: '2026-03-08' };

  it('1 hora Normal sobre 120.24: 2.505 → 2.51 (C4), sin tarifa intermedia', async () => {
    const cliente = mkCliente({ sueldo_semanal: '120.24' });
    await pagarNomina(mkReq({ body: { ...base, horas_extras_cantidad: 1, tipo_hora_extra: 'Normal' } }), mkRes());
    expect(insertNomina(cliente)[6]).toBe('2.51');
  });

  it('horas fraccionarias: 1.50 h Doble sobre 480.00 = 30.00', async () => {
    const cliente = mkCliente({ sueldo_semanal: '480.00' });
    await pagarNomina(mkReq({ body: { ...base, horas_extras_cantidad: 1.5, tipo_hora_extra: 'Doble' } }), mkRes());
    expect(insertNomina(cliente)[6]).toBe('30.00');
  });

  it('1 falta sobre 600.09: 100.015 → 100.02 half-up (toFixed daba 100.01)', async () => {
    const cliente = mkCliente({ sueldo_semanal: '600.09' });
    await pagarNomina(mkReq({ body: { ...base, faltas_cantidad: 1 } }), mkRes());
    expect(insertNomina(cliente)[11]).toBe('100.02');
  });

  it('total queda como string exacto: 100.10 + bonos 0.20 → 100.30', async () => {
    const cliente = mkCliente({ sueldo_semanal: '100.10' });
    const res = mkRes();
    await pagarNomina(mkReq({ body: { ...base, bonos: 0.2 } }), res);
    expect(insertNomina(cliente)[15]).toBe('100.30');
    expect((res.body as { desglose: { total_pagado: number } }).desglose.total_pagado).toBe(100.3);
  });

  it('ajuste negativo sigue permitido: 100.10 − 5.50 → 94.60', async () => {
    const cliente = mkCliente({ sueldo_semanal: '100.10' });
    await pagarNomina(mkReq({ body: { ...base, ajuste_monto: -5.5, ajuste_concepto: 'anticipo' } }), mkRes());
    expect(insertNomina(cliente)[15]).toBe('94.60');
  });

  it('400 con override monto_horas_extras de más de 2 decimales', async () => {
    const cliente = mkCliente({ sueldo_semanal: '100.00' });
    const res = mkRes();
    await pagarNomina(mkReq({ body: { ...base, monto_horas_extras: 10.005 } }), res);
    expect(res.statusCode).toBe(400);
    expect(insertNomina(cliente)).toBeUndefined();
  });

  it('descuento de préstamo: saldo 100.10 − 0.30 → 99.80 exacto, historial con 0.30', async () => {
    const cliente = mkCliente({ sueldo_semanal: '500.00', cliente_id: 'c1' }, { id: 'p1', saldo_pendiente: '100.10' });
    await pagarNomina(mkReq({ body: { ...base, descuento_prestamo: 0.3 } }), mkRes());
    const up = cliente.query.mock.calls.find((c) => String(c[0]).includes('UPDATE prestamos'));
    expect(up?.[1]?.[0]).toBe('99.80');
    const hist = cliente.query.mock.calls.find((c) => String(c[0]).includes('INSERT INTO historial_pagos_prestamo'));
    expect(hist?.[1]?.[1]).toBe('0.30');
  });
});

describe('pagarBase — total exacto', () => {
  it('sueldo 100.10 − descuento 0.30 → total 99.80 string', async () => {
    const cliente = { query: vi.fn(), release: vi.fn() };
    cliente.query.mockImplementation((sql: string) => {
      const s = String(sql);
      if (s.includes('FROM empleados')) return Promise.resolve({ rowCount: 1, rows: [empleado({ sueldo_semanal: '100.10' })] });
      if (s.includes('INSERT INTO nominas_pagadas')) return Promise.resolve({ rows: [{ id: 'n1' }] });
      return Promise.resolve({ rowCount: 1, rows: [] });
    });
    mockConnect.mockResolvedValueOnce(cliente);
    await pagarBase(mkReq({ body: { empleado_id: 'e1', semana_inicio: '2026-03-02', semana_fin: '2026-03-08', descuento_prestamo: 0.3 } }), mkRes());
    const ins = cliente.query.mock.calls.find((c) => String(c[0]).includes('INSERT INTO nominas_pagadas'))?.[1] as unknown[];
    expect(ins[5]).toBe('99.80');
  });
});

describe('costoReal — costo_real es suma exacta (D4)', () => {
  it('0.10 + 0.20 = 0.30', async () => {
    mockQuery.mockImplementation((sql: string) => {
      const s = String(sql);
      if (s.includes('FROM empleados')) return Promise.resolve({ rows: [{ empleados_con_imss: '1', total_imss: '0.20' }] });
      if (s.includes('GROUP BY'))       return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [{ total_sueldos: '0.10', total_extras: '0', total_bonos: '0', total_primas: '0', total_faltas: '0', total_pagado: '0.10', registros: '1', empleados_distintos: '1' }] });
    });
    const res = mkRes();
    await costoReal(mkReq({ query: { mes: '3', anio: '2026' } }), res);
    expect((res.body as { costo_real: number }).costo_real).toBe(0.3);
  });
});
