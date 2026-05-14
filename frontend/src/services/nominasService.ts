import apiClient from './authService';
import { Empleado, EstatusEmpleado, PreCalculo, NominaPagada, CostoRealResponse } from '../types/nominas.types';

const base = '/nominas';

export const listarEmpleados = () =>
  apiClient.get<Empleado[]>(`${base}/empleados`).then(r => r.data);

export const crearEmpleado = (d: Partial<Empleado>) =>
  apiClient.post<Empleado>(`${base}/empleados`, d).then(r => r.data);

export interface EmpleadoUpdate {
  nombre?: string;
  puesto?: string;
  sueldo_semanal?: number;
  estatus?: EstatusEmpleado;
  dias_vacaciones_totales?: number;
  dias_vacaciones_tomados?: number;
  activo_imss?: boolean;
  monto_imss?: number;
  cliente_id?: string | null;
  fecha_ingreso?: string | null;
  notas?: string | null;
}

export const editarEmpleado = (id: string, d: EmpleadoUpdate) =>
  apiClient.put<Empleado>(`${base}/empleados/${id}`, d).then(r => r.data);

export const getPreCalculo = (empleado_id: string, dias_vacaciones = 0) =>
  apiClient.get<PreCalculo>(`${base}/pre-calculo`, { params: { empleado_id, dias_vacaciones } }).then(r => r.data);

export const pagarNomina = (d: {
  empleado_id: string;
  semana_inicio: string;
  semana_fin: string;
  horas_extras_cantidad?: number;
  tipo_hora_extra?: string;
  monto_horas_extras?: number;
  dias_vacaciones_periodo?: number;
  monto_prima_vacacional?: number;
  bonos?: number;
  faltas_cantidad?: number;
  monto_faltas?: number;
  ajuste_monto?: number;
  ajuste_concepto?: string;
  descuento_prestamo?: number;
  forma_pago?: string;
  notas?: string;
}) => apiClient.post<{ nomina: NominaPagada; desglose: Record<string, number> }>(`${base}/pagar`, d).then(r => r.data);

export const historialNominas = (empleado_id?: string, limite = 200) => {
  const params: Record<string, string> = { limite: String(limite) };
  if (empleado_id) params.empleado_id = empleado_id;
  return apiClient.get<NominaPagada[]>(`${base}/historial`, { params }).then(r => r.data);
};

export const getCostoReal = (mes: number, anio: number) =>
  apiClient.get<CostoRealResponse>(`${base}/costo-real`, { params: { mes, anio } }).then(r => r.data);

export const pagarBase = (d: {
  empleado_id: string;
  semana_inicio: string;
  semana_fin: string;
  descuento_prestamo?: number;
  forma_pago?: string;
  notas?: string;
}) => apiClient.post<{ nomina: NominaPagada; desglose: Record<string, number> }>(`${base}/pagar-base`, d).then(r => r.data);

export const logIncidencias = (id: string) =>
  apiClient.get<NominaPagada[]>(`${base}/empleado/${id}/log`).then(r => r.data);
