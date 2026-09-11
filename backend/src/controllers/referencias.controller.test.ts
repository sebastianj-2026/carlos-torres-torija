/**
 * Unit tests for referencias.controller with a mocked pg pool.
 * Business rules covered: origin coherence (ref_origen_coherente), P3 via
 * UNIQUE→409, rate validation NUMERIC(5,2) (M26), server-side fecha_inicio,
 * M29 (⛔5=A): forward-only state transitions, rate frozen outside `activa`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('../config/database', () => ({
  default: { query: vi.fn(), connect: vi.fn() },
}));

import pool from '../config/database';
import { crearReferencia, editarReferencia } from './referencias.controller';

const mockQuery = pool.query as unknown as ReturnType<typeof vi.fn>;

const UUID_REF = '11111111-2222-4333-8444-555555555555';
const UUID_INV = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

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

beforeEach(() => { mockQuery.mockReset(); });

describe('crearReferencia — validación de entrada (M26)', () => {
  it('400 si el referenciador_id no es UUID (antes de tocar la DB)', async () => {
    const res = mkRes();
    await crearReferencia(mkReq({ body: { referenciador_id: 'no-uuid' } }), res);
    expect(res.statusCode).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('400 si una referencia de inversión trae prestamo_id (coherencia de origen)', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: UUID_REF }] });
    const res = mkRes();
    await crearReferencia(mkReq({
      body: {
        referenciador_id: UUID_REF, tipo_referido: 'inversion',
        inversion_id: UUID_INV, prestamo_id: UUID_INV,
      },
    }), res);
    expect(res.statusCode).toBe(400);
    expect((res.body as { error: string }).error).toMatch(/inversión/);
  });

  it.each(['0', '0.00', '-1', '1.234', '1000', 'abc', ''])(
    '400 con tasa inválida %j (NUMERIC(5,2), > 0)', async (tasa) => {
      mockQuery
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: UUID_REF }] })  // referenciador
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: UUID_INV }] }); // origen
      const res = mkRes();
      await crearReferencia(mkReq({
        body: { referenciador_id: UUID_REF, tipo_referido: 'inversion', inversion_id: UUID_INV, tasa },
      }), res);
      expect(res.statusCode).toBe(400);
      expect((res.body as { error: string }).error).toMatch(/tasa/i);
    });

  it('201: fecha_inicio la pone el servidor (CURRENT_DATE), tasa como string', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: UUID_REF }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: UUID_INV }] })
      .mockResolvedValueOnce({ rows: [{ id: 'ref-nueva' }] });
    const res = mkRes();
    await crearReferencia(mkReq({
      body: { referenciador_id: UUID_REF, tipo_referido: 'inversion', inversion_id: UUID_INV, tasa: '0.50' },
    }), res);

    expect(res.statusCode).toBe(201);
    const [sql, valores] = mockQuery.mock.calls[2];
    expect(sql).toContain('CURRENT_DATE');
    expect(valores).not.toContain(undefined);
    expect(valores[4]).toBe('0.50'); // string pass-through, sin float
  });

  it('409 en UNIQUE (P3: un referenciador por origen), con el origen en el mensaje', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: UUID_REF }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: UUID_INV }] })
      .mockRejectedValueOnce(Object.assign(new Error('dup'), {
        code: '23505', constraint: 'ref_unica_prestamo',
      }));
    const res = mkRes();
    await crearReferencia(mkReq({
      body: { referenciador_id: UUID_REF, tipo_referido: 'prestamo', prestamo_id: UUID_INV, tasa: '1.25' },
    }), res);
    expect(res.statusCode).toBe(409);
    expect((res.body as { error: string }).error).toMatch(/préstamo/);
  });
});

describe('editarReferencia — M29: estados solo hacia adelante', () => {
  it('400 al revivir una referencia cancelada', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: UUID_REF, estado: 'cancelada' }] });
    const res = mkRes();
    await editarReferencia(mkReq({ params: { id: UUID_REF }, body: { estado: 'activa' } }), res);
    expect(res.statusCode).toBe(400);
    expect((res.body as { error: string }).error).toMatch(/hacia adelante/);
  });

  it('400 al editar la tasa de una referencia terminada', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: UUID_REF, estado: 'terminada' }] });
    const res = mkRes();
    await editarReferencia(mkReq({ params: { id: UUID_REF }, body: { tasa: '2.00' } }), res);
    expect(res.statusCode).toBe(400);
    expect((res.body as { error: string }).error).toMatch(/tasa/);
  });

  it('200: activa → terminada sí procede', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: UUID_REF, estado: 'activa' }] })
      .mockResolvedValueOnce({ rows: [{ id: UUID_REF, estado: 'terminada' }] });
    const res = mkRes();
    await editarReferencia(mkReq({ params: { id: UUID_REF }, body: { estado: 'terminada' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ success: true, data: { estado: 'terminada' } });
  });

  it('400 con fecha_fin que no es fecha real (2026-02-30)', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: UUID_REF, estado: 'activa' }] });
    const res = mkRes();
    await editarReferencia(mkReq({ params: { id: UUID_REF }, body: { fecha_fin: '2026-02-30' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('el PATCH nunca mueve origen ni referenciador (R9)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: UUID_REF, estado: 'activa' }] })
      .mockResolvedValueOnce({ rows: [{ id: UUID_REF }] });
    await editarReferencia(mkReq({ params: { id: UUID_REF }, body: { notas: 'x' } }), mkRes());
    const sql = mockQuery.mock.calls[1][0] as string;
    expect(sql).not.toMatch(/referenciador_id|inversion_id|prestamo_id|tipo_referido/);
  });
});
