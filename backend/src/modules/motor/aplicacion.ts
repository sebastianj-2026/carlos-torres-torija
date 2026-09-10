/**
 * M15 · FIFO payment application over ONE line (beneficiary+concept+origin).
 * Rules: R12/R15 (forced FIFO, oldest period first), R16 (money never crosses
 * lines — mixed slots are rejected by design, not by caller discipline),
 * R22 (leftover goes back to the office's hands, the engine never re-routes it).
 * Pure function, exact integer cents (BigInt). Persisting the payment with
 * receipt and authorization (R19) belongs to M17/M19.
 */

export interface DevengoSlot {
  id: string;
  concepto: 'rendimiento' | 'comision';
  origen_tipo: 'inversion' | 'prestamo';
  origen_id: string;
  periodo_mes: number;
  periodo_anio: number;
  monto_devengado: string; // NUMERIC(12,2) as string
  monto_pagado: string;
}

export interface AplicacionDevengo {
  devengo_id: string;
  monto: string;
  estado_resultante: 'parcial' | 'pagado';
}

export interface ResultadoAplicacion {
  aplicaciones: AplicacionDevengo[];
  sobrante: string;
}

import { aCentavos, deCentavos } from './dinero';

export function aplicarPagoFifo(slots: DevengoSlot[], monto: string): ResultadoAplicacion {
  // R16 hard guard: every slot must belong to the same line.
  const lineas = new Set(slots.map((s) => `${s.concepto}|${s.origen_tipo}|${s.origen_id}`));
  if (lineas.size > 1) {
    throw new Error(
      'Todos los devengos deben ser de la misma línea (concepto + origen). ' +
      'El dinero de un origen no cubre lo de otro (R16).',
    );
  }

  // R15: forced FIFO — oldest period first.
  const ordenados = [...slots].sort((a, b) =>
    a.periodo_anio - b.periodo_anio || a.periodo_mes - b.periodo_mes);

  const aplicaciones: AplicacionDevengo[] = [];
  let restante = aCentavos(monto);

  for (const s of ordenados) {
    if (restante <= 0n) break;
    const devengado = aCentavos(s.monto_devengado);
    const pagado = aCentavos(s.monto_pagado);
    const pendiente = devengado - pagado;
    if (pendiente <= 0n) continue; // C17: already settled

    const aplicado = pendiente < restante ? pendiente : restante;
    aplicaciones.push({
      devengo_id: s.id,
      monto: deCentavos(aplicado),
      estado_resultante: pagado + aplicado >= devengado ? 'pagado' : 'parcial',
    });
    restante -= aplicado;
  }

  return { aplicaciones, sobrante: deCentavos(restante) };
}
