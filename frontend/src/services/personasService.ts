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

// POST /api/personas/:id/aportaciones
export const crearAportacion = async (
  personaId: number,
  input: CrearAportacionInput
): Promise<Aportacion> => {
  const { data } = await apiClient.post<Aportacion>(`/personas/${personaId}/aportaciones`, input);
  return data;
};
