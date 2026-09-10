/**
 * M13 · Monthly accrual cut (corte): builds `rendimiento` accrual candidates
 * for active investments. Pure core — no DB, no dates, no side effects.
 * Rules: R11 (accrues even if unpaid), R18 (base/tasa frozen at generation),
 * R21 (the cut never pays), R24 (2-decimal half-up rounding).
 * Commission accruals (referrer, living base per R3) arrive in M14.
 * Money: exact integer cents via BigInt — strings in, strings out (no floats).
 */

export interface InversionFuente {
  id: string;
  inversionista_id: string;
  monto_actual: string;          // NUMERIC(12,2) as string
  tasa_interes_mensual: string;  // NUMERIC(5,2) as string, 2.50 = 2.5%
  estatus: string;
}

export interface DevengoCandidato {
  inversionista_id: string;
  concepto: 'rendimiento';
  origen_tipo: 'inversion';
  origen_id: string;
  periodo_mes: number;
  periodo_anio: number;
  base_capital: string;
  tasa: string;
  monto_devengado: string;
}

/** "250000.00" → 25000000n (cents). Accepts up to 2 decimals. */
const aCentavos = (s: string): bigint => {
  const [entero, dec = ''] = s.trim().split('.');
  return BigInt(entero) * 100n + BigInt((dec + '00').slice(0, 2));
};

/** 25000000n → "250000.00" */
const deCentavos = (c: bigint): string => {
  const abs = c < 0n ? -c : c;
  const signo = c < 0n ? '-' : '';
  return `${signo}${abs / 100n}.${(abs % 100n).toString().padStart(2, '0')}`;
};

/**
 * monto = base × tasa / 100, half-up to the cent (R24).
 * baseCents × tasaCents needs /10000 (both carry ×100); half-up adds 5000.
 */
const montoDevengado = (baseCents: bigint, tasaCents: bigint): bigint =>
  (baseCents * tasaCents + 5000n) / 10000n;

export function devengosRendimiento(
  inversiones: InversionFuente[],
  mes: number,
  anio: number,
): DevengoCandidato[] {
  return [...inversiones]
    .filter((i) => i.estatus === 'activo')
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .flatMap((i) => {
      const monto = montoDevengado(aCentavos(i.monto_actual), aCentavos(i.tasa_interes_mensual));
      if (monto <= 0n) return []; // C4: a $0.00 accrual is not debt
      return [{
        inversionista_id: i.inversionista_id,
        concepto: 'rendimiento' as const,
        origen_tipo: 'inversion' as const,
        origen_id: i.id,
        periodo_mes: mes,
        periodo_anio: anio,
        base_capital: deCentavos(aCentavos(i.monto_actual)), // frozen, normalized (R18)
        tasa: deCentavos(aCentavos(i.tasa_interes_mensual)),
        monto_devengado: deCentavos(monto),
      }];
    });
}
