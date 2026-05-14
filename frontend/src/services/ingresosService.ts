import apiClient from './authService';
import {
  PendientesCxCResponse, PensionEstacionamiento, IngresoDirecto,
  MovimientoExtraPension, StatsIngresos, AlertasPensiones,
  DashboardCentralData, CxCPrestamosResponse, CxCInmueblesResponse,
  ProyeccionCxCResponse, GenerarMesResponse,
  CorteEstacionamiento, CorteCancha,
  RentasMensualResponse,
} from '../types/ingresos.types';

const base = '/ingresos';

export const pendientesCxC = (mes?: number, anio?: number) => {
  const params = new URLSearchParams();
  if (mes)  params.set('mes',  String(mes));
  if (anio) params.set('anio', String(anio));
  return apiClient.get<PendientesCxCResponse>(`${base}/pendientes?${params}`).then(r => r.data);
};

export const alertasPensiones = () =>
  apiClient.get<AlertasPensiones>(`${base}/alertas`).then(r => r.data);

export const statsIngresos = (semanas = 6) =>
  apiClient.get<StatsIngresos>(`${base}/stats?semanas=${semanas}`).then(r => r.data);

export const listarPensiones = () =>
  apiClient.get<PensionEstacionamiento[]>(`${base}/pensiones`).then(r => r.data);

export const crearPension = (d: Partial<PensionEstacionamiento>) =>
  apiClient.post<PensionEstacionamiento>(`${base}/pensiones`, d).then(r => r.data);

export const editarPension = (id: string, d: Partial<PensionEstacionamiento>) =>
  apiClient.put<PensionEstacionamiento>(`${base}/pensiones/${id}`, d).then(r => r.data);

export const listarMovimientosExtra = (pensionId: string) =>
  apiClient.get<MovimientoExtraPension[]>(`${base}/pensiones/${pensionId}/extras`).then(r => r.data);

export const crearMovimientoExtra = (pensionId: string, d: Partial<MovimientoExtraPension>) =>
  apiClient.post<MovimientoExtraPension>(`${base}/pensiones/${pensionId}/extras`, d).then(r => r.data);

export const listarIngresosDirectos = (params: Record<string, string> = {}) => {
  const qs = new URLSearchParams(params);
  return apiClient.get<IngresoDirecto[]>(`${base}/directos?${qs}`).then(r => r.data);
};

export const crearIngresoDirecto = (d: Partial<IngresoDirecto> & { cantidad_rentas?: number }) =>
  apiClient.post<IngresoDirecto>(`${base}/directos`, d).then(r => r.data);

export const editarIngresoDirecto = (id: string, d: Partial<IngresoDirecto>) =>
  apiClient.put<IngresoDirecto>(`${base}/directos/${id}`, d).then(r => r.data);

export const dashboardCentral = (mes: number, anio: number) =>
  apiClient.get<DashboardCentralData>(`${base}/dashboard-central?mes=${mes}&anio=${anio}`).then(r => r.data);

export const getCxCPrestamos = (mes?: number, anio?: number) => {
  const params = new URLSearchParams();
  if (mes)  params.set('mes',  String(mes));
  if (anio) params.set('anio', String(anio));
  return apiClient.get<CxCPrestamosResponse>(`${base}/cxc-prestamos?${params}`).then(r => r.data);
};

export const getProyeccionCxCPrestamos = (mes: number, anio: number) => {
  const params = new URLSearchParams({ mes: String(mes), anio: String(anio) });
  return apiClient.get<ProyeccionCxCResponse>(`${base}/cxc-prestamos/proyeccion?${params}`).then(r => r.data);
};

export const generarMesCxCPrestamos = (mes: number, anio: number) =>
  apiClient.post<GenerarMesResponse>(`${base}/cxc-prestamos/generar-mes`, { mes, anio }).then(r => r.data);

export const getCxCInmuebles = (mes?: number, anio?: number) => {
  const params = new URLSearchParams();
  if (mes)  params.set('mes',  String(mes));
  if (anio) params.set('anio', String(anio));
  return apiClient.get<CxCInmueblesResponse>(`${base}/cxc-inmuebles?${params}`).then(r => r.data);
};

export const cobrarPrestamo = (prestamoId: string, d: {
  interes_pagado: number;
  abono_capital?: number;
  forma_pago: string;
  periodo_mes: number;
  periodo_anio: number;
  notas?: string;
}) => apiClient.post<{ recibo: Record<string, unknown> }>(`/cobros/${prestamoId}/registrar`, d).then(r => r.data);

export const listarCortesCancha = () =>
  apiClient.get<CorteCancha[]>(`${base}/cancha`).then(r => r.data);

export const crearCorteCancha = (d: {
  fecha_operacion: string;
  horas_rentadas: number;
  monto_real_recibido: number;
  encargado?: string;
  notas?: string;
}) => apiClient.post<CorteCancha>(`${base}/cancha/corte`, d).then(r => r.data);

export const listarCortesEstacionamiento = () =>
  apiClient.get<CorteEstacionamiento[]>(`${base}/estacionamiento`).then(r => r.data);

export const crearCorteEstacionamiento = (d: {
  fecha_operacion: string;
  ingreso_coches: number;
  ingreso_banos: number;
  ingreso_tiendita: number;
  notas?: string;
}) => apiClient.post<CorteEstacionamiento>(`${base}/estacionamiento/corte`, d).then(r => r.data);

export const cobrarInmueble = (contratoId: string, d: {
  mes: number;
  anio: number;
  monto_renta: number;
  monto_mantenimiento?: number;
  forma_cobro?: string;
  notas?: string;
}) => apiClient.post<{ mensaje: string; total: number }>(`${base}/cxc-inmuebles/${contratoId}/cobrar`, d).then(r => r.data);

export const getRentasMensual = (mes?: number, anio?: number) => {
  const p = new URLSearchParams();
  if (mes)  p.set('mes',  String(mes));
  if (anio) p.set('anio', String(anio));
  return apiClient.get<RentasMensualResponse>(`${base}/rentas/mensual?${p}`).then(r => r.data);
};

export const registrarPagoRenta = (d: {
  contrato_id: string;
  mes_correspondiente: number;
  anio_correspondiente: number;
  monto_pagado: number;
  fecha_pago?: string;
  metodo_pago?: string;
  cuenta_destino?: string;
  comprobante_url?: string;
  comentarios?: string;
}) => apiClient.post<{ mensaje: string; pago: unknown }>(`${base}/rentas/registrar-pago`, d).then(r => r.data);
