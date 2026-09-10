// ================================================================
// PrestaFácil — Módulo de Inversionistas
// Tipos e interfaces para el frontend
// ================================================================

export type EstatusInversion = 'activo' | 'pausado' | 'liquidado' | 'vencido';

export type FormaIngreso = 'efectivo' | 'deposito';

export type TipoMovimiento = 'pago_interes' | 'aporte_capital' | 'retiro_capital';

export type TipoMovimientoWallet = 'entrada' | 'salida' | 'uso_oficina';

// ----------------------------------------------------------------
// Inversionista (con campos de wallet)
// ----------------------------------------------------------------
export interface Inversionista {
  id: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  telefono: string | null;
  correo: string | null;
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
  capital_aportado_total: string;
  capital_disponible: string;
  total_invertido: string;
  inversiones_activas: string;
  pago_mensual: string;
  dias_pago: string | null;
}

// ----------------------------------------------------------------
// Inversión
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
  referenciador_id: string | null;
  tasa_referenciador: string | null;
  registrado_por: string | null;
  fecha_registro: string;
  fecha_actualizacion: string;
}

// ----------------------------------------------------------------
// Historial de movimientos de inversiones
// ----------------------------------------------------------------
export interface HistorialMovimiento {
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
export interface MovimientoWallet {
  id: string;
  inversionista_id: string;
  tipo: TipoMovimientoWallet;
  monto: string;
  concepto: string | null;
  prestamo_id: string | null;
  prestamo_folio: string | null;
  registrado_por: string | null;
  fecha_movimiento: string;
}

// ----------------------------------------------------------------
// Perfil completo del inversionista
// ----------------------------------------------------------------
export interface PerfilInversionista extends Inversionista {
  inversiones: Inversion[];
}

// ----------------------------------------------------------------
// Paginación de la lista
// ----------------------------------------------------------------
export interface PaginacionInversionistas {
  inversionistas: InversionistaResumen[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

// ----------------------------------------------------------------
// Filtros de búsqueda
// ----------------------------------------------------------------
export interface FiltrosInversionistas {
  buscar: string;
  orden: string;
  pagina: number;
  limite: number;
}

// ----------------------------------------------------------------
// DTOs para formularios
// ----------------------------------------------------------------
export interface FormularioInversionistaData {
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  telefono: string;
  correo: string;
  url_ine: string;
  // Solo creación: capital inicial
  monto_aportado_inicial: string;
  fecha_aportacion: string;
}

export interface FormularioInversionData {
  monto_inicial: string;
  tasa_interes_mensual: string;
  dia_pago: string;
  forma_ingreso: FormaIngreso | '';
  cuenta_deposito: string;
  tiene_pagare: boolean;
  url_pagare: string;
  fecha_inicio: string;
  fecha_vencimiento: string;
  notas: string;
  referenciador_id?: string;
  tasa_referenciador?: string;
}

export interface FormularioPagoInteresData {
  monto: string;
  forma_pago: FormaIngreso | '';
  periodo_mes: string;
  periodo_anio: string;
  notas: string;
}

export interface FormularioAgregarFondosData {
  monto: string;
  forma_pago: FormaIngreso | '';
  notas: string;
}

export interface FormularioTransferirOficinaData {
  monto: string;
  concepto: string;
}

export interface StatsInversionistas {
  total_inversionistas: number;
  nuevos_este_mes: number;
  capital_total_manejado: number;
  intereses_pagados_total: number;
}
