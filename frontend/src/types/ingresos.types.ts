export type EstatusPension  = 'activa' | 'vencida' | 'cancelada';
export type UnidadNegocio   =
  | 'estacionamiento_coches'
  | 'estacionamiento_banos'
  | 'estacionamiento_tiendita'
  | 'cancha_futbol'
  | 'ingreso_atipico';
export type MetodoPago = 'efectivo' | 'transferencia' | 'tarjeta';

export interface PensionEstacionamiento {
  id: string;
  cliente_nombre: string;
  vehiculo_placas: string | null;
  vehiculo_color: string | null;
  monto_mensual: string;
  fecha_inicio: string;
  fecha_fin: string;
  url_comprobante_pago: string | null;
  estatus: EstatusPension;
  notas: string | null;
  fecha_registro: string;
  dias_para_vencer?: number;
}

export interface IngresoDirecto {
  id: string;
  unidad_negocio: UnidadNegocio;
  monto_ingresado: string;
  semana_corte: string;
  metodo_pago: MetodoPago;
  cuenta_destino: string | null;
  persona_nombre: string | null;
  notas_explicativas: string | null;
  url_comprobante: string | null;
  fecha_registro: string;
  cantidad_rentas?: number | null;
}

export interface MovimientoExtraPension {
  id: string;
  pension_id: string;
  monto: string;
  concepto_extra: string;
  fecha: string;
}

export interface PendienteCxC {
  tipo: 'prestamo' | 'renta' | 'pension';
  id: string;
  descripcion: string;
  monto_pendiente: number;
  fecha_limite?: string;
  dia_limite?: number;
  dias_para_vencer?: number;
  estatus: string;
  // enriched for payment modal
  cliente_id?: string;
  contrato_id?: string | null;
  saldo_referencia?: number;
}

export interface PendientesCxCResponse {
  prestamos: PendienteCxC[];
  rentas:    PendienteCxC[];
  pensiones: PendienteCxC[];
  totales: {
    prestamos:  number;
    rentas:     number;
    pensiones:  number;
    gran_total: number;
  };
  periodo: { mes: number; anio: number };
}

export interface StatsIngresos {
  por_semana: { semana: string; unidad_negocio: string; total: string; registros: number }[];
  por_unidad: { unidad_negocio: string; total: string; registros: number }[];
  por_metodo: { metodo_pago: string; total: string }[];
}

export interface AlertasPensiones {
  pensiones: PensionEstacionamiento[];
  total: number;
}

export interface ModuloEstado {
  count_total:      number;
  count_pagados:    number;
  count_pendientes: number;
  count_atrasados:  number;
  monto_esperado:   number;
  monto_cobrado:    number;
  monto_pendiente:  number;
  monto_atrasado:   number;
}

export interface LogPago {
  id:          string;
  origen:      string;
  fecha:       string;
  descripcion: string;
  monto:       number;
  capital:     number;
  metodo_pago: string;
}

export interface DashboardCentralData {
  periodo: { mes: number; anio: number };
  cobrado: {
    total:           number;
    utilidad:        number;
    retorno_capital: number;
    por_origen: { origen: string; utilidad: number; capital: number; total: number }[];
  };
  estado_mes: {
    prestamos:             ModuloEstado;
    rentas:                ModuloEstado;
    pensiones:             ModuloEstado;
    gran_total_esperado:   number;
    gran_total_cobrado:    number;
    gran_total_pendiente:  number;
    gran_total_atrasado:   number;
  };
  log_pagos: LogPago[];
  metodo_pago: {
    efectivo: { total: number; detalle: { origen: string; monto: number }[] };
    tarjeta:  { total: number; detalle: { cuenta: string; monto: number }[] };
  };
  vs_mes_anterior: {
    cobrado_actual:   number;
    cobrado_anterior: number;
    variacion_pct:    number;
    por_origen: { origen: string; actual: number; anterior: number; delta: number }[];
  };
  mejor_dia: {
    global:     { fecha: string; monto: number } | null;
    por_origen: { origen: string; fecha: string; monto: number }[];
  };
}

