/**
 * T-002 · Monthly distribution engine (reparto mensual).
 * Rules: REGLAS.md R1 (referrer % over capital), R2 (office pays from its margin),
 * R8 (moratorios out of scope), R23 (office owns the rounding residual / red).
 */

export interface RepartoInput {
  cobrado: number;
  capitalInversion: number;
  tasaInversion: number; // monthly, decimal (e.g. 0.02)
  capitalReferido: number;
  tasaReferenciador: number; // monthly, decimal (e.g. 0.005)
}

export interface RepartoOutput {
  inversionista: number;
  referenciador: number;
  oficina: number;
}

/** Safe 2-decimal rounding for MXN money, guarded against float drift. */
function round2(x: number): number {
  return Math.round((x + Number.EPSILON) * 100) / 100;
}

export function repartoMensual(input: RepartoInput): RepartoOutput {
  // Accrued yield/commission keep their own base (capital), independent of cobrado (R1, R3).
  const inversionista = round2(input.capitalInversion * input.tasaInversion);
  const referenciador = round2(input.capitalReferido * input.tasaReferenciador);

  // Office is the residual: keeps the spare cent and absorbs the red (R23/R22).
  // Rounding cobrado first guarantees the hard invariant sums to the cent.
  const oficina = round2(round2(input.cobrado) - inversionista - referenciador);

  return { inversionista, referenciador, oficina };
}
