/**
 * Unit tests for pagos_devengo.controller with a mocked pg pool.
 * Business rules covered: line grouping (R16) with exact BigInt totals (M16),
 * R19 (comprobante + autorización obligatorios), pago_cuenta_coherente mirror,
 * excess amount rejected with exact leftover (R16/R22), transactional
 * all-or-nothing with the real FIFO engine (R15).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('../config/database', () => ({
  default: { query: vi.fn(), connect: vi.fn() },
}));

import pool from '../config/database';
import { listarPendientes, registrarPago } from './pagos_devengo.controller';

const mockQuery = pool.query as unknown as ReturnType<typeof vi.fn>;
const mockConnect = pool.connect as unknown as ReturnType<typeof vi.fn>;

const UUID_BEN = '11111111-2222-4333-8444-555555555555';
const UUID_ORI = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

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

// Fila de devengo como la devuelve el SELECT de pendientes
const fila = (over: Record<string, unknown>) => ({
  id: 'd1', inversionista_id: null, referenciador_id: UUID_BEN,
  concepto: 'comision', origen_tipo: 'prestamo', origen_id: UUID_ORI,
  periodo_mes: 1, periodo_anio: 2026, base_capital: '100000.00', tasa: '0.50',
  monto_devengado: '500.00', monto_pagado: '0.00', estado: 'pendiente',
  pendiente: '500.00', beneficiario_nombre: 'Juan Pérez',
  ...over,
});

beforeEach(() => { mockQuery.mockReset(); mockConnect.mockReset(); });

describe('listarPendientes', () => {
  it('400 con concepto desconocido', async () => {
    const res = mkRes();
    await listarPendientes(mkReq({ query: { concepto: 'bono' } } as never), res);
    expect(res.statusCode).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('agrupa por línea (R16) y suma total_pendiente exacto en centavos (M16)', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        // línea A: mismo beneficiario+concepto+origen, dos periodos
        fila({ id: 'd1', periodo_mes: 1, pendiente: '0.10' }),
        fila({ id: 'd2', periodo_mes: 2, pendiente: '0.20' }),
        // línea B: otro origen del MISMO referenciador — no se mezcla
        fila({ id: 'd3', origen_id: '99999999-9999-4999-8999-999999999999', pendiente: '1000000.01' }),
      ],
    });
    const res = mkRes();
    await listarPendientes(mkReq(), res);

    const { lineas } = (res.body as { data: { lineas: Array<Record<string, unknown>> } }).data;
    expect(lineas).toHaveLength(2);
    // 0.10 + 0.20 = 0.30 exacto (con float saldría 0.30000000000000004)
    expect(lineas[0].total_pendiente).toBe('0.30');
    expect((lineas[0].devengos as unknown[]).length).toBe(2);
    expect(lineas[1].total_pendiente).toBe('1000000.01');
  });
});

describe('registrarPago — validación antes de tocar la DB', () => {
  const cuerpoValido = {
    referenciador_id: UUID_BEN, concepto: 'comision',
    origen_tipo: 'prestamo', origen_id: UUID_ORI, monto: '500.00',
    forma_pago: 'transferencia', numero_cuenta: '1234', banco: 'BBVA',
    url_comprobante: 'https://x/comp.pdf',
  };

  it('401 sin sesión (R19: quién autorizó es obligatorio)', async () => {
    const res = mkRes();
    await registrarPago(mkReq({ body: cuerpoValido, usuario: undefined }), res);
    expect(res.statusCode).toBe(401);
  });

  it('400 con dos beneficiarios a la vez (R16: la línea es de uno)', async () => {
    const res = mkRes();
    await registrarPago(mkReq({
      body: { ...cuerpoValido, inversionista_id: UUID_ORI },
    }), res);
    expect(res.statusCode).toBe(400);
  });

  it.each(['0', '0.00', '1.234', 'abc', 500])('400 con monto inválido %j', async (monto) => {
    const res = mkRes();
    await registrarPago(mkReq({ body: { ...cuerpoValido, monto } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('400 transferencia sin número de cuenta (pago_cuenta_coherente)', async () => {
    const res = mkRes();
    await registrarPago(mkReq({ body: { ...cuerpoValido, numero_cuenta: ' ' } }), res);
    expect(res.statusCode).toBe(400);
    expect((res.body as { error: string }).error).toMatch(/cuenta/);
  });

  it('400 sin comprobante (R19)', async () => {
    const res = mkRes();
    await registrarPago(mkReq({ body: { ...cuerpoValido, url_comprobante: '' } }), res);
    expect(res.statusCode).toBe(400);
    expect((res.body as { error: string }).error).toMatch(/comprobante/i);
    expect(mockConnect).not.toHaveBeenCalled();
  });
});

describe('registrarPago — transacción', () => {
  const cuerpoValido = {
    referenciador_id: UUID_BEN, concepto: 'comision',
    origen_tipo: 'prestamo', origen_id: UUID_ORI, monto: '500.00',
    forma_pago: 'efectivo', url_comprobante: 'https://x/comp.pdf',
  };

  const slot = (over: Record<string, unknown> = {}) => ({
    id: 'd1', concepto: 'comision', origen_tipo: 'prestamo', origen_id: UUID_ORI,
    periodo_mes: 1, periodo_anio: 2026,
    monto_devengado: '500.00', monto_pagado: '0.00',
    ...over,
  });

  const mkCliente = () => {
    const cliente = { query: vi.fn(), release: vi.fn() };
    mockConnect.mockResolvedValueOnce(cliente);
    return cliente;
  };

  it('monto que excede la línea → 400 con el sobrante exacto y ROLLBACK (R16/R22)', async () => {
    const cliente = mkCliente();
    cliente.query
      .mockResolvedValueOnce({})                                    // BEGIN
      .mockResolvedValueOnce({ rows: [slot()] })                    // FOR UPDATE
      .mockResolvedValue({});                                       // ROLLBACK
    const res = mkRes();
    await registrarPago(mkReq({ body: { ...cuerpoValido, monto: '500.01' } }), res);

    expect(res.statusCode).toBe(400);
    expect((res.body as { error: string }).error).toContain('$0.01');
    const sqls = cliente.query.mock.calls.map((c) => String(c[0]));
    expect(sqls).toContain('ROLLBACK');
    expect(sqls.join(' ')).not.toContain('INSERT');
    expect(cliente.release).toHaveBeenCalled();
  });

  it('pago exacto de dos periodos: FIFO real, INSERTs, UPDATEs y COMMIT', async () => {
    const cliente = mkCliente();
    cliente.query
      .mockResolvedValueOnce({})  // BEGIN
      .mockResolvedValueOnce({    // FOR UPDATE: dos periodos de la línea
        rows: [
          slot({ id: 'd1', periodo_mes: 1, monto_devengado: '300.00' }),
          slot({ id: 'd2', periodo_mes: 2, monto_devengado: '200.00' }),
        ],
      })
      .mockResolvedValueOnce({ rows: [{ id: 'pago-1' }] })  // INSERT pagos_devengo
      .mockResolvedValue({});                                // aplicaciones/updates/COMMIT
    const res = mkRes();
    await registrarPago(mkReq({ body: cuerpoValido }), res);

    expect(res.statusCode).toBe(201);
    const data = (res.body as { data: { aplicaciones: Array<Record<string, string>> } }).data;
    expect(data.aplicaciones).toEqual([
      { devengo_id: 'd1', monto: '300.00', estado_resultante: 'pagado' },
      { devengo_id: 'd2', monto: '200.00', estado_resultante: 'pagado' },
    ]);
    const sqls = cliente.query.mock.calls.map((c) => String(c[0]));
    expect(sqls.filter((s) => s.includes('INSERT INTO pago_aplicaciones'))).toHaveLength(2);
    expect(sqls.filter((s) => s.includes('UPDATE devengos'))).toHaveLength(2);
    expect(sqls).toContain('COMMIT');
    expect(cliente.release).toHaveBeenCalled();
  });

  it('línea sin devengos pendientes → 400 y ROLLBACK', async () => {
    const cliente = mkCliente();
    cliente.query
      .mockResolvedValueOnce({})            // BEGIN
      .mockResolvedValueOnce({ rows: [] })  // FOR UPDATE vacío
      .mockResolvedValue({});               // ROLLBACK
    const res = mkRes();
    await registrarPago(mkReq({ body: cuerpoValido }), res);
    expect(res.statusCode).toBe(400);
    expect(cliente.query.mock.calls.map((c) => String(c[0]))).toContain('ROLLBACK');
  });

  it('si la DB truena a mitad, hace ROLLBACK y responde 500', async () => {
    vi.spyOn(console, 'error').mockImplementationOnce(() => undefined);
    const cliente = mkCliente();
    cliente.query
      .mockResolvedValueOnce({})                         // BEGIN
      .mockResolvedValueOnce({ rows: [slot()] })         // FOR UPDATE
      .mockRejectedValueOnce(new Error('conexión rota')) // INSERT pago truena
      .mockResolvedValue({});                            // ROLLBACK
    const res = mkRes();
    await registrarPago(mkReq({ body: cuerpoValido }), res);

    expect(res.statusCode).toBe(500);
    expect(cliente.query.mock.calls.map((c) => String(c[0]))).toContain('ROLLBACK');
    expect(cliente.release).toHaveBeenCalled();
  });
});
