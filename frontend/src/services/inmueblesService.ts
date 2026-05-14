import apiClient from './authService';
import {
  Inmueble, Inquilino, ContratoArrendamiento, CuentaPorCobrar,
  ROIData, AlertasContratos, DetalleServicio,
} from '../types/inmuebles.types';

const base = '/inmuebles';

export const listarInmuebles = () =>
  apiClient.get<Inmueble[]>(base).then(r => r.data);

export const obtenerInmueble = (id: string) =>
  apiClient.get<Inmueble>(`${base}/${id}`).then(r => r.data);

export const crearInmueble = (d: Partial<Inmueble>) =>
  apiClient.post<Inmueble>(base, d).then(r => r.data);

export const editarInmueble = (id: string, d: Partial<Inmueble>) =>
  apiClient.put<Inmueble>(`${base}/${id}`, d).then(r => r.data);

export const listarInquilinos = () =>
  apiClient.get<Inquilino[]>(`${base}/inquilinos`).then(r => r.data);

export const crearInquilino = (d: Partial<Inquilino>) =>
  apiClient.post<Inquilino>(`${base}/inquilinos`, d).then(r => r.data);

export const editarInquilino = (id: string, d: Partial<Inquilino>) =>
  apiClient.put<Inquilino>(`${base}/inquilinos/${id}`, d).then(r => r.data);

export const listarContratos = () =>
  apiClient.get<ContratoArrendamiento[]>(`${base}/contratos`).then(r => r.data);

export const crearContrato = (d: Partial<ContratoArrendamiento> & { detalles_servicios?: DetalleServicio[] }) =>
  apiClient.post<ContratoArrendamiento>(`${base}/contratos`, d).then(r => r.data);

export const editarContrato = (id: string, d: Partial<ContratoArrendamiento> & { detalles_servicios?: DetalleServicio[] }) =>
  apiClient.put<ContratoArrendamiento>(`${base}/contratos/${id}`, d).then(r => r.data);

export const listarCobros = (params: Record<string, string | number> = {}) => {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  return apiClient.get<CuentaPorCobrar[]>(`${base}/cobros?${qs}`).then(r => r.data);
};

export const crearInquilinoCompleto = (d: Record<string, unknown>) =>
  apiClient.post<{ inquilino: Inquilino; contrato: ContratoArrendamiento }>(`${base}/inquilino-completo`, d).then(r => r.data);

export const marcarCobrado = (id: string, d: { forma_cobro?: string; notas?: string }) =>
  apiClient.patch<CuentaPorCobrar>(`${base}/cobros/${id}/cobrar`, d).then(r => r.data);

export const generarRentas = (mes: number, anio: number) =>
  apiClient.post<{ mensaje: string; creados: number }>(`${base}/generar-rentas`, { mes, anio }).then(r => r.data);

export const generarServicios = (mes: number, anio: number) =>
  apiClient.post<{ mensaje: string; creados: number }>(`${base}/generar-servicios`, { mes, anio }).then(r => r.data);

export const obtenerROI = (id: string) =>
  apiClient.get<ROIData>(`${base}/${id}/roi`).then(r => r.data);

export const alertasContratos = () =>
  apiClient.get<AlertasContratos>(`${base}/alertas`).then(r => r.data);
