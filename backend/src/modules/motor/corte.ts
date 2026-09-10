/**
 * M13 · Monthly accrual cut (corte): builds `rendimiento` accrual candidates
 * for active investments. Pure core — no DB, no dates, no side effects.
 * Rules: R11 (accrues even if unpaid), R18 (base/tasa frozen at generation),
 * R21 (the cut never pays), R24 (2-decimal half-up rounding).
 * Commission accruals (referrer, living base per R3) arrive in M14.
 * Money: exact integer cents via BigInt — strings in, strings out (no floats).
 */
import { aCentavos, deCentavos, montoPorTasa } from './dinero';

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

const montoDevengado = montoPorTasa;

export interface ReferenciaFuente {
  id: string;
  referenciador_id: string;
  tipo_referido: 'inversion' | 'prestamo';
  origen_id: string;
  tasa: string;            // referencias.tasa, NUMERIC(5,2) as string
  estado: string;          // referencias.estado
  base_vigente: string;    // inversiones.monto_actual | prestamos.saldo_pendiente
  origen_estatus: string;  // estatus of the origin row
}

export interface DevengoComisionCandidato {
  referenciador_id: string;
  concepto: 'comision';
  origen_tipo: 'inversion' | 'prestamo';
  origen_id: string;
  periodo_mes: number;
  periodo_anio: number;
  base_capital: string;
  tasa: string;
  monto_devengado: string;
}

// C12: the referral accrues while the origin contract is alive (R9, R11).
// Loans keep accruing when late or in court — unpaid debt accumulates (R11).
const origenVivo = (tipo: 'inversion' | 'prestamo', estatus: string): boolean =>
  tipo === 'inversion'
    ? estatus === 'activo'
    : estatus === 'activo' || estatus === 'atrasado' || estatus === 'en_juicio';

export function devengosComision(
  referencias: ReferenciaFuente[],
  mes: number,
  anio: number,
): DevengoComisionCandidato[] {
  return [...referencias]
    .filter((r) => r.estado === 'activa' && origenVivo(r.tipo_referido, r.origen_estatus))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .flatMap((r) => {
      const monto = montoDevengado(aCentavos(r.base_vigente), aCentavos(r.tasa));
      if (monto <= 0n) return []; // C4: a $0.00 accrual is not debt
      return [{
        referenciador_id: r.referenciador_id,
        concepto: 'comision' as const,
        origen_tipo: r.tipo_referido,
        origen_id: r.origen_id,
        periodo_mes: mes,
        periodo_anio: anio,
        base_capital: deCentavos(aCentavos(r.base_vigente)), // frozen (R18)
        tasa: deCentavos(aCentavos(r.tasa)),
        monto_devengado: deCentavos(monto),
      }];
    });
}

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
