/**
 * M16 · Canonical money reading: strings in, exact integer cents inside,
 * strings out. No floats anywhere in new money code.
 */
import { describe, it, expect } from 'vitest';
import { aCentavos, deCentavos, montoPorTasa } from './dinero';

describe('dinero (M16)', () => {
  it('lee NUMERIC(12,2) como centavos exactos', () => {
    expect(aCentavos('250000.00')).toBe(25000000n);
    expect(aCentavos('0.01')).toBe(1n);
    expect(aCentavos('0.1')).toBe(10n);   // un decimal → 10 centavos
    expect(aCentavos('7')).toBe(700n);    // sin decimales
    expect(aCentavos(' 12.34 ')).toBe(1234n); // tolera espacios
  });

  it('escribe centavos como string 2 decimales', () => {
    expect(deCentavos(25000000n)).toBe('250000.00');
    expect(deCentavos(1n)).toBe('0.01');
    expect(deCentavos(0n)).toBe('0.00');
    expect(deCentavos(-1234n)).toBe('-12.34');
  });

  it('round-trip sin pérdida', () => {
    for (const s of ['0.00', '0.01', '916.67', '99999999.99']) {
      expect(deCentavos(aCentavos(s))).toBe(s);
    }
  });

  it('montoPorTasa: base × tasa / 100, half-up (R24)', () => {
    expect(deCentavos(montoPorTasa(aCentavos('250000.00'), aCentavos('2.50')))).toBe('6250.00');
    expect(deCentavos(montoPorTasa(aCentavos('33333.33'), aCentavos('2.75')))).toBe('916.67');
    expect(deCentavos(montoPorTasa(aCentavos('50.00'), aCentavos('0.01')))).toBe('0.01');
    expect(deCentavos(montoPorTasa(aCentavos('20.00'), aCentavos('0.01')))).toBe('0.00');
  });

  it('rechaza formatos que no son dinero', () => {
    for (const s of ['', 'abc', '1.2.3', '12,34', '1e5', 'NaN']) {
      expect(() => aCentavos(s)).toThrow();
    }
  });
});
