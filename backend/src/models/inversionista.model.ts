// ================================================================
// OFICINA TS — Módulo de Inversionistas
// Interfaces TypeScript para las tablas de la base de datos
// ================================================================

export type AsignadoA = 'sebastian' | 'abril';

export type EstatusInversion = 'activo' | 'pausado' | 'liquidado' | 'vencido';

export type FormaIngreso = 'efectivo' | 'deposito';

export type TipoMovimiento = 'pago_interes' | 'aporte_capital' | 'retiro_capital';

export type TipoMovimientoWallet = 'entrada' | 'salida' | 'uso_oficina';

// ----------------------------------------------------------------
// Inversionista — datos personales + wallet
// ----------------------------------------------------------------
export interface Inversionista {
  id: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  telefono: string | null;
  correo: string | null;
  asignado_a: AsignadoA | null;
  url_ine: string | null;
  capital_aportado_total: string;
  capital_disponible: string;
  registrado_por: string | null;
  fecha_registro: string;
  fecha_actualizacion: string;
}

// Versión resumida para la tabla de lista
export interface InversionistaResumen {
  id: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  telefono: string | null;
  asignado_a: AsignadoA | null;
  capital_aportado_total: string;
  capital_disponible: string;
  // Calculados en el query
  total_invertido: string;        // NUMERIC → string en pg
  inversiones_activas: string;    // COUNT → string en pg
}

// ----------------------------------------------------------------
// Inversión — contrato de capital de un inversionista
// ----------------------------------------------------------------
export interface Inversion {
  id: string;
  inversionista_id: string;
  monto_inicial: string;
  monto_actual: string;
  tasa_interes_mensual: string;
  dia_pago: number | null;
  forma_ingreso: FormaIngreso | null;
  cuenta_deposito: string | null;
  tiene_pagare: boolean;
  url_pagare: string | null;
  estatus: EstatusInversion;
  fecha_inicio: string;
  fecha_vencimiento: string | null;
  notas: string | null;
  registrado_por: string | null;
  fecha_registro: string;
  fecha_actualizacion: string;
}

// ----------------------------------------------------------------
// Historial de movimientos de inversiones (interés / capital)
// ----------------------------------------------------------------
export interface HistorialInversion {
  id: string;
  inversion_id: string;
  tipo: TipoMovimiento;
  monto: string;
  forma_pago: FormaIngreso | null;
  periodo_mes: number | null;
  periodo_anio: number | null;
  notas: string | null;
  url_evidencia: string | null;
  registrado_por: string | null;
  fecha_movimiento: string;
}

// ----------------------------------------------------------------
// Movimiento de wallet (Bolsa de Capital)
// ----------------------------------------------------------------
export interface MovimientoInversionista {
  id: string;
  inversionista_id: string;
  tipo: TipoMovimientoWallet;
  monto: string;
  concepto: string | null;
  prestamo_id: string | null;
  registrado_por: string | null;
  fecha_movimiento: string;
}

// ----------------------------------------------------------------
// DTOs para creación y edición
// ----------------------------------------------------------------
export interface CrearInversionistaDto {
  nombres: string;
  apellido_paterno: string;
  apellido_materno?: string;
  telefono?: string;
  correo?: string;
  asignado_a?: AsignadoA;
  url_ine?: string;
  // Wallet: capital inicial al registrar
  monto_aportado_inicial?: number;
  fecha_aportacion?: string;
}

export type EditarInversionistaDto = Partial<Omit<CrearInversionistaDto, 'monto_aportado_inicial' | 'fecha_aportacion'>>;

export interface CrearInversionDto {
  monto_inicial: number;
  tasa_interes_mensual: number;
  dia_pago?: number;
  forma_ingreso?: FormaIngreso;
  cuenta_deposito?: string;
  tiene_pagare?: boolean;
  url_pagare?: string;
  fecha_inicio: string;
  fecha_vencimiento?: string;
  notas?: string;
}

export type EditarInversionDto = Partial<CrearInversionDto>;

export interface RegistrarMovimientoDto {
  tipo: TipoMovimiento;
  monto: number;
  forma_pago?: FormaIngreso;
  periodo_mes?: number;
  periodo_anio?: number;
  notas?: string;
  url_evidencia?: string;
}

export interface TransferirOficinaDto {
  monto: number;
  concepto?: string;
}

// ----------------------------------------------------------------
// Respuesta paginada para la lista de inversionistas
// ----------------------------------------------------------------
export interface PaginacionInversionistas {
  inversionistas: InversionistaResumen[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

// ----------------------------------------------------------------
// Perfil completo del inversionista con sus inversiones
// ----------------------------------------------------------------
export interface PerfilInversionistaCompleto extends Inversionista {
  inversiones: Inversion[];
}
