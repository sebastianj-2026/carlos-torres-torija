import apiClient from './authService';
import {
  ReferenciaOrigen,
  CrearReferenciaPayload,
  EditarReferenciaPayload,
} from '../types/referenciador.types';

// ================================================================
// Referencias — el vínculo referenciador ↔ inversión | préstamo.
// Backend nuevo: envelope { success, data, error }, errores en español.
// La tasa viaja SIEMPRE como string (porcentaje con 2 decimales); nunca se
// convierte a número aquí. fecha_inicio la pone el servidor: no se manda.
// ================================================================

interface Envelope<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

// Error normalizado: conserva el status HTTP y el mensaje del backend tal cual
// (400 validación, 403 rol, 409 origen ya ligado — P3).
export class ReferenciaError extends Error {
  status: number;
  constructor(status: number, mensaje: string) {
    super(mensaje);
    this.name = 'ReferenciaError';
    this.status = status;
  }
}

const normalizarError = (err: unknown, fallback: string): ReferenciaError => {
  if (err instanceof ReferenciaError) return err;
  const axiosError = err as { response?: { status?: number; data?: { error?: string; mensaje?: string } } };
  const status = axiosError?.response?.status ?? 0;
  const mensaje = axiosError?.response?.data?.error
    ?? axiosError?.response?.data?.mensaje
    ?? fallback;
  return new ReferenciaError(status, mensaje);
};

// ----------------------------------------------------------------
// Consultar la referencia de un origen (M46)
// GET /api/referencias?inversion_id= | ?prestamo_id=
// ----------------------------------------------------------------
const obtenerPorOrigen = async (parametro: 'inversion_id' | 'prestamo_id', id: string): Promise<ReferenciaOrigen | null> => {
  try {
    const params = new URLSearchParams({ [parametro]: id });
    const respuesta = await apiClient.get<Envelope<ReferenciaOrigen>>(`/referencias?${params.toString()}`);
    if (!respuesta.data.success) {
      throw new ReferenciaError(respuesta.status, respuesta.data.error ?? 'No se pudo consultar la referencia.');
    }
    return respuesta.data.data;
  } catch (err) {
    throw normalizarError(err, 'No se pudo consultar la referencia.');
  }
};

export const obtenerReferenciaPorInversion = (inversionId: string): Promise<ReferenciaOrigen | null> =>
  obtenerPorOrigen('inversion_id', inversionId);

export const obtenerReferenciaPorPrestamo = (prestamoId: string): Promise<ReferenciaOrigen | null> =>
  obtenerPorOrigen('prestamo_id', prestamoId);

// ----------------------------------------------------------------
// Ligar referenciador a un origen (solo administrador)
// POST /api/referencias
// ----------------------------------------------------------------
export const crearReferencia = async (payload: CrearReferenciaPayload): Promise<ReferenciaOrigen> => {
  try {
    const respuesta = await apiClient.post<Envelope<ReferenciaOrigen>>('/referencias', payload);
    if (!respuesta.data.success || !respuesta.data.data) {
      throw new ReferenciaError(respuesta.status, respuesta.data.error ?? 'No se pudo ligar el referenciador.');
    }
    return respuesta.data.data;
  } catch (err) {
    throw normalizarError(err, 'No se pudo ligar el referenciador.');
  }
};

// ----------------------------------------------------------------
// Editar referencia — estado / tasa / fecha_fin / notas (solo administrador)
// PATCH /api/referencias/:id
// ----------------------------------------------------------------
export const editarReferencia = async (id: string, cambios: EditarReferenciaPayload): Promise<ReferenciaOrigen> => {
  try {
    const respuesta = await apiClient.patch<Envelope<ReferenciaOrigen>>(`/referencias/${id}`, cambios);
    if (!respuesta.data.success || !respuesta.data.data) {
      throw new ReferenciaError(respuesta.status, respuesta.data.error ?? 'No se pudo actualizar la referencia.');
    }
    return respuesta.data.data;
  } catch (err) {
    throw normalizarError(err, 'No se pudo actualizar la referencia.');
  }
};
