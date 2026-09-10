/**
 * M15 · Resolved cases for FIFO payment application per origin line.
 * Source of truth: docs/modulos/comisiones-motor/CASOS-RESUELTOS.md (C14–C19).
 */
import { describe, it, expect } from 'vitest';
import { aplicarPagoFifo, DevengoSlot } from './aplicacion';

const slot = (over: Partial<DevengoSlot> = {}): DevengoSlot => ({
  id: 'd-1',
  concepto: 'comision',
  origen_tipo: 'prestamo',
  origen_id: 'pre-A',
  periodo_mes: 7,
  periodo_anio: 2026,
  monto_devengado: '750.00',
  monto_pagado: '0.00',
  ...over,
});

describe('aplicarPagoFifo (M15)', () => {
  it('C14: FIFO dentro de la línea, lo más viejo primero', () => {
    const out = aplicarPagoFifo([
      slot({ id: 'sep', periodo_mes: 9 }),
      slot({ id: 'jul', periodo_mes: 7 }),
      slot({ id: 'ago', periodo_mes: 8 }),
    ], '1600.00');
    expect(out.aplicaciones).toEqual([
      { devengo_id: 'jul', monto: '750.00', estado_resultante: 'pagado' },
      { devengo_id: 'ago', monto: '750.00', estado_resultante: 'pagado' },
      { devengo_id: 'sep', monto: '100.00', estado_resultante: 'parcial' },
    ]);
    expect(out.sobrante).toBe('0.00');
  });

  it('C15: rechaza slots de líneas mezcladas (R16)', () => {
    expect(() => aplicarPagoFifo([
      slot({ id: 'a', origen_id: 'pre-A' }),
      slot({ id: 'b', origen_id: 'pre-B' }),
    ], '100.00')).toThrow(/misma línea/);
  });

  it('C15: pagar la línea A deja B intacta (por diseño, sólo A entra)', () => {
    const out = aplicarPagoFifo([slot({ id: 'a', origen_id: 'pre-A' })], '750.00');
    expect(out.aplicaciones).toEqual([
      { devengo_id: 'a', monto: '750.00', estado_resultante: 'pagado' },
    ]);
  });

  it('C16: no sobrepaga; el sobrante regresa', () => {
    const out = aplicarPagoFifo([
      slot({ id: 'x', monto_devengado: '500.00' }),
    ], '800.00');
    expect(out.aplicaciones).toEqual([
      { devengo_id: 'x', monto: '500.00', estado_resultante: 'pagado' },
    ]);
    expect(out.sobrante).toBe('300.00');
  });

  it('C17: slots ya pagados se saltan', () => {
    const out = aplicarPagoFifo([
      slot({ id: 'jul', periodo_mes: 7, monto_pagado: '750.00' }),
      slot({ id: 'ago', periodo_mes: 8 }),
    ], '200.00');
    expect(out.aplicaciones).toEqual([
      { devengo_id: 'ago', monto: '200.00', estado_resultante: 'parcial' },
    ]);
  });

  it('C18: pago parcial previo cuenta', () => {
    const out = aplicarPagoFifo([
      slot({ id: 'x', monto_pagado: '700.00' }),
    ], '100.00');
    expect(out.aplicaciones).toEqual([
      { devengo_id: 'x', monto: '50.00', estado_resultante: 'pagado' },
    ]);
    expect(out.sobrante).toBe('50.00');
  });

  it('C19: exactitud a centavo', () => {
    const out = aplicarPagoFifo([
      slot({ id: 'x', monto_devengado: '0.03' }),
    ], '0.01');
    expect(out.aplicaciones).toEqual([
      { devengo_id: 'x', monto: '0.01', estado_resultante: 'parcial' },
    ]);
    expect(out.sobrante).toBe('0.00');
  });

  it('cruce de años: diciembre antes que enero del siguiente', () => {
    const out = aplicarPagoFifo([
      slot({ id: 'ene27', periodo_mes: 1, periodo_anio: 2027 }),
      slot({ id: 'dic26', periodo_mes: 12, periodo_anio: 2026 }),
    ], '750.00');
    expect(out.aplicaciones[0].devengo_id).toBe('dic26');
  });
});
