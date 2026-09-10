import apiClient from './authService';

// ================================================================
// Cuentas por pagar de devengos (M17/M18/M19)
// Una LÍNEA = beneficiario + concepto + origen (R16). El pago cubre
// una línea completa o parcial; el periodo dentro de la línea es FIFO
// forzado del backend (R15). Montos SIEMPRE como string (M16).
// ================================================================

export interface DevengoPendiente {
  id: string;
  periodo_mes: number;
  periodo_anio: number;
  base_capital: string;
  tasa: string;
  monto_devengado: string;
  monto_pagado: string;
  pendiente: string;
  estado: 'pendiente' | 'parcial';
}

export interface LineaPendiente {
  beneficiario_tipo: 'inversionista' | 'referenciador';
  beneficiario_id: string;
  beneficiario_nombre: string;
  concepto: 'rendimiento' | 'comision';
  origen_tipo: 'inversion' | 'prestamo';
  origen_id: string;
  total_pendiente: string;
  devengos: DevengoPendiente[];
}

export interface DatosPago {
  inversionista_id?: string;
  referenciador_id?: string;
  concepto: string;
  origen_tipo: string;
  origen_id: string;
  monto: string;
  forma_pago: 'efectivo' | 'transferencia' | 'deposito';
  numero_cuenta?: string;
  banco?: string;
  url_comprobante: string;
  notas?: string;
}

interface Envelope<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export const listarPendientes = async (): Promise<LineaPendiente[]> => {
  const r = await apiClient.get<Envelope<{ lineas: LineaPendiente[] }>>(
    '/pagos-devengo/pendientes'
  );
  if (!r.data.success || !r.data.data) {
    throw new Error(r.data.error ?? 'No se pudieron cargar los pendientes.');
  }
  return r.data.data.lineas;
};

export const registrarPagoDevengo = async (datos: DatosPago): Promise<void> => {
  const r = await apiClient.post<Envelope<unknown>>('/pagos-devengo', datos);
  if (!r.data.success) {
    throw new Error(r.data.error ?? 'No se pudo registrar el pago.');
  }
};

// ---- dinero exacto en la UI: centavos enteros, cero float (M16) ----
export const aCentavos = (s: string): bigint => {
  const [e, dec = ''] = s.trim().split('.');
  return BigInt(e) * 100n + BigInt((dec + '00').slice(0, 2));
};

export const deCentavos = (c: bigint): string =>
  `${c / 100n}.${(c % 100n).toString().padStart(2, '0')}`;

export const formatearCentavos = (c: bigint): string => {
  const entero = (c / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `$${entero}.${(c % 100n).toString().padStart(2, '0')}`;
};
