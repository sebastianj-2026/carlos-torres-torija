/**
 * T-001/T-002 · Reparto mensual — casos resueltos como tests.
 * Fuente: docs/modulos/comisiones/CASOS-RESUELTOS.md + REGLAS.md.
 * T-002 pone verdes estos tests implementando ./reparto.
 */
import { describe, it, expect } from 'vitest';
import { repartoMensual } from './reparto';

const BASE = {
  capitalInversion: 500_000,
  tasaInversion: 0.02, // mensual
  capitalReferido: 500_000,
  tasaReferenciador: 0.005, // mensual
};

describe('reparto mensual', () => {
  it('Caso 1 · mes normal → inv 10,000 · ref 2,500 · oficina 7,500 (= 20,000)', () => {
    const r = repartoMensual({ ...BASE, cobrado: 20_000 });
    expect(r.inversionista).toBe(10_000);
    expect(r.referenciador).toBe(2_500);
    expect(r.oficina).toBe(7_500);
  });

  it('Caso 2 · cliente amortiza, cobrado 16,000 → oficina baja a 3,500', () => {
    // La amortización baja el interés cobrado (16,000), pero inversionista y
    // referenciador conservan su base (500k). Oficina = 16,000-10,000-2,500.
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
    expect(r.oficina).toBe(-12_500); // margen del mes sin cobrar nada
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
  const cobrados = [0, 8_000, 16_000, 20_000, 12_345.67, 999_999.99];
  for (const cobrado of cobrados) {
    it(`suma cierra para cobrado=${cobrado}`, () => {
      const r = repartoMensual({ ...BASE, cobrado });
      expect(r.inversionista + r.referenciador + r.oficina).toBeCloseTo(cobrado, 2);
    });
  }
});
