import { describe, it, expect } from 'vitest';
import {
  sumaMontos, restaMontos, restaPiso0, comparaMontos, esCero,
  porcentajeHalfUp, proporcionHalfUp,
} from './dinero';

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

// M38 · docs/DINERO.md D1/D2, resolved cases C1-C5
describe('porcentajeHalfUp — base × tasa / 100 (D1)', () => {
  it('C1 normal: cierra exacto', () => {
    expect(porcentajeHalfUp('20000.00', '1.50')).toBe('300.00');
  });
  it('C2 borde: fracción de centavo sube', () => {
    // 10001 × 1.75% = 175.0175 → 175.02; toFixed podía dar 175.01
    expect(porcentajeHalfUp('10001.00', '1.75')).toBe('175.02');
  });
  it('C3 el que rompe: empate .005 sube (toFixed lo bajaba)', () => {
    // (1.005).toFixed(2) === "1.00" — el bug que motiva D1
    expect(porcentajeHalfUp('100.50', '1.00')).toBe('1.01');
  });
  it('redondea una sola vez, no acumula', () => {
    expect(porcentajeHalfUp('0.01', '0.50')).toBe('0.00');  // 0.00005 → abajo
    expect(porcentajeHalfUp('1.00', '0.50')).toBe('0.01');  // 0.005 → arriba
  });
  it('rechaza montos que no son dinero plano', () => {
    expect(() => porcentajeHalfUp('abc', '1.00')).toThrow();
    expect(() => porcentajeHalfUp('1.234', '1.00')).toThrow();
  });
});

describe('proporcionHalfUp — monto × por / entre en un solo redondeo (D2)', () => {
  it('C4 nómina: tarifa por hora sin redondeo intermedio', () => {
    // sueldo 100.20 ÷ 40 × 1 hora Normal = 2.505 → 2.51 (toFixed daba 2.50)
    expect(proporcionHalfUp('100.20', 1, 40)).toBe('2.51');
  });
  it('C5 nómina: prima de 3 días exacta de punta a punta', () => {
    // (1000 ÷ 6) × 3 días × 0.25 = 1000 × 75 / 600 = 125.00
    expect(proporcionHalfUp('1000.00', 75, 600)).toBe('125.00');
  });
  it('divisor cero truena, no da Infinity', () => {
    expect(() => proporcionHalfUp('100.00', 1, 0)).toThrow();
  });
});
