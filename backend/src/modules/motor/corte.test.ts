/**
 * M13 · Resolved cases for the monthly accrual cut (corte).
 * Source of truth: docs/modulos/comisiones-motor/CASOS-RESUELTOS.md (C1–C6).
 * C7 (DB idempotency) is an integration case verified against the DB.
 */
import { describe, it, expect } from 'vitest';
import { devengosRendimiento, InversionFuente } from './corte';

const inv = (over: Partial<InversionFuente> = {}): InversionFuente => ({
  id: 'inv-1',
  inversionista_id: 'per-1',
  monto_actual: '250000.00',
  tasa_interes_mensual: '2.50',
  estatus: 'activo',
  ...over,
});

describe('devengosRendimiento (corte mensual, M13)', () => {
  it('C1: devengo simple, base y tasa congeladas', () => {
    const [d] = devengosRendimiento([inv()], 9, 2026);
    expect(d).toEqual({
      inversionista_id: 'per-1',
      concepto: 'rendimiento',
      origen_tipo: 'inversion',
      origen_id: 'inv-1',
      periodo_mes: 9,
      periodo_anio: 2026,
      base_capital: '250000.00',
      tasa: '2.50',
      monto_devengado: '6250.00',
    });
  });

  it('C2: redondeo half-up a centavos (R24)', () => {
    const [d] = devengosRendimiento(
      [inv({ monto_actual: '33333.33', tasa_interes_mensual: '2.75' })], 9, 2026,
    );
    expect(d.monto_devengado).toBe('916.67');
  });

  it('C3: medio centavo exacto sube', () => {
    const [d] = devengosRendimiento(
      [inv({ monto_actual: '50.00', tasa_interes_mensual: '0.01' })], 9, 2026,
    );
    expect(d.monto_devengado).toBe('0.01');
  });

  it('C4: devengo que redondea a cero no se genera', () => {
    const out = devengosRendimiento(
      [inv({ monto_actual: '20.00', tasa_interes_mensual: '0.01' })], 9, 2026,
    );
    expect(out).toHaveLength(0);
  });

  it('C5: solo estatus activo genera', () => {
    const out = devengosRendimiento([
      inv({ id: 'a', estatus: 'activo' }),
      inv({ id: 'b', estatus: 'pausado' }),
      inv({ id: 'c', estatus: 'liquidado' }),
      inv({ id: 'd', estatus: 'vencido' }),
    ], 9, 2026);
    expect(out.map((d) => d.origen_id)).toEqual(['a']);
  });

  it('C6: determinista y ordenado por id de inversión', () => {
    const fuentes = [inv({ id: 'b' }), inv({ id: 'a' }), inv({ id: 'c' })];
    const una = devengosRendimiento(fuentes, 9, 2026);
    const dos = devengosRendimiento(fuentes, 9, 2026);
    expect(una).toEqual(dos);
    expect(una.map((d) => d.origen_id)).toEqual(['a', 'b', 'c']);
  });
});
