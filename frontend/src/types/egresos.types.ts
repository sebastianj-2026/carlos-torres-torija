export type TipoFrecuencia    = 'fijo' | 'variable' | 'mixto';
export type MonedaEgreso      = 'MXN' | 'USD';
export type EstatusCP         = 'borrador' | 'por_aprobar' | 'programado' | 'pagado' | 'vencido';
export type TipoDeuda         = 'hipotecario' | 'tarjeta' | 'linea_credito' | 'prestamo_simple' | 'otro';
export type TipoTasaCredito   = 'Fija' | 'Variable';
export type EsquemaPagoCredito = 'Pagos Fijos' | 'Pagos Decrecientes' | 'Solo Intereses';

export interface CategoriaEgreso {
  id: string;
  nombre: string;
  tipo_frecuencia: TipoFrecuencia;
  color: string;
  modulo: string;
  activo: boolean;
}

export interface ProveedorBeneficiario {
  id: string;
  nombre_razon_social: string;
  rfc: string | null;
  banco: string | null;
  clabe: string | null;
  moneda_defecto: MonedaEgreso;
  activo: boolean;
  fecha_registro: string;
}

export interface DeudaBancaria {
  id: string;
  tipo: TipoDeuda;
  institucion: string;
  alias_ubicacion: string | null;
  numero_referencia: string | null;
  saldo_inicial: string;
  saldo_actual: string;
  tasa_anual: string;
  tasa_mensual: string;
  cuota_mensual_total: string | null;
  fecha_vencimiento_final: string | null;
  moneda: MonedaEgreso;
  porcentaje_pagado: string;
  activo: boolean;
  notas: string | null;
}

export interface CuentaPorPagar {
  id: string;
  proveedor_id: string | null;
  categoria_id: string;
  deuda_id: string | null;
  concepto: string;
  monto_total: string;
  moneda: MonedaEgreso;
  tipo_cambio: string;
  monto_capital: string;
  monto_interes: string;
  monto_iva: string;
  fecha_limite_pago: string;
  fecha_pago_real: string | null;
  estatus: EstatusCP;
  centro_costo: string;
  url_factura_pdf: string | null;
  url_factura_xml: string | null;
  url_comprobante_pago: string | null;
  notas: string | null;
  inmueble_id: string | null;
  // serie + cuotas
  serie_id:        string | null;
  num_cuota:       number;
  total_cuotas:    number;
  // joins
  proveedor_nombre: string | null;
  categoria_nombre: string;
  categoria_color:  string;
  deuda_institucion: string | null;
  imm_es_renta_externa: boolean | null;
  imm_total_locales: number | null;
  imm_propietario_nombre: string | null;
  imm_comision_pct: string | null;
}

export interface PaginacionCuentas {
  cuentas: CuentaPorPagar[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

export interface StatsEgresos {
  gasto_por_categoria: { categoria: string; color: string; total: string }[];
  gasto_por_proveedor: { proveedor: string; total: string }[];
  compromisos_proximos30: { total: string; cantidad: string };
  gasto_mensual: { mes: string; total: string }[];
}

export interface AlertasEgresos {
  vencidas: CuentaPorPagar[];
  hoy: CuentaPorPagar[];
  maniana: CuentaPorPagar[];
  proximas: CuentaPorPagar[];
  total: number;
}

export interface CreditoBancario {
  id: string;
  banco: string;
  alias_credito: string | null;
  monto_original: string;
  saldo_actual: string;
  tipo_tasa: TipoTasaCredito;
  esquema_pago: EsquemaPagoCredito;
  cuota_base_mensual: string | null;
  dia_corte: number | null;
  tasa_anual: string | null;
  fecha_fin: string | null;
  fecha_inicio: string | null;
  concepto: string | null;
  activo: boolean;
  porcentaje_pagado: string;
  fecha_registro: string;
}
