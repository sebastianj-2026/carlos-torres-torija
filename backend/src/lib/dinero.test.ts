import { describe, it, expect } from 'vitest';
import { sumaMontos, restaMontos, restaPiso0, comparaMontos, esCero } from './dinero';

describe('lib/dinero (deuda 5)', () => {
  it('suma exacta donde float falla', () => {
    expect(sumaMontos(['0.10', '0.20'])).toBe('0.30'); // 0.1+0.2 !== 0.3 en float
    expect(sumaMontos(['1000000.01', '0.02', null, undefined])).toBe('1000000.03');
  });
  it('resta y piso cero', () => {
    expect(restaMontos('100.00', '0.30')).toBe('99.70');
    expect(restaMontos('5.00', '7.50')).toBe('-2.50');
    expect(restaPiso0('5.00', '7.50')).toBe('0.00');
    expect(restaPiso0('7.50', '5.00')).toBe('2.50');
  });
  it('comparación exacta al centavo', () => {
    expect(comparaMontos('0.30', sumaMontos(['0.10', '0.20']))).toBe(0);
    expect(comparaMontos('10.01', '10.00')).toBe(1);
    expect(comparaMontos('9.99', '10.00')).toBe(-1);
  });
  it('esCero', () => {
    expect(esCero('0.00')).toBe(true);
    expect(esCero('0.01')).toBe(false);
  });
});
