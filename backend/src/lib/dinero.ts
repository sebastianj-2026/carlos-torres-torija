/**
 * Shared exact-money helpers for controllers (deuda #5).
 * Wraps the motor's canonical cents math (BigInt) for the common legacy
 * patterns: accumulate, subtract balances, compare — WITHOUT floats.
 *
 * Scope note: rate formulas (interés = base × tasa / 100, nómina) are NOT
 * migrated here on purpose — swapping toFixed() for half-up changes charged
 * cents and needs per-formula sign-off. See docs/ESTADO.md › deuda 5.
 */
import { aCentavos, deCentavos } from '../modules/motor/dinero';

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
