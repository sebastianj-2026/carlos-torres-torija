export type EstatusInmueble = 'disponible' | 'rentado' | 'en_mantenimiento' | 'vendido';
export type EstatusContrato = 'activo' | 'vencido' | 'terminado';
export type EstatusCobro    = 'pendiente' | 'cobrado' | 'vencido' | 'cancelado';

export interface Inmueble {
  id: string;
  ubicacion_direccion: string;
  ciudad: string;
  estado: string;
  valor_propiedad: string | null;
  estatus: EstatusInmueble;
  foto_principal_url: string | null;
  predial_cuenta: string | null;
  predial_mes_pago: number | null;
  es_renta_externa: boolean;
  propietario_nombre: string | null;
  total_locales: number | null;
  fecha_registro: string;
  fecha_actualizacion: string;
  renta_actual: string | null;
  inquilino_actual: string | null;
}

export interface Inquilino {
  id: string;
  nombres: string;
  apellidos: string;
  telefono: string | null;
  aval_nombre: string | null;
  aval_propiedad_garantia: string | null;
  url_doc_aval: string | null;
  fecha_registro: string;
  // Joined from contrato activo + inmueble
  contrato_id: string | null;
  monto_renta_mensual: string | number | null;
  saldo_pendiente: string | number | null;
  url_contrato_pdf: string | null;
  url_pagare_pdf: string | null;
  url_id_inquilino: string | null;
  inmueble_direccion: string | null;
  inmueble_ciudad: string | null;
  es_renta_externa: boolean | null;
  total_locales: number | null;
  comision_oficina_pct: string | number | null;
}

export interface DepositoItem {
  item: string;
  estado: 'bueno' | 'regular' | 'malo' | 'na';
  notas: string;
}

export interface DetalleServicio {
  tipo: string;
  cuenta: string | null;
  dia_pago: number;
  frecuencia: 'mensual' | 'bimestral';
}

export interface ContratoArrendamiento {
  id: string;
  inmueble_id: string;
  inquilino_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  monto_renta_mensual: string;
  dia_corte_pago: number;
  url_contrato_pdf: string | null;
  url_pagare_pdf: string | null;
  url_llaves_entrega: string | null;
  url_inventario_pdf: string | null;
  url_id_inquilino: string | null;
  incluye_servicios: boolean;
  detalles_servicios: DetalleServicio[] | null;
  comision_oficina_pct: string | null;
  num_local: number | null;
  monto_deposito: string | null;
  deposito_items: DepositoItem[] | null;
  url_deposito: string | null;
  estatus: EstatusContrato;
  notas: string | null;
  ubicacion_direccion?: string;
  ciudad?: string;
  inquilino_nombre?: string;
  dias_para_vencer?: number;
}

export interface CuentaPorCobrar {
  id: string;
  inmueble_id: string | null;
  contrato_id: string | null;
  concepto: string;
  monto: string;
  periodo_mes: number;
  periodo_anio: number;
  fecha_limite_cobro: string;
  fecha_cobro_real: string | null;
  estatus: EstatusCobro;
  forma_cobro: string | null;
  notas: string | null;
  ubicacion_direccion?: string;
}

export interface ROIData {
  inmueble: Inmueble;
  total_cobrado: number;
  total_pagado: number;
  utilidad: number;
  cobros_por_mes: { periodo: string; monto: number }[];
  pagos_por_mes:  { periodo: string; monto: number }[];
}

export interface AlertasContratos {
  contratos: ContratoArrendamiento[];
  total: number;
}
