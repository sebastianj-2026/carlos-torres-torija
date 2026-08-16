/**
 * T-001 · Casos resueltos de comisiones como tests (fase RED de TDD).
 *
 * Fuente de verdad: docs/modulos/comisiones/CASOS-RESUELTOS.md + REGLAS.md.
 * Estos tests DEBEN fallar hasta que existan los motores (T-002 reparto,
 * T-003 fifo). Fallar aquí es el resultado correcto de esta tarea.
 *
 * Supuestos base (CASOS-RESUELTOS.md):
 *   Crédito $500,000 @ 4% mensual · Inversionista $500,000 @ 2.0% ·
 *   Referenciador 0.5% · Moratorios 100% oficina.
 */
import { describe, it, expect } from 'vitest';

// Motores todavía inexistentes — el import rompe a propósito (RED).
import { repartoMensual } from './reparto';
import { aplicarPago, type Slot } from './fifo';

const BASE = {
  capitalInversion: 500_000,
  tasaInversion: 0.02, // mensual
  capitalReferido: 500_000,
  tasaReferenciador: 0.005, // mensual
};

describe('reparto mensual (T-002 lo pondrá verde)', () => {
  it('Caso 1 · mes normal → inv 10,000 · ref 2,500 · oficina 7,500 (= 20,000)', () => {
    const r = repartoMensual({ ...BASE, cobrado: 20_000 });
    expect(r.inversionista).toBe(10_000);
    expect(r.referenciador).toBe(2_500);
    expect(r.oficina).toBe(7_500);
  });

  it('Caso 2 · cliente amortiza, cobrado 16,000 → oficina baja a 3,500', () => {
    // La amortización baja el interés cobrado (16,000), pero el inversionista
    // y el referenciador conservan su base (500k). Oficina = 16,000-10,000-2,500.
    const r = repartoMensual({ ...BASE, cobrado: 16_000 });
    expect(r.inversionista).toBe(10_000);
    expect(r.referenciador).toBe(2_500);
    expect(r.oficina).toBe(3_500);
  });

  it('Caso 3 · mora total, cobrado 0 → devengado 12,500 (inv+ref)', () => {
    const r = repartoMensual({ ...BASE, cobrado: 0 });
    expect(r.inversionista).toBe(10_000);
    expect(r.referenciador).toBe(2_500);
    expect(r.inversionista + r.referenciador).toBe(12_500); // devengado
    expect(r.oficina).toBe(-12_500); // margen del mes, sin cobrar nada
  });

  it('Caso 6 · oficina en rojo -4,500 → NO se fuerza a cero (mejora 6)', () => {
    // Input derivado del resultado documentado: -4,500 = cobrado - 12,500
    // ⇒ cobrado = 8,000.
    const r = repartoMensual({ ...BASE, cobrado: 8_000 });
    expect(r.oficina).toBe(-4_500);
    expect(r.oficina).toBeLessThan(0);
  });
});

describe('invariante 1 · inv + ref + oficina === cobrado, al centavo', () => {
  // Vale para CUALQUIER entrada (CASOS-RESUELTOS.md § Invariantes).
  const cobrados = [0, 8_000, 16_000, 20_000, 12_345.67, 999_999.99];
  for (const cobrado of cobrados) {
    it(`suma cierra para cobrado=${cobrado}`, () => {
      const r = repartoMensual({ ...BASE, cobrado });
      expect(r.inversionista + r.referenciador + r.oficina).toBeCloseTo(cobrado, 2);
    });
  }
});

describe('FIFO de aplicación de pagos (T-003 lo pondrá verde)', () => {
  it('Caso 4 · 20,000 sobre 2 meses → m1 completo, m2 inv 7,500, ref 0 (R21)', () => {
    // Línea con 2 meses de devengo completo. Orden R21: dentro del mes,
    // inversionista antes que referenciador; entre meses, FIFO periodo asc.
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
    // No sobrepaga
    expect(aplicado.reduce((s, a) => s + a.monto, 0)).toBe(20_000);
  });

  it('Caso 8 · FIFO por origen (R16): el pago de Ana no toca la línea de Beto', () => {
    // El motor opera sobre la línea ya filtrada por origen. Solo se pasan los
    // slots de la aportación de Ana; los de Beto no entran → quedan intactos.
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
