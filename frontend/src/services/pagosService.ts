import apiClient from './authService';
import {
  PagoGlobal,
  RegistrarPagoPayload,
  RegistrarPagoResponse,
  DeudaActivaCliente,
} from '../types/pagos.types';

const base = '/pagos';

export const registrarPago = (payload: RegistrarPagoPayload): Promise<RegistrarPagoResponse> => {
  const fd = new FormData();
  fd.append('modulo_origen', payload.modulo_origen);
  fd.append('referencia_id', payload.referencia_id);
  if (payload.cliente_id) fd.append('cliente_id', payload.cliente_id);
  fd.append('monto_pagado', String(payload.monto_pagado));
  if (payload.notas)  fd.append('notas',  payload.notas);
  if (payload.recibo) fd.append('recibo', payload.recibo);
  return apiClient.post<RegistrarPagoResponse>(`${base}/registrar`, fd).then(r => r.data);
};

export const historialPorCliente = (clienteId: string): Promise<PagoGlobal[]> =>
  apiClient.get<PagoGlobal[]>(`${base}/cliente/${clienteId}`).then(r => r.data);

export const deudaActivaCliente = (clienteId: string): Promise<DeudaActivaCliente> =>
  apiClient.get<DeudaActivaCliente>(`${base}/deuda-activa/${clienteId}`).then(r => r.data);
