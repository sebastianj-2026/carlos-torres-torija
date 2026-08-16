/**
 * T-001/T-003 · FIFO de aplicación de pagos — casos resueltos como tests.
 * Fuente: docs/modulos/comisiones/CASOS-RESUELTOS.md + REGLAS.md.
 * T-003 pone verdes estos tests implementando ./fifo.
 */
import { describe, it, expect } from 'vitest';
import { aplicarPago, type Slot } from './fifo';

describe('FIFO de aplicación de pagos', () => {
  it('Caso 4 · 20,000 sobre 2 meses → m1 completo, m2 inv 7,500, ref 0 (R21)', () => {
    // Orden R21: dentro del mes, inversionista antes que referenciador;
    // entre meses, FIFO periodo ascendente.
    const slots: Slot[] = [
      { id: 'm1-inv', periodo: '2026-01-01', concepto: 'rendimiento', montoDevengado: 10_000, montoPagado: 0 },
      { id: 'm1-ref', periodo: '2026-01-01', concepto: 'comision', montoDevengado: 2_500, montoPagado: 0 },
      { id: 'm2-inv', periodo: '2026-02-01', concepto: 'rendimiento', montoDevengado: 10_000, montoPagado: 0 },
      { id: 'm2-ref', periodo: '2026-02-01', concepto: 'comision', montoDevengado: 2_500, montoPagado: 0 },
    ];
    const aplicado = aplicarPago(slots, 20_000);
    const byId = Object.fromEntries(aplicado.map((a) => [a.slotId, a.monto]));
    expect(byId['m1-inv']).toBe(10_000);
    expect(byId['m1-ref']).toBe(2_500);
    expect(byId['m2-inv']).toBe(7_500);
    expect(byId['m2-ref'] ?? 0).toBe(0);
    expect(aplicado.reduce((s, a) => s + a.monto, 0)).toBe(20_000); // no sobrepaga
  });

  it('Caso 8 · FIFO por origen (R16): el pago de Ana no toca la línea de Beto', () => {
    // El motor opera sobre la línea ya filtrada por origen. Solo se pasan los
    // slots de Ana; los de Beto no entran → quedan intactos.
    const lineaAna: Slot[] = [
      { id: 'ana-m1', periodo: '2026-01-01', concepto: 'comision', montoDevengado: 2_500, montoPagado: 0 },
      { id: 'ana-m2', periodo: '2026-02-01', concepto: 'comision', montoDevengado: 2_500, montoPagado: 0 },
    ];
    const aplicado = aplicarPago(lineaAna, 5_000); // pago del crédito de Ana
    const total = aplicado.reduce((s, a) => s + a.monto, 0);
    expect(total).toBe(5_000); // ambos meses de Ana cubiertos
    expect(aplicado.every((a) => a.slotId.startsWith('ana-'))).toBe(true);
  });

  it('invariante 4 · no aplica a un periodo nuevo si hay uno viejo pendiente', () => {
    const slots: Slot[] = [
      { id: 'viejo', periodo: '2026-01-01', concepto: 'rendimiento', montoDevengado: 10_000, montoPagado: 0 },
      { id: 'nuevo', periodo: '2026-02-01', concepto: 'rendimiento', montoDevengado: 10_000, montoPagado: 0 },
    ];
    const aplicado = aplicarPago(slots, 5_000);
    const byId = Object.fromEntries(aplicado.map((a) => [a.slotId, a.monto]));
    expect(byId['viejo']).toBe(5_000);
    expect(byId['nuevo'] ?? 0).toBe(0);
  });

  it('invariante 6 · ningún slot recibe más de lo devengado', () => {
    const slots: Slot[] = [
      { id: 'a', periodo: '2026-01-01', concepto: 'rendimiento', montoDevengado: 3_000, montoPagado: 0 },
    ];
    const aplicado = aplicarPago(slots, 999_999);
    expect(aplicado[0].monto).toBeLessThanOrEqual(3_000);
  });
});
