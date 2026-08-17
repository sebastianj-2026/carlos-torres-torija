/**
 * FIFO payment application engine for the comisiones module (T-003).
 * Rules: R11/R12/R13/R15/R16/R21 + invariants 4 & 6.
 * The caller filters slots by line (person+concept+origin) or by origin (R16);
 * this function only orders and applies the received money over those slots.
 */

export interface Slot {
  id: string;
  periodo: string; // ISO date 'YYYY-MM-DD', first day of the month
  concepto: 'rendimiento' | 'comision';
  montoDevengado: number;
  montoPagado: number; // already paid previously
}

export interface Aplicacion {
  slotId: string;
  monto: number;
}

/** Round money to 2 decimals (cents), float-safe. */
function round2(x: number): number {
  return Math.round((x + Number.EPSILON) * 100) / 100;
}

/**
 * Apply `monto` over `slots` using FIFO.
 * Order: ascending by periodo (R15); within a period, rendimiento before
 * comision (R21, investor first). Each slot gets min(pending, remaining),
 * never more than devengado (invariant 6). FIFO guarantees invariant 4.
 */
export function aplicarPago(slots: Slot[], monto: number): Aplicacion[] {
  const orden = { rendimiento: 0, comision: 1 } as const;

  // FIFO order: oldest period first, then investor (rendimiento) before commission.
  const ordenados = [...slots].sort((a, b) => {
    if (a.periodo !== b.periodo) return a.periodo < b.periodo ? -1 : 1;
    return orden[a.concepto] - orden[b.concepto];
  });

  const aplicaciones: Aplicacion[] = [];
  let restante = round2(monto);

  for (const slot of ordenados) {
    if (restante <= 0) break;
    const pendiente = round2(slot.montoDevengado - slot.montoPagado);
    if (pendiente <= 0) continue;

    const aplicado = round2(Math.min(pendiente, restante));
    if (aplicado > 0) {
      aplicaciones.push({ slotId: slot.id, monto: aplicado });
      restante = round2(restante - aplicado);
    }
  }

  return aplicaciones;
}
