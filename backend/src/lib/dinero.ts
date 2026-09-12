/**
 * Shared exact-money helpers for controllers (deuda #5).
 * Wraps the motor's canonical cents math (BigInt) for the common legacy
 * patterns: accumulate, subtract balances, compare — WITHOUT floats.
 *
 * Scope note: rate formulas (interés = base × tasa / 100, nómina) are NOT
 * migrated here on purpose — swapping toFixed() for half-up changes charged
 * cents and needs per-formula sign-off. See docs/ESTADO.md › deuda 5.
 */
import { aCentavos, deCentavos, montoPorTasa } from '../modules/motor/dinero';

export { aCentavos, deCentavos };

/** Sum NUMERIC strings exactly: sumaMontos(['0.10','0.20']) === '0.30' */
export const sumaMontos = (montos: Array<string | null | undefined>): string =>
  deCentavos(montos.reduce<bigint>((s, m) => s + (m ? aCentavos(String(m)) : 0n), 0n));

/** a − b, exact. restaMontos('100.00','0.30') === '99.70' */
export const restaMontos = (a: string, b: string): string =>
  deCentavos(aCentavos(a) - aCentavos(b));

/** max(0, a − b) — the "never negative balance" legacy pattern */
export const restaPiso0 = (a: string, b: string): string => {
  const r = aCentavos(a) - aCentavos(b);
  return deCentavos(r > 0n ? r : 0n);
};

/** -1 | 0 | 1, exact cent comparison (replaces parseFloat(a) > parseFloat(b)) */
export const comparaMontos = (a: string, b: string): number => {
  const d = aCentavos(a) - aCentavos(b);
  return d < 0n ? -1 : d > 0n ? 1 : 0;
};

export const esCero = (m: string): boolean => aCentavos(m) === 0n;

// ── M38 · half-up formulas (docs/DINERO.md D1/D2, cases C1-C5) ──────────────

/**
 * monto = base × tasa / 100, half-up to the cent (D1).
 * `tasa` is percent with up to 2 decimals ('1.75' = 1.75%). String in/out;
 * wraps the motor's montoPorTasa (R24) so legacy controllers share ONE math.
 */
export const porcentajeHalfUp = (base: string, tasa: string): string =>
  deCentavos(montoPorTasa(aCentavos(base), aCentavos(tasa)));

/**
 * monto × por / entre with a SINGLE half-up rounding at the end (D2).
 * For payroll shapes like (sueldo ÷ 6) × días × 0.25 → proporcion(sueldo, días×25, 600):
 * intermediates stay exact integers, the error never multiplies.
 */
export const proporcionHalfUp = (monto: string, por: number, entre: number): string => {
  if (!Number.isInteger(por) || !Number.isInteger(entre) || entre <= 0 || por < 0) {
    throw new Error(`Proporción inválida: ${por}/${entre} (enteros, divisor > 0)`);
  }
  const e = BigInt(entre);
  return deCentavos((aCentavos(monto) * BigInt(por) + e / 2n) / e);
};
