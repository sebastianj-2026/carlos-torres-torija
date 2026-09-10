/**
 * M13 · Resolved cases for the monthly accrual cut (corte).
 * Source of truth: docs/modulos/comisiones-motor/CASOS-RESUELTOS.md (C1–C6).
 * C7 (DB idempotency) is an integration case verified against the DB.
 */
import { describe, it, expect } from 'vitest';
import {
  devengosRendimiento, devengosComision,
  InversionFuente, ReferenciaFuente,
} from './corte';

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

const ref = (over: Partial<ReferenciaFuente> = {}): ReferenciaFuente => ({
  id: 'ref-1',
  referenciador_id: 'rdor-1',
  tipo_referido: 'inversion',
  origen_id: 'inv-1',
  tasa: '0.50',
  estado: 'activa',
  base_vigente: '250000.00',
  origen_estatus: 'activo',
  ...over,
});

describe('devengosComision (base viva, M14)', () => {
  it('C8: comisión sobre inversión referida', () => {
    const [d] = devengosComision([ref()], 9, 2026);
    expect(d).toEqual({
      referenciador_id: 'rdor-1',
      concepto: 'comision',
      origen_tipo: 'inversion',
      origen_id: 'inv-1',
      periodo_mes: 9,
      periodo_anio: 2026,
      base_capital: '250000.00',
      tasa: '0.50',
      monto_devengado: '1250.00',
    });
  });

  it('C9: comisión sobre préstamo referido (saldo_pendiente)', () => {
    const [d] = devengosComision([ref({
      tipo_referido: 'prestamo', origen_id: 'pre-1',
      base_vigente: '100000.00', tasa: '0.75',
    })], 9, 2026);
    expect(d.origen_tipo).toBe('prestamo');
    expect(d.base_capital).toBe('100000.00');
    expect(d.monto_devengado).toBe('750.00');
  });

  it('C10: base viva — usa el capital del momento del corte', () => {
    const [d] = devengosComision([ref({
      tipo_referido: 'prestamo', origen_id: 'pre-1',
      base_vigente: '80000.00', tasa: '0.75',
    })], 10, 2026);
    expect(d.monto_devengado).toBe('600.00');
  });

  it('C11: referencia terminada o cancelada no genera', () => {
    const out = devengosComision([
      ref({ id: 'a', estado: 'terminada' }),
      ref({ id: 'b', estado: 'cancelada' }),
    ], 9, 2026);
    expect(out).toHaveLength(0);
  });

  it('C12: el origen debe estar vivo', () => {
    const out = devengosComision([
      ref({ id: 'a', origen_id: 'i1', origen_estatus: 'activo' }),
      ref({ id: 'b', origen_id: 'i2', origen_estatus: 'pausado' }),
      ref({ id: 'c', origen_id: 'p1', tipo_referido: 'prestamo', origen_estatus: 'activo' }),
      ref({ id: 'd', origen_id: 'p2', tipo_referido: 'prestamo', origen_estatus: 'atrasado' }),
      ref({ id: 'e', origen_id: 'p3', tipo_referido: 'prestamo', origen_estatus: 'en_juicio' }),
      ref({ id: 'f', origen_id: 'p4', tipo_referido: 'prestamo', origen_estatus: 'liquidado' }),
      ref({ id: 'g', origen_id: 'p5', tipo_referido: 'prestamo', origen_estatus: 'cancelado' }),
    ], 9, 2026);
    expect(out.map((d) => d.origen_id)).toEqual(['i1', 'p1', 'p2', 'p3']);
  });

  it('C4 aplica igual: comisión que redondea a cero no se genera', () => {
    const out = devengosComision([ref({ base_vigente: '20.00', tasa: '0.01' })], 9, 2026);
    expect(out).toHaveLength(0);
  });
});
