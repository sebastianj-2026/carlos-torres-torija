/**
 * M16 · Canonical money handling for NEW code (devengos + payment application).
 * Convention: NUMERIC comes out of pg as string, stays string at the edges,
 * and is exact integer cents (BigInt) inside. No parseFloat, ever.
 * Legacy controllers are NOT refactored here (own ticket).
 */

const FORMATO = /^-?\d+(\.\d{1,2})?$/;

/** "250000.00" → 25000000n. Throws on anything that is not plain money. */
export const aCentavos = (s: string): bigint => {
  const limpio = s.trim();
  if (!FORMATO.test(limpio)) {
    throw new Error(`Monto inválido: "${s}" (se espera decimal con hasta 2 decimales)`);
  }
  const negativo = limpio.startsWith('-');
  const [entero, dec = ''] = (negativo ? limpio.slice(1) : limpio).split('.');
  const cents = BigInt(entero) * 100n + BigInt((dec + '00').slice(0, 2));
  return negativo ? -cents : cents;
};

/** 25000000n → "250000.00" */
export const deCentavos = (c: bigint): string => {
  const abs = c < 0n ? -c : c;
  return `${c < 0n ? '-' : ''}${abs / 100n}.${(abs % 100n).toString().padStart(2, '0')}`;
};

/**
 * monto = base × tasa / 100, half-up to the cent (R24).
 * Both args carry ×100 (cents), so the product divides by 10000.
 */
export const montoPorTasa = (baseCents: bigint, tasaCents: bigint): bigint =>
  (baseCents * tasaCents + 5000n) / 10000n;
