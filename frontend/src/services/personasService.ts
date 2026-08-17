import apiClient from './authService';
import { Persona, Aportacion, CrearAportacionInput } from '../types/persona.types';

// GET /api/personas?buscar=
export const listarPersonas = async (buscar?: string): Promise<Persona[]> => {
  const params = new URLSearchParams();
  if (buscar) params.set('buscar', buscar);
  const q = params.toString();
  const { data } = await apiClient.get<Persona[]>(`/personas${q ? `?${q}` : ''}`);
  return data;
};

// POST /api/personas/:id/documentos — sube un comprobante PDF (R19).
export const subirComprobante = async (personaId: number, file: File): Promise<{ id: number }> => {
  const fd = new FormData();
  fd.append('archivo', file);
  const { data } = await apiClient.post<{ id: number }>(`/personas/${personaId}/documentos`, fd);
  return data;
};

// POST /api/personas/:id/aportaciones
export const crearAportacion = async (
  personaId: number,
  input: CrearAportacionInput
): Promise<Aportacion> => {
  const { data } = await apiClient.post<Aportacion>(`/personas/${personaId}/aportaciones`, input);
  return data;
};
