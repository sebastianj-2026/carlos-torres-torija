/**
 * Unit tests for referenciadores.controller with a mocked pg pool.
 * Business rules covered: forma 2/3 filter (M3), envelope contract,
 * P6 (baja = activo=false, never DELETE), 404s, input trimming.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('../config/database', () => ({
  default: { query: vi.fn(), connect: vi.fn() },
}));

import pool from '../config/database';
import {
  listarReferenciadores,
  obtenerReferenciador,
  crearReferenciador,
  editarReferenciador,
} from './referenciadores.controller';

const mockQuery = pool.query as unknown as ReturnType<typeof vi.fn>;

const mkReq = (over: Partial<Request> = {}): Request =>
  ({ query: {}, params: {}, body: {}, ...over } as unknown as Request);

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

describe('listarReferenciadores', () => {
  it('filtra forma=3 (sin capital) con inversionista_id IS NULL', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'x', forma: 3 }] });
    const res = mkRes();
    await listarReferenciadores(mkReq({ query: { forma: '3' } } as never), res);

    expect(mockQuery.mock.calls[0][0]).toContain('inversionista_id IS NULL');
    expect(mockQuery.mock.calls[1][0]).toContain('inversionista_id IS NULL');
    expect(res.body).toMatchObject({
      success: true,
      error: null,
      data: { total: 1, pagina: 1, limite: 20, totalPaginas: 1 },
    });
  });

  it('escapa wildcards de ILIKE en la búsqueda', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [] });
    await listarReferenciadores(mkReq({ query: { buscar: '50%_a' } } as never), mkRes());
    expect(mockQuery.mock.calls[0][1][0]).toBe('%50\\%\\_a%');
  });

  it('responde 500 con envelope si la DB truena', async () => {
    vi.spyOn(console, 'error').mockImplementationOnce(() => undefined);
    mockQuery.mockRejectedValueOnce(new Error('boom'));
    const res = mkRes();
    await listarReferenciadores(mkReq(), res);
    expect(res.statusCode).toBe(500);
    expect(res.body).toMatchObject({ success: false, data: null });
  });
});

describe('obtenerReferenciador', () => {
  it('404 si no existe', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const res = mkRes();
    await obtenerReferenciador(mkReq({ params: { id: 'nope' } } as never), res);
    expect(res.statusCode).toBe(404);
    expect(res.body).toMatchObject({ success: false, data: null });
  });

  it('devuelve detalle + referencias[] (contrato M23)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'r1', nombres: 'Ana' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'ref1', origen_nombre: 'Cliente X' }] });
    const res = mkRes();
    await obtenerReferenciador(mkReq({ params: { id: 'r1' } } as never), res);
    expect(res.body).toMatchObject({
      success: true,
      data: { id: 'r1', nombres: 'Ana', referencias: [{ id: 'ref1' }] },
    });
  });
});

describe('crearReferenciador', () => {
  it('400 sin nombres o apellido_paterno', async () => {
    const res = mkRes();
    await crearReferenciador(mkReq({ body: { nombres: '  ' } } as never), res);
    expect(res.statusCode).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('400 si el inversionista ligado (forma 2) no existe', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const res = mkRes();
    await crearReferenciador(mkReq({
      body: { nombres: 'Ana', apellido_paterno: 'Ruiz', inversionista_id: 'abc' },
    } as never), res);
    expect(res.statusCode).toBe(400);
  });

  it('201 forma 3: inserta con correo en minúsculas y campos opcionales null', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'nuevo' }] });
    const res = mkRes();
    await crearReferenciador(mkReq({
      body: { nombres: ' Ana ', apellido_paterno: 'Ruiz', correo: ' ANA@X.COM ' },
    } as never), res);
    expect(res.statusCode).toBe(201);
    const valores = mockQuery.mock.calls[0][1];
    expect(valores[0]).toBe('Ana');
    expect(valores[4]).toBe('ana@x.com');
    expect(valores[9]).toBeNull(); // inversionista_id → forma 3
  });
});

describe('editarReferenciador', () => {
  it('404 si no existe', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const res = mkRes();
    await editarReferenciador(mkReq({ params: { id: 'nope' }, body: {} } as never), res);
    expect(res.statusCode).toBe(404);
  });

  it('la baja es activo=false (P6), nunca un DELETE', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'r1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'r1', activo: false }] });
    const res = mkRes();
    await editarReferenciador(mkReq({
      params: { id: 'r1' }, body: { activo: false },
    } as never), res);

    const sql = mockQuery.mock.calls[1][0] as string;
    expect(sql).toContain('UPDATE referenciadores');
    expect(sql).not.toContain('DELETE');
    expect(mockQuery.mock.calls[1][1][10]).toBe(false); // $11 = activo
    expect(res.body).toMatchObject({ success: true });
  });
});