export interface CxCPrestamo {
  id: string;
  folio: string;
  cliente_id: string;
  cliente_nombre: string;
  monto_capital: number;
  monto_interes: number;
  dia_pago: number;
  tasa_interes_mensual: number;
  estatus: string;
  ya_cobrado_interes: number;
  ya_cobrado_capital: number;
  pendiente_interes: number;
  cobrado_completo: boolean;
}

export interface CxCPrestamosResponse {
  periodo: { mes: number; anio: number };
  prestamos: CxCPrestamo[];
  totales: {
    monto_interes_esperado: number;
    ya_cobrado: number;
    pendiente: number;
    cobrados_completos: number;
    total_prestamos: number;
  };
}

export type EstatusProyeccion = 'Cobrado' | 'Pendiente' | 'Por Generar';

export interface ProyeccionPrestamo {
  id: string;
  folio: string;
  cliente_id: string;
  cliente_nombre: string;
  capital_prestado: number;
  tasa_interes_mensual: number;
  monto_interes: number;
  dia_pago: number;
  estatus: string;
  ya_cobrado_interes: number;
  pendiente_interes: number;
  estatus_proyeccion: EstatusProyeccion;
  obligacion_id: string | null;
}

export interface ProyeccionCxCResponse {
  periodo: { mes: number; anio: number };
  prestamos: ProyeccionPrestamo[];
  totales: {
    total_esperado: number;
    total_cobrado: number;
    total_pendiente: number;
    por_generar: number;
    pendientes: number;
    cobrados: number;
    total_prestamos: number;
  };
}

export interface GenerarMesResponse {
  mensaje: string;
  creados: number;
  omitidos: number;
  total_prestamos: number;
  periodo: { mes: number; anio: number };
}

export interface CorteCancha {
  id: string;
  fecha_operacion: string;
  horas_rentadas: string;
  monto_esperado: string;
  monto_real_recibido: string;
  encargado: string;
  notas: string | null;
  fecha_registro: string;
}

export interface CorteEstacionamiento {
  id: string;
  fecha_operacion: string;
  ingreso_coches: string;
  ingreso_banos: string;
  ingreso_tiendita: string;
  monto_total: string;
  notas: string | null;
  fecha_registro: string;
}

export interface CxCInmueble {
  id: string;
  inquilino_id: string;
  inquilino_nombre: string;
  inmueble_id: string;
  inmueble_direccion: string;
  monto_renta: number;
  monto_mantenimiento: number;
  total_a_cobrar: number;
  dia_pago: number;
  estatus: string;
  ya_cobrado: number;
  pendiente: number;
  cobrado_completo: boolean;
}

export interface CxCInmueblesResponse {
  periodo: { mes: number; anio: number };
  inmuebles: CxCInmueble[];
  totales: {
    monto_esperado: number;
    ya_cobrado: number;
    pendiente: number;
    cobrados_completos: number;
    total_contratos: number;
  };
}

export interface RentaMensual {
  contrato_id: string;
  inmueble_id: string;
  ubicacion_direccion: string;
  ciudad: string;
  es_renta_externa: boolean;
  total_locales: number | null;
  comision_oficina_pct: number | null;
  inquilino_id: string;
  inquilino_nombre: string;
  telefono: string | null;
  dia_corte_pago: number;
  monto_pactado: number;
  pago_id: string | null;
  monto_pagado: number;
  pendiente: number;
  fecha_pago: string | null;
  metodo_pago: string | null;
  cuenta_destino: string | null;
  comprobante_url: string | null;
  estatus_pago: 'Pagado' | 'Parcial' | 'Pendiente';
  comentarios: string | null;
}

export interface RentasMensualResponse {
  periodo: { mes: number; anio: number };
  contratos: RentaMensual[];
  totales: {
    total_contratos: number;
    monto_esperado: number;
    monto_cobrado: number;
    pendiente: number;
    pagados_completos: number;
    parciales: number;
    pendientes: number;
  };
}
