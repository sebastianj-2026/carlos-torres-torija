export type EstatusEmpleado = 'Activo' | 'Inactivo' | 'Vacaciones';
export type TipoHoraExtra   = 'Normal' | 'Doble' | 'Triple';

export interface Empleado {
  id: string;
  nombre: string;
  puesto: string;
  sueldo_semanal: string;
  estatus: EstatusEmpleado;
  dias_vacaciones_totales: number;
  dias_vacaciones_tomados: number;
  activo_imss: boolean;
  monto_imss: string;
  cliente_id: string | null;
  cliente_nombre: string | null;
  prestamo_folio: string | null;
  prestamo_saldo: string | null;
  fecha_ingreso: string | null;
  notas: string | null;
  fecha_registro: string;
  fecha_actualizacion: string;
}

export interface PrestamoActivo {
  id: string;
  folio: string;
  saldo_pendiente: string;
  tasa_interes_mensual: string;
  interes_mensual: string;
}

export interface PreCalculo {
  empleado: {
    id: string;
    nombre: string;
    puesto: string;
    sueldo_semanal: number;
    estatus: EstatusEmpleado;
    dias_vacaciones_totales: number;
    dias_vacaciones_tomados: number;
    dias_disponibles: number;
    activo_imss: boolean;
    monto_imss: number;
    cliente_id: string | null;
    cliente_nombre: string | null;
  };
  calculo: {
    sueldo_base: number;
    prima_vacacional: number;
    dias_vacaciones: number;
    tarifas_hora_extra: { Normal: number; Doble: number; Triple: number };
  };
  prestamo_activo: PrestamoActivo | null;
}

export interface NominaPagada {
  id: string;
  empleado_id: string;
  empleado_nombre: string;
  puesto: string;
  semana_inicio: string;
  semana_fin: string;
  sueldo_base: string;
  horas_extras_cantidad: string;
  tipo_hora_extra: TipoHoraExtra | null;
  monto_horas_extras: string;
  dias_vacaciones_periodo: number;
  monto_prima_vacacional: string;
  bonos: string;
  faltas_cantidad: string;
  monto_faltas: string;
  ajuste_monto: string;
  ajuste_concepto: string | null;
  descuento_prestamo: string;
  monto_total_pagado: string;
  forma_pago: string;
  notas: string | null;
  fecha_pago: string;
  fecha_registro: string;
}

export interface CostoRealResponse {
  periodo: { mes: number; anio: number };
  totales: {
    total_sueldos: number;
    total_extras: number;
    total_bonos: number;
    total_primas: number;
    total_faltas: number;
    total_pagado: number;
    registros: number;
    empleados_distintos: number;
  };
  imss: {
    empleados_con_imss: number;
    total_imss: number;
  };
  por_semana: { semana_inicio: string; total: number; num_empleados: number }[];
  costo_real: number;
}
